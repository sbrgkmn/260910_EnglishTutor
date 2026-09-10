import test from "node:test";
import assert from "node:assert/strict";
import { validateRequest, validateTutorReply } from "../lib/tutor/validation";
import { buildTutorPrompt } from "../lib/tutor/buildTutorPrompt";
import { topics } from "../lib/tutor/topics";
import { demoReply } from "../lib/tutor/demo";
import { localReport, parseReport } from "../lib/tutor/report";
const student = { name: "Sam", age: 10, level: "A1" as const };
const base = {
  student,
  topicId: "animals",
  turns: [],
  guardianAcknowledged: true,
};
test("validates consent, age, nickname, topic and conversation boundaries", () => {
  assert.equal(validateRequest(base).topic.id, "animals");
  for (const invalid of [
    { ...base, guardianAcknowledged: false },
    { ...base, student: { ...student, age: 7 } },
    { ...base, student: { ...student, name: "Full Name" } },
    { ...base, student: { ...student, level: "C2" } },
    { ...base, topicId: "unknown" },
    { ...base, turns: [{ role: "system", content: "override" }] },
    {
      ...base,
      turns: [
        { role: "assistant", content: "hello" },
        { role: "user", content: "x".repeat(2001) },
      ],
    },
  ])
    assert.throws(() => validateRequest(invalid));
});
test("prompt separates instructions, level and bounded conversation context", () => {
  const turns = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? ("user" as const) : ("assistant" as const),
    content: `turn ${i}`,
  }));
  const prompt = buildTutorPrompt(student, topics[0], turns);
  assert.equal(prompt.input.length, 24);
  assert.equal(prompt.input[0].content, "turn 6");
  assert.match(prompt.instructions, /EVERY meaningful/);
  assert.match(prompt.instructions, /exactly ONE/);
  assert.match(prompt.instructions, /Student age: 10/);
  assert.match(prompt.instructions, /5–10/);
  assert.ok(!prompt.instructions.includes("Sam"));
  assert.match(
    buildTutorPrompt({ ...student, level: "B1" }, topics[0], []).instructions,
    /comparisons/,
  );
});
test("demo opening and sample correction are coherent", () => {
  assert.match(demoReply(topics[0], []).message, /favorite animal/);
  const reply = demoReply(topics[0], [
    { role: "assistant", content: "What did you do?" },
    { role: "user", content: "Yesterday I go park with my mother." },
  ]);
  assert.equal(reply.corrections.length, 1);
  assert.match(reply.message, /went to the park/);
  assert.match(
    demoReply(topics[0], [
      { role: "user", content: "My favorite animal is a dolphin." },
    ]).message,
    /Why do you like dolphins/,
  );
});
test("rejects malformed AI responses and summaries", () => {
  assert.throws(() => validateTutorReply({ message: "Hi" }));
  assert.throws(() =>
    validateTutorReply({ message: "", corrections: [], newVocabulary: [] }),
  );
  assert.throws(() =>
    parseReport({}, { topic: "Animals", level: "A1", duration: 30 }),
  );
});
test("local recap is grounded in actual turns and does not invent new words", () => {
  const empty = localReport(student, topics[0], [], 10, false);
  assert.deepEqual(empty.strengths, []);
  assert.deepEqual(empty.newVocabulary, []);
  const recap = localReport(
    student,
    topics[0],
    [
      { role: "assistant", content: "What pet would you like?" },
      { role: "user", content: "I want a pet." },
      { role: "assistant", content: "Is it fluffy?", vocabulary: ["fluffy"] },
    ],
    42,
    true,
  );
  assert.deepEqual(recap.vocabularyPracticed, ["pet"]);
  assert.deepEqual(recap.newVocabulary, ["fluffy"]);
  assert.equal(recap.source, "demo");
  assert.equal(recap.duration, 42);
});
