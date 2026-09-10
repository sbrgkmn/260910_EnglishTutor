import test from "node:test";
import assert from "node:assert/strict";
import worker from "../hosting/worker";
test("Sites Worker serves assets and the same demo API, using only its own environment", async () => {
  const env = {
    ASSETS: {
      fetch: async () =>
        new Response("<html>Little Talk</html>", {
          headers: { "Content-Type": "text/html" },
        }),
    },
  };
  const page = await worker.fetch(new Request("https://example.com/"), env);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Little Talk/);
  assert.equal(
    page.headers.get("Permissions-Policy"),
    "microphone=(self), camera=(), geolocation=()",
  );
  const settings = await worker.fetch(
    new Request("https://example.com/api/tutor"),
    env,
  );
  assert.deepEqual(await settings.json(), { configured: false });
  assert.equal(settings.headers.get("Cache-Control"), "no-store");
  const body = {
    student: { name: "Sam", age: 10, level: "A1" },
    topicId: "animals",
    turns: [],
    guardianAcknowledged: true,
    demo: true,
  };
  const request = (demo: boolean) =>
    new Request("https://example.com/api/tutor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://example.com",
      },
      body: JSON.stringify({ ...body, demo }),
    });
  const reply = await worker.fetch(request(true), env);
  assert.equal(reply.status, 200);
  assert.match((await reply.json()).message, /favorite animal/);
  assert.equal((await worker.fetch(request(false), env)).status, 503);
  assert.equal(
    (await worker.fetch(new Request("https://example.com/api/report"), env))
      .status,
    405,
  );
});
