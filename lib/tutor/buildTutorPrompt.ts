import { corePrompt } from "./corePrompt";
import { levelRules } from "./levelRules";
import type { Student, Turn } from "../types";
import type { Topic } from "./topics";
export function buildTutorPrompt(
  student: Student,
  topic: Topic,
  turns: Turn[],
) {
  return {
    instructions: [
      corePrompt,
      `Student age: ${student.age}. CEFR: ${student.level}.`,
      levelRules[student.level],
      `Topic material (choose only relevant questions): ${JSON.stringify({ title: topic.title, starterQuestions: topic.starterQuestions, followUpQuestions: topic.followUpQuestions, targetVocabulary: topic.targetVocabulary, grammarFocus: topic.grammarFocus })}`,
    ].join("\n\n"),
    input: turns.length
      ? turns.slice(-120).map((t) => ({ role: t.role, content: t.content }))
      : [
          {
            role: "user" as const,
            content: "Begin our English practice with one question.",
          },
        ],
  };
}
