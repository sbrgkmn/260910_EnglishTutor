import { BrowserSpeechToText } from "./browser";
import { sharedAudioContext } from "./audio-context";
import type { SpeechInputSession, SpeechToTextService } from "./types";

export const SILENCE_MS = 3000;
export type MicrophoneStatus = "idle" | "starting" | "listening" | "reconnecting";
export type MicrophoneDiagnostic = { event: string; detail?: string };
export class SilenceGate {
  private lastActivity: number | null = null;
  activity(now: number) { this.lastActivity = now; }
  ready(now: number, text: string) {
    return !!text.trim() && this.lastActivity !== null && now - this.lastActivity >= SILENCE_MS;
  }
}
export function handsFreeSupported() {
  return typeof window !== "undefined" &&
    !!(window.AudioContext || (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext) &&
    !!navigator.mediaDevices?.getUserMedia && new BrowserSpeechToText().supported();
}
export async function listenHandsFree(
  callbacks: {
    onText(text: string): void;
    onSpeaking(speaking: boolean): void;
    onComplete(text: string): void;
    onError(message: string): void;
    onStatus?(status: MicrophoneStatus): void;
    onLevel?(level: number): void;
    onDiagnostic?(event: MicrophoneDiagnostic): void;
  },
  signal: AbortSignal,
  input: SpeechToTextService = new BrowserSpeechToText(),
) {
  let stream: MediaStream | undefined;
  let context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  let recognition: SpeechInputSession | null = null;
  let sampleTimer: ReturnType<typeof setInterval> | undefined;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  let finalizing = false;
  let epoch = 0;
  let retries = 0;
  let committed = "";
  let segment = "";
  let lastLoud = -Infinity;
  let lastResult = performance.now();
  let startedAt = lastResult;
  let loudMs = 0;
  let speaking = false;
  let resuming = false;
  let noiseFloor = 0.003;
  let lastMeter = 0;
  let mutedSince: number | null = null;
  const gate = new SilenceGate();
  const text = () => [committed, segment].filter(Boolean).join(" ").trim().slice(0, 1000);
  const diagnostic = (event: string, detail?: string) => callbacks.onDiagnostic?.({ event, detail });
  const cleanup = () => {
    epoch++;
    clearInterval(sampleTimer);
    clearTimeout(restartTimer);
    clearTimeout(startTimer);
    clearTimeout(finishTimer);
    recognition?.cancel();
    recognition = null;
    source?.disconnect?.();
    analyser?.disconnect?.();
    source = undefined;
    analyser = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
    callbacks.onStatus?.("idle");
    callbacks.onLevel?.(0);
    callbacks.onSpeaking(false);
    signal.removeEventListener("abort", cancel);
  };
  const cancel = () => {
    if (done) return;
    done = true;
    diagnostic("cancelled");
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
    diagnostic("answer-ready");
    cleanup();
    if (answer) callbacks.onComplete(answer);
  };
  // AudioContext.resume() can remain pending indefinitely on an interrupted iPhone.
  const bounded = <T>(work: Promise<T>, ms: number, message: string) => new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(message)), ms);
    const abort = () => finish(new Error("cancelled"));
    const finish = (error?: Error, value?: T) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve(value as T);
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    work.then((value) => finish(undefined, value), (error) => finish(error));
  });
  const restart = (reason: string, counted = true, delay = 500) => {
    if (done || finalizing || restartTimer) return;
    diagnostic("recognition-restart", reason);
    if (counted && ++retries > 2) {
      fail("The microphone stopped sending words. Tap Speak to reconnect, or finish your answer by typing.");
      return;
    }
    epoch++;
    clearTimeout(startTimer);
    recognition?.cancel();
    recognition = null;
    committed = text();
    segment = "";
    loudMs = 0;
    callbacks.onStatus?.("reconnecting");
    restartTimer = setTimeout(() => {
      restartTimer = undefined;
      startRecognition();
    }, delay);
  };
  const startRecognition = () => {
    if (done || finalizing) return;
    const current = ++epoch;
    startedAt = lastResult = performance.now();
    diagnostic("recognition-starting");
    const ready = () => {
      if (done || current !== epoch) return;
      clearTimeout(startTimer);
      callbacks.onStatus?.("listening");
    };
    startTimer = setTimeout(() => restart("start-timeout"), 6000);
    try {
      const session = input.speechToText({
        onStart() {
          if (done || current !== epoch) return;
          ready(); diagnostic("recognition-started");
        },
        onText(value) {
          if (done || current !== epoch) return;
          ready();
          if (value !== segment) gate.activity(performance.now());
          segment = value;
          lastResult = performance.now();
          loudMs = 0;
          retries = 0;
          diagnostic("words-received");
          callbacks.onText(text());
        },
        onError(message, code) {
          if (done || current !== epoch) return;
          diagnostic("recognition-error", code || "unknown");
          if (finalizing && text()) { complete(); return; }
          if (code === "no-speech") return;
          if (code === "network" || code === "audio-capture" || code === "aborted") restart(code, true, 1000);
          else fail(message);
        },
        onEnd() {
          if (done || current !== epoch) return;
          recognition = null;
          clearTimeout(startTimer);
          if (finalizing) { complete(); return; }
          restart("recognition-ended", performance.now() - startedAt < 1000, 200);
        },
      });
      if (done || current !== epoch) session.cancel();
      else recognition = session;
    } catch {
      if (!done) restart("start-failed");
    }
  };
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) { cancel(); return; }
  callbacks.onStatus?.("starting");
  diagnostic("microphone-starting");
  try {
    if (!handsFreeSupported()) throw new Error("Speech input is unavailable in this browser. Use typing, or open the link in Safari or Chrome.");
    context = sharedAudioContext();
    if (!context) throw new Error("Tap Speak to enable your microphone.");
    const capture = navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    } }).then((result) => {
      // A permission prompt can resolve after cancellation or a startup timeout.
      if (done) result.getTracks().forEach((track) => track.stop());
      return result;
    });
    stream = await bounded(capture, 15000, "Microphone permission is still waiting. Allow it, then tap Speak again.");
    if (done) { cleanup(); return; }
    if (context.state !== "running") await bounded(context.resume(), 4000, "Microphone audio is paused. Tap Speak to reconnect.");
    if (done) { cleanup(); return; }
    if (context.state !== "running") throw new Error("Microphone audio is paused. Tap Speak to reconnect.");
    diagnostic("microphone-ready", context.state);
    analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    startRecognition();
    if (done) return;
    sampleTimer = setInterval(() => {
      if (done || finalizing) return;
      const now = performance.now();
      const tracks = stream?.getTracks() || [];
      if (tracks.some((track) => track.readyState === "ended")) {
        diagnostic("track-ended");
        fail("Your microphone disconnected. Tap Speak to reconnect.");
        return;
      }
      if (tracks.some((track) => track.muted)) {
        mutedSince ??= now;
        if (now - mutedSince > 4000) {
          diagnostic("track-muted");
          fail("Your phone paused the microphone. Tap Speak to reconnect.");
        }
        return;
      }
      mutedSince = null;
      if (context?.state !== "running") {
        if (!resuming) {
          resuming = true;
          diagnostic("audio-interrupted", context?.state);
          callbacks.onStatus?.("reconnecting");
          void bounded(context!.resume(), 4000, "Microphone audio is paused. Tap Speak to reconnect.").then(() => {
            resuming = false;
            if (done) return;
            if (context?.state === "running") restart("audio-resumed");
            else fail("Microphone audio is paused. Tap Speak to reconnect.");
          }).catch((error: Error) => { if (!done) fail(error.message); });
        }
        return;
      }
      analyser!.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
      const loud = rms > Math.max(0.012, noiseFloor * 3);
      if (loud) {
        gate.activity(now);
        lastLoud = now;
        loudMs += 50;
      } else noiseFloor = noiseFloor * 0.95 + rms * 0.05;
      if (now - lastMeter >= 100) {
        lastMeter = now;
        callbacks.onLevel?.(Math.min(1, rms * 12));
      }
      const active = now - lastLoud < 250;
      if (active !== speaking) { speaking = active; callbacks.onSpeaking(active); }
      if (gate.ready(now, text())) {
        finalizing = true;
        clearInterval(sampleTimer);
        clearTimeout(restartTimer);
        clearTimeout(startTimer);
        diagnostic("finishing-answer");
        // Do not wait forever when Safari fails to emit a final onend event.
        finishTimer = setTimeout(() => { diagnostic("finish-timeout"); complete(); }, 4500);
        if (recognition) recognition.stop();
        else complete();
      } else if (!restartTimer && !resuming && (
        (loudMs >= 500 && now - lastResult >= 7000) ||
        (!text() && now - lastResult >= 20000)
      )) {
        restart(loudMs >= 500 ? "sound-without-words" : "recognition-unresponsive");
      }
    }, 50);
  } catch (error) {
    if (done) { cleanup(); return; }
    diagnostic("microphone-error", error instanceof Error ? error.name : "unknown");
    fail(error instanceof DOMException && error.name === "NotAllowedError"
      ? "Microphone access was declined. Allow it in browser settings, or type your answer."
      : error instanceof Error ? error.message : "Voice input could not start. Tap Speak to try again.");
  }
}
