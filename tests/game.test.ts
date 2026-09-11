import test from "node:test";
import assert from "node:assert/strict";
import { generateActivity } from "../lib/activities/generateActivity";
import { evaluateAnswer } from "../lib/activities/evaluateAnswer";
import { applyAnswer, nextQuestion, startGame } from "../lib/game/gameState";
import { teacherStateFor } from "../lib/teacher/teacherState";
import {
  transitionFrames,
  spriteManifest,
} from "../lib/teacher/spriteManifest";
import { handleAnswer } from "../lib/activities/handleAnswer";
import type { StudentAnswer } from "../lib/activities/activityTypes";
import { topics } from "../lib/tutor/topics";
import { handleActivity } from "../lib/activities/handleActivity";
import { generateActivityImage } from "../lib/images/generateActivityImage";
import { existsSync } from "node:fs";

test("six MVP topics have complete, grounded lessons at every level and variant", async () => {
  assert.deepEqual(topics.map((t) => t.id), ["animals", "food", "home", "hobbies", "school", "my-town"]);
  for (const topic of topics.slice(1)) {
    for (const level of ["A1", "A2", "B1"] as const) {
      for (const variant of [0, 1]) {
        const activity = generateActivity(level, variant, topic.id);
        assert.equal(activity.questions.length, 6);
        assert.ok(existsSync(`public${activity.scene.background}`));
        assert.equal(await generateActivityImage(activity, {}, undefined, {
          generate: async () => { throw new Error("Fixed illustrations must not be regenerated"); },
        }), activity);
        let state = startGame(activity);
        while (!state.completed) {
          const q = state.activity.questions[state.index];
          if (q.type === "find") {
            const wrong = { type: "click", objectId: activity.scene.objects.find((o) => o.id !== q.targetId)!.id } as const;
            const retry = applyAnswer(state, q.id, wrong, evaluateAnswer(activity, q, wrong));
            assert.equal(nextQuestion(retry).index, state.index);
            assert.equal(retry.stars, state.stars);
          }
          const answer: StudentAnswer = q.type === "find" || q.type === "choose"
            ? { type: "click", objectId: q.targetId || q.accepted[0] }
            : { type: "text", text: q.type === "personal" ? `I like ${q.vocabulary[0] || "playing"}.` : q.accepted[0] };
          const result = evaluateAnswer(activity, q, answer);
          assert.equal(result.success, true, `${topic.id}/${level}/${variant}/${q.id}`);
          state = nextQuestion(applyAnswer(state, q.id, answer, result));
        }
        assert.equal(state.earned, level === "A1" ? 100 : 105);
        for (const o of activity.scene.objects) {
          const b = o.hitbox;
          assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1 && b.y + b.height <= 1);
        }
      }
    }
  }
});

test("topic APIs use authored facts, reject retired topics and validate personalized follow-ups", async () => {
  const request = (body: unknown) => new Request("http://localhost/api/activity", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const base = { topicId: "food", level: "A1", age: 10, variant: 0, guardianAcknowledged: true, regenerate: false };
  const valid = { ...base, questionId: "color", answer: { type: "text", text: "The apple are red." } };
  const { result } = await (await handleAnswer(request(valid), {})).json();
  assert.equal(result.success, true);
  assert.equal(result.corrections[0].corrected, "The apple is red.");
  assert.equal((await (await handleActivity(request(base), {})).json()).topic, "food");
  for (const topicId of ["feelings", "daily-routines", "family", "holiday", "invented"]) {
    assert.throws(() => generateActivity("A1", 0, topicId));
    assert.equal((await handleActivity(request({ ...base, topicId }), {})).status, 400);
    assert.equal((await handleAnswer(request({ ...valid, topicId }), {})).status, 400);
  }
  assert.equal((await handleAnswer(request({ ...valid, questionId: "followup", choiceId: "dog" }), {})).status, 400);
  const activity = generateActivity("A1", 0, "food");
  const answer = { type: "text", text: "I would choose an apple." } as const;
  const state = applyAnswer({ ...startGame(activity), index: 4 }, "personal", answer, evaluateAnswer(activity, activity.questions[4], answer));
  assert.equal(state.activity.questions[5].prompt, "How would you describe the apple’s taste?");
});
test("Animals loop: grammar is separate from stars, wrong taps recover, duplicate events do not score", () => {
  const activity = generateActivity("A1");
  let state = startGame(activity);
  const answers: StudentAnswer[] = [
    { type: "text", text: "I see dog and rabbit." },
    { type: "click", objectId: "rabbit" },
    { type: "text", text: "The rabbit are white." },
    { type: "click", objectId: "bird" },
    { type: "text", text: "I would like a dog." },
    { type: "text", text: "We would play together." },
  ];
  answers.forEach((answer, i) => {
    const q = activity.questions[i];
    if (i === 1) {
      const wrong = { type: "click", objectId: "dog" } as const;
      state = applyAnswer(
        state,
        q.id,
        wrong,
        evaluateAnswer(activity, q, wrong),
      );
      assert.equal(state.stars, 15);
      assert.equal(nextQuestion(state).index, 1);
    }
    const result = evaluateAnswer(activity, q, answer);
    assert.equal(result.success, true);
    if (i === 2) {
      assert.equal(result.corrections[0].corrected, "The rabbit is white.");
    }
    state = applyAnswer(state, q.id, answer, result);
    assert.equal(applyAnswer(state, q.id, answer, result).stars, state.stars);
    state = nextQuestion(state);
  });
  assert.equal(state.completed, true);
  assert.equal(state.stars, 100);
  assert.equal(nextQuestion(state).stars, 100);
  assert.equal(
    state.activity.questions[5].prompt,
    "What would you like to do with your dog?",
  );
});
test("semantic checking accepts short answers and aliases but not negation or conflicting colors", () => {
  const a = generateActivity("A1");
  const q = a.questions[2];
  for (const text of ["White.", "It is white.", "The rabbit are white."])
    assert.equal(evaluateAnswer(a, q, { type: "text", text }).success, true);
  for (const text of [
    "It is not white.",
    "It is white or blue.",
    "I do not know.",
    "",
  ])
    assert.equal(evaluateAnswer(a, q, { type: "text", text }).success, false);
  assert.equal(
    evaluateAnswer(a, a.questions[1], { type: "text", text: "bunny" }).success,
    true,
  );
  assert.equal(
    evaluateAnswer(a, a.questions[4], { type: "text", text: "No pet for me." })
      .success,
    true,
  );
});
test("teacher transitions reflect audio, correction and completion; missing transition frames use key poses", () => {
  const a = generateActivity("A1");
  const correction = evaluateAnswer(a, a.questions[2], {
    type: "text",
    text: "The rabbit are white.",
  });
  assert.equal(teacherStateFor("LISTENING"), "listening");
  assert.equal(teacherStateFor("THINKING"), "thinking");
  assert.equal(teacherStateFor("SPEAKING"), "speaking");
  assert.equal(teacherStateFor("SPEAKING", correction), "correction");
  assert.equal(teacherStateFor("READY", null, true), "celebrating");
  assert.deepEqual(
    transitionFrames("neutral", "listening"),
    spriteManifest.poses.listening,
  );
  const pack = {
    ...spriteManifest,
    transitions: {
      "neutral->listening": [{ src: "/intermediate.jpg", duration: 80 }],
    },
  };
  assert.equal(
    transitionFrames("neutral", "listening", pack)[0].src,
    "/intermediate.jpg",
  );
});
test("all authored targets stay within the image at mobile and tablet sizes", () => {
  for (const width of [358, 760])
    for (const o of generateActivity("A1").scene.objects) {
      const b = o.hitbox;
      assert.ok(
        b.x >= 0 && b.y >= 0 && b.x + b.width <= 1 && b.y + b.height <= 1,
      );
      assert.ok(Math.max(44, b.width * width) <= width);
    }
});
test("activity answer endpoint validates input and supports local feedback without a key", async () => {
  const make = (body: unknown) =>
    new Request("http://localhost/api/activity/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const valid = {
    level: "A1",
    age: 7,
    variant: 0,
    questionId: "color",
    answer: { type: "text", text: "The rabbit are white." },
    guardianAcknowledged: true,
  };
  const res = await handleAnswer(make(valid), {});
  assert.equal(res.status, 200);
  const { result } = await res.json();
  assert.equal(result.success, true);
  assert.equal(result.source, "local");
  for (const b of [
    { ...valid, age: 6 },
    { ...valid, questionId: "invented" },
    { ...valid, guardianAcknowledged: false },
  ])
    assert.equal((await handleAnswer(make(b), {})).status, 400);
});

test("personal follow-ups use the chosen pet, respect no pet and avoid echoing free text", () => {
  const activity = generateActivity("A1");
  const state = { ...startGame(activity), index: 4 };
  for (const [text, expected] of [
    ["A bunny!", "What would you like to do with your rabbit?"],
    ["No pet for me.", "Where would you like to watch animals instead?"],
    [
      "My private imaginary story",
      "What would you like to do with an animal friend?",
    ],
  ]) {
    const answer = { type: "text" as const, text };
    const updated = applyAnswer(
      state,
      "pet",
      answer,
      evaluateAnswer(activity, activity.questions[4], answer),
    );
    assert.equal(updated.activity.questions[5].prompt, expected);
  }
});
