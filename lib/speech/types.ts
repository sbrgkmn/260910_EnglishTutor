export interface SpeechInputSession {
  stop(): void;
  cancel(): void;
}
export interface SpeechToTextService {
  supported(): boolean;
  speechToText(callbacks: {
    onText: (text: string) => void;
    onEnd: () => void;
    onError: (message: string, code?: string) => void;
  }): SpeechInputSession;
}
export interface TextToSpeechService {
  supported(): boolean;
  textToSpeech(text: string, options?: { rate?: number }): Promise<void>;
  cancel(): void;
}
