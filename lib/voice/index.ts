import { BrowserVoiceProvider } from "./browser";
import { ElevenLabsVoiceProvider } from "./elevenlabs";
import type { VoiceOptions, VoiceProvider, VoiceProviderName } from "./types";
export function speechSentences(text: string): string[] {
  // Preserve quoted corrections and sentence punctuation; never paraphrase a reply.
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return [...segmenter.segment(text)]
    .map((item) => item.segment.trim())
    .filter(Boolean);
}
export class TutorVoice implements VoiceProvider {
  private browser = new BrowserVoiceProvider();
  private elevenlabs = new ElevenLabsVoiceProvider();
  private selection: VoiceProviderName | null = null;
  private generation = 0;
  private configuration: AbortController | null = null;
  supported() {
    return this.browser.supported() || this.elevenlabs.supported();
  }
  unlock() {
    this.elevenlabs.unlock();
  }
  async textToSpeech(text: string, options: VoiceOptions = {}) {
    this.cancel();
    const generation = this.generation;
    if (!this.selection) {
      const controller = new AbortController();
      this.configuration = controller;
      try {
        const res = await fetch("/api/tts", {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(4000),
          ]),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        this.selection =
          data.provider === "elevenlabs" ? "elevenlabs" : "browser";
      } catch {
        if (generation !== this.generation) return;
        this.selection = "browser";
      } finally {
        if (this.configuration === controller) this.configuration = null;
      }
    }
    for (const sentence of speechSentences(text)) {
      if (generation !== this.generation) return;
      const callbacks = {
        ...options,
        onStart: () => {
          if (generation === this.generation) {
            options.onSentence?.(sentence);
            options.onStart?.();
          }
        },
      };
      if (this.selection === "elevenlabs") {
        try {
          await this.elevenlabs.textToSpeech(sentence, callbacks);
        } catch {
          if (generation !== this.generation) return;
          this.selection = "browser";
          options.onFallback?.();
          await this.browser.textToSpeech(sentence, callbacks);
        }
      } else await this.browser.textToSpeech(sentence, callbacks);
    }
  }
  cancel() {
    this.generation++;
    this.configuration?.abort();
    this.configuration = null;
    this.browser.cancel();
    this.elevenlabs.cancel();
  }
}
