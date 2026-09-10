import type { Topic } from "./topics";
import type { SessionReport, Student, Turn } from "../types";
import { isCorrections, isStringList } from "./validation";
export function localReport(
  student: Student,
  topic: Topic,
  turns: Turn[],
  duration: number,
  demo: boolean,
): SessionReport {
  const studentTurns = turns.filter((t) => t.role === "user");
  const text = studentTurns.map((t) => t.content.toLowerCase()).join(" ");
  return {
    topic: topic.title,
    level: student.level,
    duration,
    vocabularyPracticed: topic.targetVocabulary.filter((w) =>
      new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        text,
      ),
    ),
    importantCorrections: turns.flatMap((t) => t.corrections || []),
    newVocabulary: [...new Set(turns.flatMap((t) => t.vocabulary || []))],
    strengths: studentTurns.length
      ? [
          `You shared ${studentTurns.length} ${studentTurns.length === 1 ? "answer" : "answers"} in English.`,
        ]
      : [],
    practiceRecommendation: studentTurns.length
      ? "Next time, try adding a reason with “because”."
      : "Try answering the opening question in a full sentence.",
    source: demo ? "demo" : "local",
  };
}
export function parseReport(
  data: unknown,
  base: Pick<SessionReport, "topic" | "level" | "duration">,
): SessionReport {
  const v = data as Record<string, unknown>;
  if (
    !v ||
    !isStringList(v.vocabularyPracticed) ||
    !isStringList(v.newVocabulary) ||
    !isStringList(v.strengths) ||
    !isCorrections(v.importantCorrections) ||
    typeof v.practiceRecommendation !== "string" ||
    v.practiceRecommendation.length > 1000
  )
    throw new Error("The session summary was incomplete.");
  return {
    ...base,
    vocabularyPracticed: v.vocabularyPracticed,
    newVocabulary: v.newVocabulary,
    strengths: v.strengths,
    importantCorrections: v.importantCorrections,
    practiceRecommendation: v.practiceRecommendation,
    source: "ai",
  };
}
