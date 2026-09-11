import type {
  Activity,
  ActivityQuestion,
  EvaluationResult,
  StudentAnswer,
} from "./activityTypes";
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export const hasWord = (text: string, word: string) =>
  ` ${normalize(text)} `.includes(` ${normalize(word)} `);
export function evaluateAnswer(
  activity: Activity,
  q: ActivityQuestion,
  answer: StudentAnswer,
): EvaluationResult {
  const result: EvaluationResult = {
    success: false,
    attempt: false,
    vocabularyBonus: false,
    feedback: q.hint,
    corrections: [],
    creative: false,
    source: "local",
  };
  if (answer.type === "click") {
    result.success =
      (q.type === "find" && answer.objectId === q.targetId) ||
      (q.type === "choose" && q.accepted.includes(answer.objectId));
    result.feedback = result.success
      ? `Yes! That’s the ${activity.scene.objects.find((o) => o.id === answer.objectId)?.label || "one"}.`
      : `Have another look. ${q.hint}`;
    return result;
  }
  const text = answer.text.trim();
  if (!text) return result;
  const words = normalize(text);
  result.attempt = true;
  // Do not repeat sensitive content even in a correction.
  if (/\b(address|email|phone number|school is called)\b/i.test(text)) {
    result.feedback =
      "You can keep private details to yourself. Let’s use an imaginary example.";
    return result;
  }
  const uncertain = /\b(don't know|do not know|not sure|no idea)\b/.test(words);
  const negative = /\b(not|isn't|isnt|aren't|arent|no)\b/.test(words);
  const matches = q.accepted.some(
    (word) =>
      hasWord(words, word) ||
      activity.scene.objects
        .find((o) => o.id === word)
        ?.aliases.some((a) => hasWord(words, a)),
  );
  const colors = [
    "white",
    "blue",
    "red",
    "yellow",
    "brown",
    "orange",
    "green",
    "black",
    "pink",
    "purple",
  ];
  const conflict =
    (q.type === "describe" || q.type === "memory") &&
    colors.some((c) => !q.accepted.includes(c) && hasWord(words, c));
  result.success =
    !uncertain &&
    (q.type === "personal"
      ? words.length > 1
      : matches && !negative && !conflict);
  result.vocabularyBonus =
    result.success && q.vocabulary.some((w) => hasWord(words, w));
  let corrected = text;
  corrected = corrected.replace(
    /\b(the|a) (rabbit|dog|cat|bird|backpack|ball|butterfly) are\b/gi,
    "$1 $2 is",
  );
  corrected = corrected.replace(
    /\bI (see|can see) dog and rabbit\b/gi,
    "I $1 a dog and a rabbit",
  );
  corrected = corrected.replace(
    /\b(he|she|it) (fly|flying)\b/gi,
    "$1 is flying",
  );
  for (const object of activity.scene.objects.filter(
    (o) => o.id !== "scissors",
  )) {
    const label = object.label.replace(/[^a-z ]/gi, "");
    corrected = corrected.replace(
      new RegExp(`\\b(the|a) (${label}) are\\b`, "gi"),
      "$1 $2 is",
    );
  }
  if (corrected !== text) result.corrections = [{ original: text, corrected }];
  result.creative =
    q.type === "personal" && /\b(imagine|dragon|unicorn|invent)\b/i.test(text);
  const chosen = activity.scene.objects.find(
    (o) => o.kind === "animal" && o.aliases.some((a) => hasWord(text, a)),
  );
  const answerFeedback =
    q.successFeedback ||
    (q.id === "look"
      ? "Lovely! You spotted the animals."
      : q.type === "describe"
        ? `Yes! The ${q.targetId} is ${q.accepted[0]}.`
        : q.type === "action"
          ? "That’s right! The butterfly is flying."
          : q.type === "memory"
            ? "You remembered! The ball was red."
            : "You found it!");
  result.feedback = result.success
    ? q.type === "personal"
      ? q.successFeedback ||
        (q.id === "pet-followup"
          ? "That sounds like a lovely adventure!"
          : chosen
            ? `A ${chosen.label}! Let’s imagine an adventure together.`
            : "That’s your choice. Thanks for sharing it!")
      : answerFeedback
    : `Good try. ${q.hint}`;
  if (result.corrections.length)
    result.feedback = `You can say, “${corrected}”`;
  return result;
}
