import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveVoiceProvider,
  handleTts,
  voiceSettings,
} from "../lib/voice/server";
import worker from "../hosting/worker";
import { TutorVoice, speechSentences } from "../lib/voice";
import { ElevenLabsVoiceProvider } from "../lib/voice/elevenlabs";
const config = {
  provider: "elevenlabs",
  apiKey: "test-eleven-secret",
  voiceId: "test-teacher-voice",
};
const request = (
  text: unknown = "What is your favorite animal?",
  origin = "https://example.com",
) =>
  new Request("https://example.com/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ text, guardianAcknowledged: true }),
  });

test("voice configuration exposes only the effective provider and gracefully handles missing credentials", async () => {
  assert.equal(effectiveVoiceProvider({ provider: "elevenlabs" }), "browser");
  assert.equal(effectiveVoiceProvider({ ...config, apiKey: "" }), "browser");
  assert.equal(
    effectiveVoiceProvider({ ...config, provider: "browser" }),
    "browser",
  );
  assert.deepEqual(await voiceSettings(config).json(), {
    provider: "elevenlabs",
  });
  assert.deepEqual(await (await handleTts(request(), {})).json(), {
    provider: "browser",
  });
});
test("TTS validates input, forwards credentials only upstream, and returns audio without vendor headers", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls++;
    assert.match(
      url,
      /api.elevenlabs.io\/v1\/text-to-speech\/test-teacher-voice/,
    );
    assert.equal(new Headers(init.headers).get("xi-api-key"), config.apiKey);
    const body = JSON.parse(String(init.body));
    assert.equal(body.text, "What is your favorite animal?");
    assert.equal(body.model_id, "eleven_flash_v2_5");
    return new Response(new Uint8Array([73, 68, 51, 1]), {
      headers: { "Content-Type": "audio/mpeg", "xi-api-key": "must-not-leak" },
    });
  });
  for (const bad of [
    request(""),
    request(42),
    request("a".repeat(2001)),
    request("hello", "https://untrusted.example"),
  ])
    assert.equal((await handleTts(bad, config)).status, 400);
  assert.equal(calls, 0);
  const result = await handleTts(request(), config);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal(result.headers.get("xi-api-key"), null);
  assert.deepEqual(
    [...new Uint8Array(await result.arrayBuffer())],
    [73, 68, 51, 1],
  );
});
test("provider failures return a safe fallback error, never raw provider data", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ secret: config.apiKey }, { status: 401 }),
  );
  const result = await handleTts(request(), config);
  assert.equal(result.status, 502);
  assert.ok(!(await result.text()).includes(config.apiKey));
});
test("Sites Worker uses its TTS bindings and never exposes the voice ID or secret in configuration", async () => {
  const env = {
    ASSETS: { fetch: async () => new Response("assets") },
    VOICE_PROVIDER: "elevenlabs",
    ELEVENLABS_API_KEY: config.apiKey,
    ELEVENLABS_VOICE_ID: config.voiceId,
  };
  const result = await worker.fetch(
    new Request("https://example.com/api/tts"),
    env,
  );
  assert.deepEqual(await result.json(), { provider: "elevenlabs" });
});
test("spoken sentences preserve quoted corrections without showing a full paragraph", () => {
  const text = "You can say, “I went to the park.” What did you do there?";
  assert.deepEqual(speechSentences(text), [
    "You can say, “I went to the park.”",
    "What did you do there?",
  ]);
});

function installAudioFakes(t: TestContext) {
  const spoken: string[] = [];
  const played: string[] = [];
  class Utterance {
    lang = "";
    rate = 1;
    voice = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(public text: string) {}
  }
  class FakeAudio {
    src = "";
    onplaying: (() => void) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play() {
      played.push(this.src);
      queueMicrotask(() => {
        this.onplaying?.();
        this.onended?.();
      });
      return Promise.resolve();
    }
    pause() {}
    load() {}
    removeAttribute() {
      this.src = "";
    }
  }
  for (const [name, value] of Object.entries({
    window: {
      speechSynthesis: {
        getVoices: () => [],
        speak: (u: Utterance) => {
          spoken.push(u.text);
          queueMicrotask(() => {
            u.onstart?.();
            u.onend?.();
          });
        },
        cancel() {},
      },
    },
    SpeechSynthesisUtterance: Utterance,
    Audio: FakeAudio,
  })) {
    const before = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (before) Object.defineProperty(globalThis, name, before);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  return { spoken, played };
}
test("browser fallback speaks short sentences sequentially and reports the currently spoken sentence", async (t) => {
  const { spoken } = installAudioFakes(t);
  const visible: string[] = [];
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ provider: "browser" }),
  );
  await new TutorVoice().textToSpeech("Hello! What is your favorite animal?", {
    onSentence: (s) => visible.push(s),
  });
  assert.deepEqual(spoken, ["Hello!", "What is your favorite animal?"]);
  assert.deepEqual(visible, spoken);
});
test("configured ElevenLabs playback goes through same-origin audio and falls back on failure", async (t) => {
  const { spoken, played } = installAudioFakes(t);
  const urls: string[] = [];
  let fail = false;
  let fallbacks = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      urls.push(url);
      if (init?.method !== "POST")
        return Response.json({ provider: "elevenlabs" });
      if (fail) return Response.json({ error: "unavailable" }, { status: 502 });
      assert.deepEqual(Object.keys(JSON.parse(String(init.body))).sort(), [
        "guardianAcknowledged",
        "text",
      ]);
      return new Response(new Uint8Array([73, 68, 51]), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    },
  );
  const voice = new TutorVoice();
  await voice.textToSpeech("Hello!");
  assert.equal(spoken.length, 0);
  assert.equal(played.length, 1);
  assert.ok(played[0].startsWith("blob:"));
  assert.ok(urls.every((url) => url === "/api/tts"));
  fail = true;
  await voice.textToSpeech("How are you?", { onFallback: () => fallbacks++ });
  assert.equal(fallbacks, 1);
  assert.deepEqual(spoken, ["How are you?"]);
  fail = false;
  await voice.textToSpeech("Can you find the bus?");
  assert.equal(played.length, 2, "a temporary failure must not permanently replace Sam's Voice");
});
test("cancelling custom speech aborts generation and never starts playback", async (t) => {
  const { played } = installAudioFakes(t);
  let signal: AbortSignal | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) =>
        signal!.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    },
  );
  const voice = new ElevenLabsVoiceProvider();
  const pending = voice.textToSpeech("Hello");
  voice.cancel();
  await pending;
  assert.equal(signal?.aborted, true);
  assert.deepEqual(played, []);
});

test("starting My Town after another lesson cannot mistake silent activation for completed speech", async (t) => {
  const { played } = installAudioFakes(t);
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? new Response(new Uint8Array([73, 68, 51]), { headers: { "Content-Type": "audio/mpeg" } })
      : Response.json({ provider: "elevenlabs" }),
  );
  const voice = new TutorVoice();
  await voice.textToSpeech("What food can you see?");
  voice.unlock();
  const started: string[] = [];
  await voice.textToSpeech("What places and things can you see in this town?", {
    onSentence: (text) => started.push(text),
  });
  assert.equal(played.filter((src) => src.startsWith("blob:")).length, 2);
  assert.deepEqual(started, ["What places and things can you see in this town?"]);
});

test("older mobile browsers without Intl.Segmenter retain the full spoken question", (t) => {
  t.mock.property(Intl, "Segmenter", undefined);
  assert.deepEqual(speechSentences("Look at the town. What can you see?"), ["Look at the town. What can you see?"]);
});

test("mobile autoplay rejection settles promptly and preserves custom voice for a fresh tap", async (t) => {
  const { spoken, played } = installAudioFakes(t);
  const originalPlay = Audio.prototype.play;
  let blocked = true;
  t.mock.method(Audio.prototype, "play", function (this: HTMLAudioElement) {
    if (blocked && this.src.startsWith("blob:")) return Promise.reject(new DOMException("Tap to play", "NotAllowedError"));
    return originalPlay.call(this);
  });
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? new Response(new Uint8Array([73, 68, 51]), { headers: { "Content-Type": "audio/mpeg" } })
      : Response.json({ provider: "elevenlabs" }),
  );
  const voice = new TutorVoice();
  await assert.rejects(voice.textToSpeech("Can you find the bus?"), { name: "NotAllowedError" });
  assert.deepEqual(spoken, []);
  blocked = false;
  voice.unlock();
  await voice.textToSpeech("Can you find the bus?");
  assert.equal(played.filter((s) => s.startsWith("blob:")).length, 1);
});

test("stalled audio startup releases the pending request within twelve seconds", async (t) => {
  installAudioFakes(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    signal = init.signal as AbortSignal;
    return new Promise<Response>((_resolve, reject) => signal!.addEventListener("abort", () => reject(new Error("aborted"))));
  });
  const pending = new ElevenLabsVoiceProvider().textToSpeech("Hello!");
  const rejected = assert.rejects(pending, /could not start/);
  t.mock.timers.tick(12000);
  await rejected;
  assert.equal(signal?.aborted, true);
});
