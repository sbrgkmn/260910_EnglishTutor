import test from "node:test";
import assert from "node:assert/strict";
import {
  BrowserSpeechToText,
  BrowserTextToSpeech,
} from "../lib/speech/browser";
test("speech services gracefully report unsupported server/browser environments", async () => {
  const input = new BrowserSpeechToText();
  const output = new BrowserTextToSpeech();
  assert.equal(input.supported(), false);
  assert.equal(output.supported(), false);
  assert.throws(
    () => input.speechToText({ onText() {}, onEnd() {}, onError() {} }),
    /text mode/,
  );
  await assert.rejects(() => output.textToSpeech("Hello"), /read the tutor/);
});
test("recognition keeps partial speech editable, waits for explicit stop, and detaches on cancel", () => {
  let active: FakeRecognition;
  class FakeRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult:
      | ((e: {
          results: { isFinal: boolean; 0: { transcript: string } }[];
        }) => void)
      | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    constructor() {
      active = this;
    }
    start() {}
    stop() {
      this.onend?.();
    }
    abort() {
      this.onend?.();
    }
  }
  Object.defineProperty(globalThis, "window", {
    value: { SpeechRecognition: FakeRecognition },
    configurable: true,
  });
  try {
    let text = "";
    let ends = 0;
    const input = new BrowserSpeechToText();
    const session = input.speechToText({
      onText: (v) => (text = v),
      onEnd: () => ends++,
      onError() {},
    });
    active!.onresult?.({
      results: [{ isFinal: false, 0: { transcript: "I like dolphins" } }],
    });
    assert.equal(text, "I like dolphins");
    assert.equal(ends, 0);
    assert.equal(active!.continuous, true);
    session.stop();
    assert.equal(ends, 1);
    const next = input.speechToText({
      onText: (v) => (text = v),
      onEnd: () => ends++,
      onError() {},
    });
    next.cancel();
    assert.equal(active!.onresult, null);
    assert.equal(ends, 1);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
