import type { TutorState } from "@/lib/types";
import type { EvaluationResult } from "@/lib/activities/activityTypes";
import { teacherStateFor, type TeacherState } from "@/lib/teacher/teacherState";
import { TeacherSprite } from "./TeacherSprite";
export function TeacherAvatar({
  state,
  result,
  complete = false,
  override,
}: {
  state: TutorState;
  result?: EvaluationResult | null;
  complete?: boolean;
  override?: TeacherState;
}) {
  return (
    <TeacherSprite
      state={override || teacherStateFor(state, result, complete)}
      talking={state === "SPEAKING"}
    />
  );
}
