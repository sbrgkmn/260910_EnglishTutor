import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { listenHandsFree } from "../lib/speech/hands-free";
import { ElevenLabsVoiceProvider } from "../lib/voice/elevenlabs";
import type { SpeechToTextService } from "../lib/speech/types";

function microphone(t: TestContext) {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  let now = 0;
  t.mock.method(performance, "now", () => now);
  const h = {
    volume: 0, contexts: 0, closes: 0, trackStops: 0, plays: 0, mediaPlays: 0,
    autoStart: true, endOnStop: true, sourceStops: 0, sourceDisconnects: 0,
    streams: [] as { readyState: string; muted: boolean; stop(): void }[],
    sessions: [] as Parameters<SpeechToTextService["speechToText"]>[0][],
    answers: [] as string[], errors: [] as string[], status: [] as string[],
    events: [] as string[], levels: [] as number[],
    context: undefined as FakeContext | undefined,
    advance(ms: number) {
      for (let remaining = ms; remaining > 0;) {
        const step = Math.min(50, remaining);
        now += step; remaining -= step;
        t.mock.timers.tick(step);
      }
    },
    current() { return h.sessions.at(-1)!; },
    async flush() { for (let i = 0; i < 16; i++) await Promise.resolve(); },
  };
  class FakeContext {
    state = "running";
    destination = {};
    constructor() { h.contexts++; h.context = this; }
    resume() { this.state = "running"; return Promise.resolve(); }
    close() { h.closes++; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 2 }); }
    createBufferSource() {
      const source = {
        buffer: null, onended: null as (() => void) | null,
        connect() {}, disconnect() { h.sourceDisconnects++; },
        start() { h.plays++; queueMicrotask(() => source.onended?.()); },
        stop() { h.sourceStops++; },
      };
      return source;
    }
    createAnalyser() {
      return { fftSize: 2048, disconnect() {}, getFloatTimeDomainData(data: Float32Array) { data.fill(h.volume); } };
    }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  }
  const capture = async () => {
    const track = { readyState: "live", muted: false, stop() { this.readyState = "ended"; h.trackStops++; } };
    h.streams.push(track);
    return { getTracks: () => [track] } as unknown as MediaStream;
  };
  for (const [key, value] of Object.entries({
    window: { AudioContext: FakeContext, SpeechRecognition: class {} },
    navigator: { mediaDevices: { getUserMedia: capture } },
    Audio: class { play() { h.mediaPlays++; return Promise.resolve(); } },
  })) {
    const before = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (before) Object.defineProperty(globalThis, key, before); else Reflect.deleteProperty(globalThis, key); });
  }
  const input: SpeechToTextService = {
    supported: () => true,
    speechToText(cb) {
      h.sessions.push(cb);
      if (h.autoStart) cb.onStart?.();
      return { cancel() {}, stop() { if (h.endOnStop) cb.onEnd(); } };
    },
  };
  const options = {
    onText() {}, onSpeaking() {},
    onComplete: (answer: string) => h.answers.push(answer),
    onError: (error: string) => h.errors.push(error),
    onStatus: (status: string) => h.status.push(status),
    onLevel: (level: number) => h.levels.push(level),
    onDiagnostic: ({ event, detail }: { event: string; detail?: string }) => h.events.push([event, detail].filter(Boolean).join(":")),
  };
  function listen(controller = new AbortController()) {
    t.after(() => controller.abort());
    return listenHandsFree(options, controller.signal, input);
  }
  return Object.assign(h, { listen, capture });
}

test("twelve spoken answers alternate with teacher playback using one unlocked context and release every microphone", async (t) => {
  const h = microphone(t);
  t.mock.method(globalThis, "fetch", async () => new Response(new Uint8Array([73, 68, 51]), { headers: { "Content-Type": "audio/mpeg" } }));
  const voice = new ElevenLabsVoiceProvider();
  voice.unlock();
  let starts = 0;
  for (let i = 0; i < 12; i++) {
    await voice.textToSpeech(`Question ${i + 1}`, { onStart: () => starts++ });
    await h.listen();
    assert.equal(h.status.at(-1), "listening");
    h.volume = 0.06; h.advance(700);
    h.current().onText(`Answer ${i + 1}`);
    h.volume = 0; h.advance(3000);
    assert.equal(h.answers.length, i + 1);
    assert.equal(h.answers[i], `Answer ${i + 1}`);
    assert.equal(h.streams[i].readyState, "ended");
  }
  assert.equal(starts, 12);
  assert.equal(h.plays, 12);
  assert.equal(h.contexts, 1);
  assert.equal(h.closes, 0);
  assert.equal(h.mediaPlays, 0, "avoid the HTML media/Safari recognition interaction");
  assert.equal(h.trackStops, 12);
  assert.ok(h.levels.some((level) => level > 0.5));
  assert.deepEqual(h.errors, []);
});

test("sound without transcripts restarts recognition and ignores late events from the old session", async (t) => {
  const h = microphone(t);
  await h.listen();
  const stale = h.current();
  h.volume = 0.06; h.advance(7000);
  assert.ok(h.events.includes("recognition-restart:sound-without-words"));
  assert.equal(h.status.at(-1), "reconnecting");
  h.advance(500);
  assert.equal(h.sessions.length, 2);
  stale.onText("old words"); stale.onError("old failure", "not-allowed"); stale.onEnd();
  h.current().onText("I see a bus."); h.volume = 0; h.advance(3000);
  assert.deepEqual(h.answers, ["I see a bus."]);
  assert.deepEqual(h.errors, []);
});

test("stalled recognition has startup and quiet-session deadlines instead of endless Listening", async (t) => {
  const h = microphone(t);
  h.autoStart = false;
  await h.listen();
  assert.equal(h.status.at(-1), "starting");
  h.advance(6000);
  assert.ok(h.events.includes("recognition-restart:start-timeout"));
  h.autoStart = true; h.advance(500);
  assert.equal(h.status.at(-1), "listening");
  h.advance(20000);
  assert.ok(h.events.includes("recognition-restart:recognition-unresponsive"));
});

test("network failures retry twice and then keep the answer editable with an actionable error", async (t) => {
  const h = microphone(t);
  await h.listen();
  for (let i = 0; i < 3; i++) {
    h.current().onError("Network failed", "network");
    h.advance(1000);
  }
  assert.equal(h.sessions.length, 3);
  assert.equal(h.errors.length, 1);
  assert.match(h.errors[0], /Tap Speak/);
  assert.equal(h.status.at(-1), "idle");
  assert.equal(h.trackStops, 1);
});

test("missing final onend still submits captured words exactly once", async (t) => {
  const h = microphone(t); h.endOnStop = false;
  await h.listen();
  h.current().onText("The bus is yellow.");
  h.advance(3000);
  assert.equal(h.answers.length, 0);
  h.advance(4500);
  h.current().onEnd();
  h.advance(10000);
  assert.deepEqual(h.answers, ["The bus is yellow."]);
  assert.equal(h.trackStops, 1);
});

test("interrupted phone audio cannot leave a pending resume stuck indefinitely", async (t) => {
  const h = microphone(t);
  await h.listen();
  h.context!.state = "interrupted";
  h.context!.resume = () => new Promise(() => {});
  h.advance(50);
  assert.equal(h.status.at(-1), "reconnecting");
  h.advance(4000); await h.flush();
  assert.equal(h.errors.length, 1);
  assert.match(h.errors[0], /Tap Speak/);
  assert.equal(h.trackStops, 1);
});

test("muted or disconnected microphone tracks stop listening and offer recovery", async (t) => {
  const h = microphone(t);
  await h.listen();
  h.streams[0].muted = true;
  h.advance(4100);
  assert.ok(h.events.includes("track-muted"));
  assert.equal(h.errors.length, 1);
  await h.listen();
  h.streams[1].readyState = "ended";
  h.advance(50);
  assert.ok(h.events.includes("track-ended"));
  assert.equal(h.errors.length, 2);
});

test("permission resolved after cancellation releases the late microphone without starting recognition", async (t) => {
  const h = microphone(t);
  let grant!: (stream: MediaStream) => void;
  t.mock.method(navigator.mediaDevices, "getUserMedia", () => new Promise<MediaStream>((resolve) => { grant = resolve; }));
  const controller = new AbortController();
  const pending = h.listen(controller);
  controller.abort();
  await pending;
  grant(await h.capture()); await h.flush();
  assert.equal(h.streams[0].readyState, "ended");
  assert.equal(h.sessions.length, 0);
  assert.deepEqual(h.answers, []);
  assert.deepEqual(h.errors, []);
});

test("a suspended context during microphone startup returns a retry action within four seconds", async (t) => {
  const h = microphone(t);
  new ElevenLabsVoiceProvider().unlock();
  h.context!.state = "suspended";
  h.context!.resume = () => new Promise(() => {});
  const pending = h.listen();
  await h.flush(); h.advance(4000); await pending;
  assert.equal(h.sessions.length, 0);
  assert.equal(h.errors.length, 1);
  assert.match(h.errors[0], /Tap Speak/);
  assert.equal(h.trackStops, 1);
});

test("cancelled Web Audio playback disconnects the source and a later question still plays", async (t) => {
  const h = microphone(t);
  t.mock.method(globalThis, "fetch", async () => new Response(new Uint8Array([73, 68, 51]), { headers: { "Content-Type": "audio/mpeg" } }));
  const voice = new ElevenLabsVoiceProvider();
  voice.unlock();
  const createSource = h.context!.createBufferSource.bind(h.context);
  h.context!.createBufferSource = () => ({ ...createSource(), start() { h.plays++; } });
  const pending = voice.textToSpeech("Can you find the bus?");
  await h.flush();
  assert.equal(h.plays, 1);
  voice.cancel(); await pending;
  assert.equal(h.sourceStops, 1);
  assert.equal(h.sourceDisconnects, 1);
  h.context!.createBufferSource = createSource;
  await voice.textToSpeech("What color is the bus?");
  assert.equal(h.plays, 2);
  assert.equal(h.mediaPlays, 0);
});
