import { BrowserSpeechToText } from "./browser";
import type { SpeechInputSession, SpeechToTextService } from "./types";

export const SILENCE_MS = 3000;
// Both audio activity and incoming transcription extend the current turn.
export class SilenceGate {
  private lastActivity: number | null = null;
  activity(now: number) {
    this.lastActivity = now;
  }
  ready(now: number, text: string) {
    return (
      !!text.trim() &&
      this.lastActivity !== null &&
      now - this.lastActivity >= SILENCE_MS
    );
  }
}
export function handsFreeSupported() {
  return (
    typeof window !== "undefined" &&
    !!window.AudioContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    new BrowserSpeechToText().supported()
  );
}
export async function listenHandsFree(
  callbacks: {
    onText(text: string): void;
    onSpeaking(speaking: boolean): void;
    onComplete(text: string): void;
    onError(message: string): void;
  },
  signal: AbortSignal,
  input: SpeechToTextService = new BrowserSpeechToText(),
) {
  let stream: MediaStream | undefined;
  let context: AudioContext | undefined;
  let recognition: SpeechInputSession | null = null;
  let sampleTimer: ReturnType<typeof setInterval> | undefined;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  let finalizing = false;
  let committed = "";
  let segment = "";
  let lastLoud = -Infinity;
  let speaking = false;
  let noiseFloor = 0.003;
  const gate = new SilenceGate();
  const text = () =>
    [committed, segment].filter(Boolean).join(" ").trim().slice(0, 1800);
  const cleanup = () => {
    clearInterval(sampleTimer);
    clearTimeout(restartTimer);
    recognition?.cancel();
    recognition = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
    signal.removeEventListener("abort", cancel);
  };
  const cancel = () => {
    done = true;
    cleanup();
  };
  const fail = (message: string) => {
    if (done) return;
    done = true;
    cleanup();
    callbacks.onError(message);
  };
  const complete = () => {
    if (done) return;
    const answer = text();
    done = true;
    cleanup();
    if (answer) callbacks.onComplete(answer);
  };
  const startRecognition = () => {
    if (done || finalizing) return;
    try {
      recognition = input.speechToText({
        onText(value) {
          if (done) return;
          if (value !== segment) gate.activity(performance.now());
          segment = value;
          callbacks.onText(text());
        },
        onError(message, code) {
          // Browsers often end recognition during long silences. Keep waiting.
          if (code !== "no-speech") fail(message);
        },
        onEnd() {
          recognition = null;
          if (done) return;
          if (finalizing) {
            complete();
            return;
          }
          committed = text();
          segment = "";
          restartTimer = setTimeout(startRecognition, 200);
        },
      });
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "Could not start voice input. Try text mode.",
      );
    }
  };
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) {
    cancel();
    return;
  }
  try {
    if (!handsFreeSupported())
      throw new Error(
        "Hands-free voice is unavailable in this browser. Please use text mode.",
      );
    context = new AudioContext();
    // Resume while handling the initial activation, before microphone permission resolves.
    const resumed = context.resume().then(
      () => null,
      (error: unknown) => error,
    );
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (done) {
      cleanup();
      return;
    }
    const resumeError = await resumed;
    if (resumeError) throw resumeError;
    if (done) {
      cleanup();
      return;
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    startRecognition();
    if (done) return;
    sampleTimer = setInterval(() => {
      if (done || finalizing) return;
      if (context?.state !== "running") {
        fail("Microphone listening paused. Tap the microphone to resume.");
        return;
      }
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, sample) => sum + sample * sample, 0) /
          samples.length,
      );
      const now = performance.now();
      const loud = rms > Math.max(0.012, noiseFloor * 3);
      if (loud) {
        gate.activity(now);
        lastLoud = now;
      } else noiseFloor = noiseFloor * 0.95 + rms * 0.05;
      const active = now - lastLoud < 250;
      if (active !== speaking) {
        speaking = active;
        callbacks.onSpeaking(active);
      }
      if (gate.ready(now, text())) {
        finalizing = true;
        clearInterval(sampleTimer);
        clearTimeout(restartTimer);
        // Let recognition flush its final result before sending, exactly once.
        if (recognition) recognition.stop();
        else complete();
      }
    }, 50);
  } catch (error) {
    if (done) {
      cleanup();
      return;
    }
    const denied =
      error instanceof DOMException && error.name === "NotAllowedError";
    fail(
      denied
        ? "Microphone access was declined. Allow it in browser settings, or use text mode."
        : error instanceof Error
          ? error.message
          : "Voice input could not start. Try text mode.",
    );
  }
}
