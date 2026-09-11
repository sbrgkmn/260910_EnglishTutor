import test from "node:test";
import assert from "node:assert/strict";
import { generateActivity } from "../lib/activities/generateActivity";
import {
  generateActivityImage,
  activityImagePrompt,
} from "../lib/images/generateActivityImage";
import { SceneCache } from "../lib/images/sceneCache";
import { handleActivity } from "../lib/activities/handleActivity";
import { OpenAIImageProvider } from "../lib/images/provider";
import worker from "../hosting/worker";

test("image generation keeps authored objects, questions and hitboxes; failure falls back", async () => {
  const activity = generateActivity("A2");
  assert.equal(await generateActivityImage(activity, {}), activity);
  const broken = {
    generate: async () => {
      throw new Error("Provider unavailable");
    },
  };
  assert.equal(
    await generateActivityImage(activity, {}, undefined, broken),
    activity,
  );
  const generated = await generateActivityImage(activity, {}, undefined, {
    generate: async (prompt) => {
      assert.equal(prompt, activityImagePrompt(activity));
      assert.match(prompt, /DO NOT draw/);
      return { dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
    },
  });
  assert.equal(generated.scene.imageSource, "generated");
  assert.deepEqual(generated.scene.objects, activity.scene.objects);
  assert.deepEqual(generated.questions, activity.questions);
  assert.ok(generated.scene.generatedAt);
});

test("cache deduplicates simultaneous requests, supports regeneration, expiry and bounded storage", async () => {
  const cache = new SceneCache(1);
  let count = 0;
  const create = async () => {
    count++;
    return generateActivity("A1");
  };
  const [one, two] = await Promise.all([
    cache.get("park", create),
    cache.get("park", create),
  ]);
  assert.equal(count, 1);
  assert.equal(one.id, two.id);
  const cached = await cache.get("park", create);
  cached.scene.objects.length = 0;
  assert.equal((await cache.get("park", create)).scene.objects.length, 7);
  await cache.get("park", create, true);
  assert.equal(count, 2);
  await cache.get("garden", create);
  await cache.get("park", create);
  assert.equal(count, 4);
  const expired = new SceneCache(1, -1);
  await expired.get("one", create);
  await expired.get("one", create);
  assert.equal(count, 6);
});

test("image provider stays behind server transport and rejects malformed images", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test-secret",
      );
      const body = JSON.parse(init?.body as string);
      assert.equal(body.model, "test-model");
      assert.equal(body.n, 1);
      return Response.json({ data: [{ b64_json: "iVBORw0KGgo=" }] });
    };
    const provider = new OpenAIImageProvider({
      apiKey: "test-secret",
      model: "test-model",
    });
    assert.match(
      (await provider.generate("a park")).dataUrl,
      /^data:image\/png;base64,/,
    );
    globalThis.fetch = async () =>
      Response.json({ data: [{ b64_json: "<not an image>" }] });
    await assert.rejects(() => provider.generate("a park"), /invalid image/);
  } finally {
    globalThis.fetch = original;
  }
});

test("activity route and Sites worker return safe bundled fallback without image credentials", async () => {
  const body = {
    level: "A1",
    variant: 0,
    regenerate: false,
    guardianAcknowledged: true,
  };
  const request = (payload: unknown) =>
    new Request("http://localhost/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  const response = await handleActivity(request(body), { provider: "openai" });
  const activity = await response.json();
  assert.equal(activity.scene.imageSource, "sample");
  assert.equal(activity.questions.length, 6);
  assert.equal(
    (
      await handleActivity(
        request({ ...body, guardianAcknowledged: false }),
        {},
      )
    ).status,
    400,
  );
  const env = { ASSETS: { fetch: async () => new Response("static") } };
  const hosted = await worker.fetch(request(body), env);
  assert.equal(hosted.status, 200);
  assert.equal((await hosted.json()).scene.hitboxes, "authored");
  assert.equal(
    (await worker.fetch(new Request("http://localhost/api/activity"), env))
      .status,
    405,
  );
});
