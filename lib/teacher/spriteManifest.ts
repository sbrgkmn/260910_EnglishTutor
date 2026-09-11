import { teacherStates, type TeacherState } from "./teacherState";
export type SpriteFrame = { src: string; duration: number };
export type SpritePack = {
  poses: Record<TeacherState, SpriteFrame[]>;
  transitions: Partial<
    Record<`${TeacherState}->${TeacherState}`, SpriteFrame[]>
  >;
  approved: boolean;
};
// Generated key-pose preview pack, authored outside lesson runtime.
// Teacher review is recorded separately; local preview works before approval.
export const spriteManifest: SpritePack = {
  approved: false,
  poses: Object.fromEntries(
    teacherStates.map((state) => [
      state,
      [{ src: `/teacher/sprites/${state}/key-v1.jpg`, duration: 800 }],
    ]),
  ) as SpritePack["poses"],
  transitions: {},
};
export function transitionFrames(
  from: TeacherState,
  to: TeacherState,
  pack = spriteManifest,
) {
  return [...(pack.transitions[`${from}->${to}`] || []), ...pack.poses[to]];
}
