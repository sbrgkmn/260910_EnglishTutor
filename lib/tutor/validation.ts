import type { Student, Turn, TutorReply, Correction } from "../types";
import { getTopic } from "./topics";
export class InputError extends Error {}
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= 100 &&
  v.every((s) => typeof s === "string" && s.length <= 600);
export const isCorrections = (v: unknown): v is Correction[] =>
  Array.isArray(v) &&
  v.length <= 100 &&
  v.every(
    (c) =>
      isObject(c) &&
      typeof c.original === "string" &&
      c.original.length <= 2000 &&
      typeof c.corrected === "string" &&
      c.corrected.length <= 2000,
  );
export function validateRequest(value: unknown, report = false) {
  if (
    !isObject(value) ||
    !isObject(value.student) ||
    value.guardianAcknowledged !== true
  )
    throw new InputError(
      "A parent or guardian needs to acknowledge first use.",
    );
  const s = value.student;
  if (
    typeof s.name !== "string" ||
    !/^[\p{L}\p{M}'’-]{1,24}$/u.test(s.name) ||
    !Number.isInteger(s.age) ||
    Number(s.age) < 7 ||
    Number(s.age) > 12 ||
    !["A1", "A2", "B1"].includes(String(s.level))
  )
    throw new InputError(
      "Choose a nickname, an age from 7–12, and a valid English level.",
    );
  const topic =
    typeof value.topicId === "string" ? getTopic(value.topicId) : undefined;
  if (!topic || !Array.isArray(value.turns) || value.turns.length > 120)
    throw new InputError("Invalid topic or conversation.");
  let total = 0;
  const turns: Turn[] = value.turns.map((t) => {
    if (
      !isObject(t) ||
      !["user", "assistant"].includes(String(t.role)) ||
      typeof t.content !== "string" ||
      !t.content.trim() ||
      t.content.length > 2000
    )
      throw new InputError("Messages must contain 1–2,000 characters.");
    total += t.content.length;
    return { role: t.role as Turn["role"], content: t.content.trim() };
  });
  if (total > 30000)
    throw new InputError(
      "This conversation is full. End this session and start another.",
    );
  if (
    turns.some((t, i) => i > 0 && t.role === turns[i - 1].role) ||
    (turns.length > 0 && turns[0].role !== "assistant")
  )
    throw new InputError("Invalid conversation order.");
  if (!report && turns.length > 0 && turns.at(-1)?.role !== "user")
    throw new InputError("Send a student message first.");
  if (
    report &&
    (typeof value.duration !== "number" ||
      !Number.isFinite(value.duration) ||
      value.duration < 0 ||
      value.duration > 86400)
  )
    throw new InputError("Invalid session duration.");
  return {
    student: s as Student,
    topic,
    turns,
    demo: value.demo === true,
    duration: report ? Math.round(Number(value.duration)) : 0,
  };
}
export function validateTutorReply(v: unknown): TutorReply {
  if (
    !isObject(v) ||
    typeof v.message !== "string" ||
    !v.message.trim() ||
    v.message.length > 4000 ||
    !isCorrections(v.corrections) ||
    !isStringList(v.newVocabulary)
  )
    throw new Error(
      "The tutor returned an incomplete reply. Please try again.",
    );
  return v as TutorReply;
}
