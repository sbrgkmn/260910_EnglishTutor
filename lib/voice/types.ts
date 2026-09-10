export type VoiceProviderName = "browser" | "elevenlabs";
export type VoiceOptions = {
  rate?: number;
  onStart?: () => void;
  onSentence?: (sentence: string) => void;
  onFallback?: () => void;
};
export interface VoiceProvider {
  supported(): boolean;
  textToSpeech(text: string, options?: VoiceOptions): Promise<void>;
  cancel(): void;
  unlock?(): void;
}
export type VoiceConfig = {
  provider?: string;
  apiKey?: string;
  voiceId?: string;
};
