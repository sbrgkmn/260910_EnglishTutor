import { topicFollowup } from "../activities/topicLessons";
import { hasWord } from "../activities/evaluateAnswer";
import { petChoice, personalFollowup } from "../activities/personalFollowup";
import type {
  Activity,
  EvaluationResult,
  StudentAnswer,
} from "../activities/activityTypes";
import { calculateScore } from "../activities/calculateScore";
export type GameSession = {
  activity: Activity;
  index: number;
  stars: number;
  earned: number;
  completed: boolean;
  answered: string[];
  attempts: Record<string, number>;
  lastResult: EvaluationResult | null;
};
export const startGame = (activity: Activity, stars = 0): GameSession => ({
  activity,
  index: 0,
  stars,
  earned: 0,
  completed: false,
  answered: [],
  attempts: {},
  lastResult: null,
});
export function applyAnswer(
  state: GameSession,
  questionId: string,
  answer: StudentAnswer,
  result: EvaluationResult,
): GameSession {
  const q = state.activity.questions[state.index];
  if (
    state.completed ||
    q?.id !== questionId ||
    state.answered.includes(questionId)
  )
    return state;
  const attempts = {
    ...state.attempts,
    [q.id]: (state.attempts[q.id] || 0) + 1,
  };
  // Wrong taps remain recoverable and cannot farm points. Spoken attempts move on.
  if (answer.type === "click" && !result.success)
    return { ...state, attempts, lastResult: result };
  const points = calculateScore(result, answer);
  const activity =
    q.id === "pet"
      ? {
          ...state.activity,
          questions: state.activity.questions.map((question) =>
            question.id === "pet-followup"
              ? personalFollowup(petChoice(answer))
              : question,
          ),
        }
      : q.id === "personal" && answer.type !== "click"
        ? {
            ...state.activity,
            questions: state.activity.questions.map((question) =>
              question.id === "followup"
                ? topicFollowup(
                    state.activity.topic,
                    state.activity.scene.objects.find((o) =>
                      o.aliases.some((alias) => hasWord(answer.text, alias)),
                    )?.id,
                  )
                : question,
            ),
          }
        : state.activity;
  return {
    ...state,
    activity,
    stars: state.stars + points,
    earned: state.earned + points,
    answered: [...state.answered, q.id],
    attempts,
    lastResult: result,
  };
}
export function nextQuestion(state: GameSession): GameSession {
  if (
    state.completed ||
    !state.answered.includes(state.activity.questions[state.index].id)
  )
    return state;
  if (state.index === state.activity.questions.length - 1)
    return {
      ...state,
      stars: state.stars + 20,
      earned: state.earned + 20,
      completed: true,
    };
  return { ...state, index: state.index + 1, lastResult: null };
}
