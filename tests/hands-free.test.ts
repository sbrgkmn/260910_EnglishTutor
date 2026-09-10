import test from "node:test";
import assert from "node:assert/strict";
import { SilenceGate, listenHandsFree } from "../lib/speech/hands-free";
import type { SpeechToTextService } from "../lib/speech/types";

test("silence needs words and three seconds, and resumed speech resets the pause", () => {
  const gate = new SilenceGate();
  assert.equal(gate.ready(10000, ""), false);
  assert.equal(gate.ready(10000, "hello"), false);
  gate.activity(100);
  assert.equal(gate.ready(3099, "hello"), false);
  gate.activity(2800);
  assert.equal(gate.ready(5799, "hello"), false);
  assert.equal(gate.ready(5800, "hello"), true);
  assert.equal(gate.ready(5800, "  "), false);
});

test("hands-free flushes final words once, restarts recognition without losing words, and releases the mic", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  let now = 0;
  t.mock.method(performance, "now", () => now);
  let volume = 0;
  let trackStops = 0;
  let contextCloses = 0;
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const savedNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  class FakeContext {
    state = "running";
    resume() {
      return Promise.resolve();
    }
    close() {
      this.state = "closed";
      contextCloses++;
      return Promise.resolve();
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        getFloatTimeDomainData(data: Float32Array) {
          data.fill(volume);
        },
      };
    }
    createMediaStreamSource() {
      return { connect() {} };
    }
  }
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { AudioContext: FakeContext, SpeechRecognition: class {} },
  });
  const originalContext = Object.getOwnPropertyDescriptor(
    globalThis,
    "AudioContext",
  );
  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: FakeContext,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => ({
          getTracks: () => [
            {
              stop() {
                trackStops++;
              },
            },
          ],
        }),
      },
    },
  });
  let callbacks!: Parameters<SpeechToTextService["speechToText"]>[0];
  let starts = 0;
  let stops = 0;
  const input: SpeechToTextService = {
    supported: () => true,
    speechToText(cb) {
      callbacks = cb;
      starts++;
      return {
        cancel() {},
        stop() {
          stops++;
          cb.onText("and cats.");
          cb.onEnd();
        },
      };
    },
  };
  const answers: string[] = [];
  const errors: string[] = [];
  const options = {
    onText() {},
    onSpeaking() {},
    onComplete: (text: string) => answers.push(text),
    onError: (message: string) => errors.push(message),
  };
  const tick = (ms: number) => {
    now += ms;
    t.mock.timers.tick(ms);
  };
  try {
    const controller = new AbortController();
    await listenHandsFree(options, controller.signal, input);
    tick(4000);
    assert.equal(answers.length, 0); // Empty silence does nothing.
    callbacks.onText("I like dogs");
    volume = 0.1;
    tick(50);
    volume = 0;
    tick(2000);
    assert.equal(stops, 0);
    callbacks.onEnd();
    tick(200);
    assert.equal(starts, 2); // Browser ended early.
    callbacks.onText("and");
    tick(2900);
    assert.equal(stops, 0);
    volume = 0.1;
    tick(50);
    volume = 0; // More speech delays sending.
    tick(2999);
    assert.equal(stops, 0);
    tick(51);
    assert.equal(stops, 1);
    assert.deepEqual(answers, ["I like dogs and cats."]);
    tick(5000);
    assert.equal(answers.length, 1);
    assert.equal(trackStops, 1);
    assert.equal(contextCloses, 1);
    const paused = new AbortController();
    await listenHandsFree(options, paused.signal, input);
    callbacks.onText("do not send this");
    paused.abort();
    tick(5000);
    assert.equal(answers.length, 1);
    assert.equal(trackStops, 2);
    const timedOut = new AbortController();
    await listenHandsFree(options, timedOut.signal, input);
    const before = starts;
    callbacks.onError("No speech", "no-speech");
    callbacks.onEnd();
    tick(200);
    assert.equal(starts, before + 1);
    assert.deepEqual(errors, []);
    callbacks.onError("Connection failed", "network");
    tick(5000);
    assert.deepEqual(errors, ["Connection failed"]);
    assert.equal(trackStops, 3);
  } finally {
    for (const [key, descriptor] of [
      ["window", savedWindow],
      ["navigator", savedNavigator],
      ["AudioContext", originalContext],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
