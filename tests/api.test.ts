import test from "node:test";
import assert from "node:assert/strict";
import { POST as tutorPost } from "../app/api/tutor/route";
import { POST as reportPost } from "../app/api/report/route";
const base = {
  student: { name: "Sam", age: 10, level: "A1" },
  topicId: "animals",
  turns: [],
  guardianAcknowledged: true,
  demo: false,
};
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/tutor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Host: "localhost:3000",
    },
    body: JSON.stringify(body),
  });
}
test("server routes pass structured output, private transport settings and report data through a mocked provider", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
  try {
    let payload: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      payload = JSON.parse(String(init?.body));
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  message: "What is your favorite animal?",
                  corrections: [],
                  newVocabulary: [],
                }),
              },
            ],
          },
        ],
      });
    };
    const response = await tutorPost(request(base));
    assert.equal(response.status, 200);
    assert.equal(
      (await response.json()).message,
      "What is your favorite animal?",
    );
    assert.equal(payload.store, false);
    assert.ok(!JSON.stringify(payload).includes("test-key-not-a-secret"));
    assert.ok(!JSON.stringify(payload).includes("Sam"));
    const format = (
      payload.text as { format: { type: string; strict: boolean } }
    ).format;
    assert.equal(format.type, "json_schema");
    assert.equal(format.strict, true);
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  vocabularyPracticed: ["dolphin"],
                  importantCorrections: [],
                  newVocabulary: [],
                  strengths: ["You named an animal in English."],
                  practiceRecommendation: "Add a reason with because.",
                }),
              },
            ],
          },
        ],
      });
    const summary = await reportPost(
      request({
        ...base,
        duration: 72,
        turns: [
          { role: "assistant", content: "What is your favorite animal?" },
          { role: "user", content: "A dolphin." },
        ],
      }),
    );
    assert.equal(summary.status, 200);
    const report = await summary.json();
    assert.equal(report.duration, 72);
    assert.equal(report.source, "ai");
    assert.deepEqual(report.vocabularyPracticed, ["dolphin"]);
    globalThis.fetch = async () =>
      Response.json(
        { error: { message: "raw provider details" } },
        { status: 429 },
      );
    const busy = await tutorPost(request(base));
    assert.equal(busy.status, 429);
    assert.ok(
      !JSON.stringify(await busy.json()).includes("raw provider details"),
    );
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        output: [{ content: [{ type: "refusal", refusal: "refused" }] }],
      });
    assert.equal((await tutorPost(request(base))).status, 502);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
test("server rejects cross-origin and malformed requests, and exposes missing configuration honestly", async () => {
  assert.equal(
    (await tutorPost(request(base, "https://untrusted.example"))).status,
    400,
  );
  assert.equal(
    (
      await tutorPost(
        new Request("http://localhost:3000/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{bad",
        }),
      )
    ).status,
    400,
  );
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const response = await tutorPost(request(base));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not configured/);
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});
