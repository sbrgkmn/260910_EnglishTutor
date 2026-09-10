import type {
  SpeechInputSession,
  SpeechToTextService,
  TextToSpeechService,
} from "./types";
// Browser speech recognition isn't yet included in TypeScript's standard DOM types.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
function recognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const w = window as SpeechWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}
export class BrowserSpeechToText implements SpeechToTextService {
  supported() {
    return !!recognitionConstructor();
  }
  speechToText({
    onText,
    onEnd,
    onError,
  }: Parameters<SpeechToTextService["speechToText"]>[0]): SpeechInputSession {
    const Constructor = recognitionConstructor();
    if (!Constructor)
      throw new Error(
        "Speech input isn’t available in this browser. You can use text mode.",
      );
    const recognition = new Constructor();
    let settled = false;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    const detach = () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      clearTimeout(stopTimer);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      detach();
      onEnd();
    };
    recognition.onresult = (e) => {
      if (!settled)
        onText(
          Array.from(e.results)
            .map((r) => r[0].transcript)
            .join(" ")
            .trim(),
        );
    };
    recognition.onerror = (e) => {
      if (settled) return;
      const messages: Record<string, string> = {
        "not-allowed":
          "Microphone access was declined. Allow it in browser settings, or use text mode.",
        "service-not-allowed":
          "Speech recognition is unavailable here. Try another browser or text mode.",
        "audio-capture":
          "No microphone was found. Connect one or use text mode.",
        network:
          "Speech recognition could not connect. Try again or use text mode.",
        "no-speech":
          "No speech was detected. Tap the microphone to try again, or type your answer.",
      };
      if (e.error !== "aborted")
        onError(
          messages[e.error] ||
            "Speech input stopped. Your words are kept; you can edit them or try again.",
          e.error,
        );
      finish();
    };
    recognition.onend = finish;
    try {
      recognition.start();
    } catch {
      detach();
      throw new Error(
        "The microphone could not start. Try again or use text mode.",
      );
    }
    return {
      stop() {
        if (settled) return;
        try {
          stopTimer = setTimeout(() => {
            recognition.abort();
            finish();
          }, 4000);
          recognition.stop();
        } catch {
          finish();
        }
      },
      cancel() {
        if (settled) return;
        settled = true;
        detach();
        recognition.abort();
      },
    };
  }
}
export class BrowserTextToSpeech implements TextToSpeechService {
  private current: {
    utterance: SpeechSynthesisUtterance;
    settle: (error?: Error) => void;
  } | null = null;
  supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }
  textToSpeech(text: string, options: { rate?: number } = {}): Promise<void> {
    this.cancel();
    if (!this.supported())
      return Promise.reject(
        new Error(
          "Audio playback isn’t supported here. You can read the tutor’s reply.",
        ),
      );
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = options.rate ?? 0.9;
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang === "en-US" && v.localService) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (voice) utterance.voice = voice;
      let done = false;
      const timer = setTimeout(
        () => {
          settle(new Error("Audio playback paused. Tap Hear again to retry."));
          window.speechSynthesis.cancel();
        },
        Math.max(15000, Math.min(90000, text.length * 130)),
      );
      const settle = (error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        utterance.onend = null;
        utterance.onerror = null;
        this.current = null;
        if (error) reject(error);
        else resolve();
      };
      utterance.onend = () => settle();
      utterance.onerror = (e) =>
        settle(
          e.error === "canceled" || e.error === "interrupted"
            ? undefined
            : new Error(
                "Audio could not play. Tap Hear again, or read the reply.",
              ),
        );
      this.current = { utterance, settle };
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        settle(new Error("Audio could not play. You can read the reply."));
      }
    });
  }
  cancel() {
    if (this.current) {
      this.current.settle();
      if (this.supported()) window.speechSynthesis.cancel();
    }
  }
}
