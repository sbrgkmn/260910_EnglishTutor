import type { SavedSession } from "./types";
const HISTORY_KEY = "little-talk.sessions.v1";
const ACK_KEY = "little-talk.guardian.v1";
export function getSessions(): SavedSession[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  const sessions = JSON.parse(raw);
  if (!Array.isArray(sessions))
    throw new Error("Saved practice could not be read.");
  return sessions
    .filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.date === "string" &&
        s.student &&
        typeof s.student.name === "string" &&
        Array.isArray(s.turns) &&
        s.report &&
        typeof s.report.topic === "string" &&
        typeof s.report.duration === "number" &&
        Array.isArray(s.report.newVocabulary) &&
        Array.isArray(s.report.vocabularyPracticed) &&
        Array.isArray(s.report.strengths) &&
        Array.isArray(s.report.importantCorrections),
    )
    .slice(0, 20);
}
export function saveSession(session: SavedSession) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(
      [session, ...getSessions().filter((s) => s.id !== session.id)].slice(
        0,
        20,
      ),
    ),
  );
}
export function clearSessions() {
  localStorage.removeItem(HISTORY_KEY);
}
export function hasAcknowledgement() {
  return localStorage.getItem(ACK_KEY) === "acknowledged";
}
export function acknowledgeGuardian() {
  localStorage.setItem(ACK_KEY, "acknowledged");
}
