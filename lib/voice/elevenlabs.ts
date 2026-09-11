import type { VoiceOptions, VoiceProvider } from "./types";
// Only this same-origin endpoint is visible to the browser. Credentials and voice ID stay on the server.
export class ElevenLabsVoiceProvider implements VoiceProvider {
  private audio: HTMLAudioElement | null = null;
  private active: {
    controller: AbortController;
    settle: (error?: Error) => void;
  } | null = null;
  supported() {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }
  unlock() {
    if (!this.supported() || this.active) return;
    this.audio ??= new Audio();
    // A tiny silent WAV primes this reusable media element inside the Start click.
    this.audio.src =
      "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YQEAAACA";
    void this.audio
      .play()
      .then(() => {
        if (!this.active) this.audio?.pause();
      })
      .catch(() => {});
  }
  textToSpeech(text: string, options: VoiceOptions = {}): Promise<void> {
    this.cancel();
    if (!this.supported())
      return Promise.reject(new Error("Audio is unavailable in this browser."));
    this.audio ??= new Audio();
    const audio = this.audio;
    const controller = new AbortController();
    return new Promise((resolve, reject) => {
      let done = false;
      let objectUrl: string | undefined;
      let playing = false;
      let timer = setTimeout(
        () => settle(new Error("Voice could not start. Tap Hear again to retry.")),
        12000,
      );
      const settle = (error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        controller.abort();
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        if (this.active?.controller === controller) this.active = null;
        error ? reject(error) : resolve();
      };
      this.active = { controller, settle };
      void (async () => {
        try {
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ text, guardianAcknowledged: true }),
          });
          if (
            !response.ok ||
            !response.headers.get("content-type")?.startsWith("audio/")
          )
            throw new Error("Custom voice is unavailable.");
          const blob = await response.blob();
          if (done) return;
          if (!blob.size) throw new Error("Custom voice returned no audio.");
          objectUrl = URL.createObjectURL(blob);
          // The Start click may still be finishing its silent unlock clip.
          // Only listen to playback events once the actual lesson audio is ready.
          audio.src = objectUrl;
          audio.onplaying = () => {
            if (playing || done) return;
            playing = true;
            clearTimeout(timer);
            timer = setTimeout(() => settle(new Error("Voice playback paused.")), Math.max(15000, Math.min(60000, text.length * 150)));
            options.onStart?.();
          };
          audio.onended = () => { if (playing) settle(); };
          audio.onerror = () => settle(new Error("Custom audio could not play."));
          await audio.play();
        } catch (error) {
          if (!done)
            settle(
              error instanceof Error
                ? error
                : new Error("Custom voice could not play."),
            );
        }
      })();
    });
  }
  cancel() {
    this.active?.settle();
  }
}
