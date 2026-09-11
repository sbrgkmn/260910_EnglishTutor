export interface SpeechInputSession {
  stop(): void;
  cancel(): void;
}
export interface SpeechToTextService {
  supported(): boolean;
  speechToText(callbacks: {
    onStart?: () => void;
    onText: (text: string) => void;
    onEnd: () => void;
    onError: (message: string, code?: string) => void;
  }): SpeechInputSession;
}
export interface TextToSpeechService {
  supported(): boolean;
  textToSpeech(
    text: string,
    options?: { rate?: number; onStart?: () => void },
  ): Promise<void>;
  cancel(): void;
}
