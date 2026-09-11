import type { ActivityQuestion, StudentAnswer } from "./activityTypes";
import { hasWord } from "./evaluateAnswer";
export const petChoices = [
  "dog",
  "cat",
  "rabbit",
  "bird",
  "butterfly",
  "dragon",
  "unicorn",
  "none",
] as const;
export type PetChoice = (typeof petChoices)[number];
export function petChoice(answer: StudentAnswer): PetChoice | undefined {
  if (answer.type === "click") return;
  if (/\b(no pet|don't want|do not want|none)\b/i.test(answer.text))
    return "none";
  if (hasWord(answer.text, "bunny")) return "rabbit";
  return petChoices.find((choice) => hasWord(answer.text, choice));
}
export function personalFollowup(choice?: PetChoice): ActivityQuestion {
  const prompt =
    choice === "none"
      ? "Where would you like to watch animals instead?"
      : choice
        ? `What would you like to do with your ${choice}?`
        : "What would you like to do with an animal friend?";
  return {
    id: "pet-followup",
    type: "personal",
    targetId: choice,
    prompt,
    accepted: [],
    vocabulary: ["play", "walk", "watch", "feed", "because"],
    hint: "You could play, go for a walk, or watch animals.",
  };
}
