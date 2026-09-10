export type Level = "A1" | "A2" | "B1";
export type TutorState = "READY" | "LISTENING" | "THINKING" | "SPEAKING";
export type Student = { name: string; age: number; level: Level };
export type Correction = { original: string; corrected: string };
export type Turn = {
  role: "user" | "assistant";
  content: string;
  corrections?: Correction[];
  vocabulary?: string[];
};
export type TutorReply = {
  message: string;
  corrections: Correction[];
  newVocabulary: string[];
};
export type SessionReport = {
  topic: string;
  duration: number;
  level: Level;
  vocabularyPracticed: string[];
  importantCorrections: Correction[];
  newVocabulary: string[];
  strengths: string[];
  practiceRecommendation: string;
  source: "ai" | "local" | "demo";
};
export type SavedSession = {
  id: string;
  date: string;
  student: Student;
  topicId: string;
  turns: Turn[];
  report: SessionReport;
};
