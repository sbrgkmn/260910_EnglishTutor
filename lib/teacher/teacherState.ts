import type { TutorState } from "../types";
import type { EvaluationResult } from "../activities/activityTypes";
export type TeacherState =
  | "neutral"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "encouraging"
  | "correction"
  | "surprised"
  | "celebrating";
export const teacherStates: TeacherState[] = [
  "neutral",
  "listening",
  "thinking",
  "speaking",
  "happy",
  "encouraging",
  "correction",
  "surprised",
  "celebrating",
];
export function teacherStateFor(
  state: TutorState,
  result?: EvaluationResult | null,
  complete = false,
): TeacherState {
  if (state === "LISTENING") return "listening";
  if (complete) return "celebrating";
  if (result?.corrections.length) return "correction";
  if (result?.creative) return "surprised";
  if (result) return result.success ? "happy" : "encouraging";
  if (state === "THINKING") return "thinking";
  return state === "SPEAKING" ? "speaking" : "neutral";
}
