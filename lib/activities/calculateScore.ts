import type { EvaluationResult, StudentAnswer } from "./activityTypes";
export function calculateScore(
  result: EvaluationResult,
  answer: StudentAnswer,
) {
  const base = result.success
    ? 10
    : result.attempt && answer.type !== "click"
      ? 5
      : 0;
  return (
    base +
    (result.vocabularyBonus && result.success && answer.type !== "click"
      ? 5
      : 0)
  );
}
