"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Keyboard,
  LoaderCircle,
  MessageCircle,
  Mic,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Student, Turn, TutorState } from "@/lib/types";
import type { Topic } from "@/lib/tutor/topics";
import { validateTutorReply } from "@/lib/tutor/validation";
import { TopicIcon } from "./icons";
import { formatTime } from "./report-view";
import { BrowserTextToSpeech } from "@/lib/speech/browser";
import { handsFreeSupported, listenHandsFree } from "@/lib/speech/hands-free";
export function Conversation({
  student,
  topic,
  demo,
  onEnd,
}: {
  student: Student;
  topic: Topic;
  demo: boolean;
  onEnd: (turns: Turn[], duration: number) => Promise<void>;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, updateState] = useState<TutorState>("READY");
  const stateRef = useRef<TutorState>("READY");
  function setState(next: TutorState) {
    stateRef.current = next;
    updateState(next);
  }
  const [draft, updateDraft] = useState("");
  const draftRef = useRef("");
  function setDraft(value: string) {
    draftRef.current = value;
    updateDraft(value);
  }
  const turnsRef = useRef<Turn[]>([]);
  const endingRef = useRef(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const autoVoiceRef = useRef(false);
  const [speakingDetected, setSpeakingDetected] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [sound, setSound] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [inputAvailable, setInputAvailable] = useState(true);
  const speechOutput = useRef(new BrowserTextToSpeech());
  const listening = useRef<AbortController | null>(null);
  const soundEnabled = useRef(true);
  const request = useRef<AbortController | null>(null);
  const started = useRef(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const latest = [...turns].reverse().find((t) => t.role === "assistant");
  useEffect(() => {
    mounted.current = true;
    started.current = Date.now();
    if (!handsFreeSupported()) {
      setInputAvailable(false);
      setTextMode(true);
      setVoiceNotice(
        "Speech input isn’t supported in this browser. Text mode is ready to use.",
      );
    }
    if (!speechOutput.current.supported()) {
      setSound(false);
      soundEnabled.current = false;
    }
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started.current) / 1000)),
      1000,
    );
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    const hide = () => {
      if (document.hidden && autoVoiceRef.current) {
        pauseVoice();
        setVoiceNotice(
          "Conversation paused while this tab is hidden. Tap the microphone when you’re ready.",
        );
      }
    };
    document.addEventListener("visibilitychange", hide);
    const output = speechOutput.current;
    return () => {
      mounted.current = false;
      autoVoiceRef.current = false;
      clearInterval(timer);
      request.current?.abort();
      listening.current?.abort();
      output.cancel();
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function play(text: string) {
    setState("SPEAKING");
    try {
      await speechOutput.current.textToSpeech(text, {
        rate: student.level === "A1" ? 0.85 : 0.95,
      });
    } catch (e) {
      if (mounted.current)
        setVoiceNotice(
          e instanceof Error ? e.message : "You can read the tutor’s reply.",
        );
    }
  }
  function toggleSound() {
    const enabled = !soundEnabled.current;
    soundEnabled.current = enabled;
    setSound(enabled);
    if (!enabled) speechOutput.current.cancel();
  }
  async function replay() {
    if (busy.current || state !== "READY" || !latest || ending) return;
    busy.current = true;
    setVoiceNotice("");
    await play(latest.content);
    if (mounted.current) {
      setState("READY");
      busy.current = false;
    }
  }
  function pauseVoice() {
    autoVoiceRef.current = false;
    setAutoVoice(false);
    listening.current?.abort();
    listening.current = null;
    setSpeakingDetected(false);
    if (stateRef.current === "LISTENING") setState("READY");
  }
  function toggleMode() {
    pauseVoice();
    setTextMode(!textMode);
  }
  function microphone() {
    if (autoVoiceRef.current) {
      pauseVoice();
      return;
    }
    if (busy.current || endingRef.current || stateRef.current !== "READY")
      return;
    autoVoiceRef.current = true;
    setAutoVoice(true);
    setVoiceNotice("");
    setError("");
    startListening();
  }
  function startListening() {
    if (
      !mounted.current ||
      !autoVoiceRef.current ||
      busy.current ||
      endingRef.current ||
      stateRef.current !== "READY"
    )
      return;
    const controller = new AbortController();
    listening.current = controller;
    setState("LISTENING");
    setSpeakingDetected(false);
    const prefix = draftRef.current.trim();
    void listenHandsFree(
      {
        onText: (text) => {
          if (!controller.signal.aborted)
            setDraft([prefix, text].filter(Boolean).join(" ").slice(0, 1800));
        },
        onSpeaking: (value) => {
          if (!controller.signal.aborted) setSpeakingDetected(value);
        },
        onComplete: (text) => {
          if (
            controller.signal.aborted ||
            !mounted.current ||
            !autoVoiceRef.current
          )
            return;
          listening.current = null;
          setSpeakingDetected(false);
          setState("READY");
          void send(
            false,
            [prefix, text].filter(Boolean).join(" ").slice(0, 1800),
          );
        },
        onError: (message) => {
          if (controller.signal.aborted || !mounted.current) return;
          pauseVoice();
          setVoiceNotice(message);
        },
      },
      controller.signal,
    );
  }
  async function send(opening = false, spoken?: string) {
    if (
      busy.current ||
      stateRef.current !== "READY" ||
      endingRef.current ||
      (!opening && !(spoken ?? draftRef.current).trim())
    )
      return;
    busy.current = true;
    setError("");
    setState("THINKING");
    const pending: Turn[] = opening
      ? []
      : [
          ...turnsRef.current,
          { role: "user", content: (spoken ?? draftRef.current).trim() },
        ];
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(50000),
        ]),
        body: JSON.stringify({
          student,
          topicId: topic.id,
          turns: pending,
          demo,
          guardianAcknowledged: true,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The tutor could not connect.");
      const reply = validateTutorReply(data);
      if (!mounted.current || controller.signal.aborted || endingRef.current)
        return;
      const nextTurns: Turn[] = [
        ...pending,
        {
          role: "assistant",
          content: reply.message,
          corrections: reply.corrections,
          vocabulary: reply.newVocabulary,
        },
      ];
      turnsRef.current = nextTurns;
      setTurns(nextTurns);
      setDraft("");
      if (soundEnabled.current && !controller.signal.aborted)
        await play(reply.message);
    } catch (e) {
      if (!controller.signal.aborted && mounted.current) {
        pauseVoice();
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      if (mounted.current) {
        setState("READY");
        busy.current = false;
      }
    }
  }
  async function end() {
    if (endingRef.current) return;
    endingRef.current = true;
    pauseVoice();
    setEnding(true);
    request.current?.abort();
    listening.current?.abort();
    speechOutput.current.cancel();
    await onEnd(
      turnsRef.current,
      Math.floor((Date.now() - started.current) / 1000),
    );
  }
  useEffect(() => {
    if (
      !autoVoice ||
      textMode ||
      state !== "READY" ||
      !latest ||
      ending ||
      error
    )
      return;
    // A small gap lets speaker audio decay before reopening the microphone.
    const timer = setTimeout(() => startListening(), 450);
    return () => clearTimeout(timer);
  }, [autoVoice, textMode, state, latest, ending, error]);
  const statusLabel = {
    READY: latest ? "Your turn. Take your time." : "Ready when you are.",
    LISTENING: speakingDetected
      ? "I’m listening…"
      : draft
        ? "A short pause sends your answer."
        : "Go ahead, I’m listening.",
    THINKING: "Thinking of a reply…",
    SPEAKING: "Your tutor is speaking…",
  }[state];
  return (
    <main className="conversation-main">
      <div className="session-top">
        <div className="session-title">
          <span className={`topic-icon ${topic.color}`}>
            <TopicIcon name={topic.icon} />
          </span>
          <div>
            <span className="eyebrow">LET’S TALK ABOUT</span>
            <h1>{topic.title}</h1>
          </div>
        </div>
        <div className="session-meta">
          <span className="level-badge">{student.level}</span>
          <span>{student.name}</span>
          <span className="session-timer">
            <Clock3 size={16} />
            {formatTime(seconds)} <small>/ 10:00</small>
          </span>
          <button className="end-button" onClick={end} disabled={ending}>
            {ending ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Square size={13} />
            )}{" "}
            {ending ? "Making your recap…" : "End session"}
          </button>
        </div>
      </div>
      {demo && (
        <div className="demo-banner">
          <Sparkles size={15} />
          <span>
            Demo mode · Sample replies let you explore. Connect an API key for
            real AI conversations and corrections.
          </span>
        </div>
      )}
      <div className="conversation-grid">
        <section
          className={`tutor-portrait ${state === "SPEAKING" ? "speaking" : ""}`}
        >
          <img
            src="/teacher.jpg"
            alt="The teacher whose lessons inspire your AI English tutor"
          />
          <div className="portrait-shade" />
          <span className="ai-badge">
            <Sparkles size={13} /> AI PRACTICE TUTOR
          </span>
          <div className="portrait-caption">
            <h2>
              A friendly face.
              <br />A space to speak.
            </h2>
            <p>
              Inspired by your teacher’s lessons.
              <br />
              An AI tutor, with a voice of its own.
            </p>
          </div>
          <button
            className="sound-button"
            aria-label={sound ? "Mute tutor" : "Enable tutor voice"}
            onClick={toggleSound}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </section>
        <section className="conversation-panel">
          <div className="conversation-panel-top">
            <span>
              <MessageCircle size={17} /> Your conversation
            </span>
            <button
              className="quiet"
              onClick={() => setTranscript(!transcript)}
            >
              <BookOpen size={16} />
              {transcript ? "Hide" : "Show"} transcript
            </button>
          </div>
          <div className="message-space" aria-live="polite">
            <span className={`state-label ${state.toLowerCase()}`}>
              <span />
              {state === "READY" ? "READY" : state}
            </span>
            <div className="tutor-message">
              {latest?.content || "A little conversation starts with a hello."}
            </div>
            {state === "THINKING" && (
              <div className="thinking-dots">
                <i />
                <i />
                <i />
              </div>
            )}
            {latest && speechOutput.current.supported() && (
              <button
                className="quiet replay-button"
                onClick={() => void replay()}
                disabled={state !== "READY" || ending}
              >
                <Volume2 size={15} /> Hear again
              </button>
            )}
            {latest?.corrections?.length ? (
              <div className="correction-note">
                <Check size={15} /> A little correction, a little progress.
              </div>
            ) : null}
          </div>
          {transcript && (
            <div
              className="transcript"
              tabIndex={0}
              aria-label="Conversation transcript"
            >
              {turns.length ? (
                turns.map((t, i) => (
                  <div className={`transcript-turn ${t.role}`} key={i}>
                    <strong>
                      {t.role === "user" ? student.name : "AI tutor"}
                    </strong>
                    <p>{t.content}</p>
                  </div>
                ))
              ) : (
                <p>Your conversation will appear here.</p>
              )}
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error} Your message is kept below so you can try again.
            </div>
          )}
          {voiceNotice && (
            <div className="notice" role="status">
              {voiceNotice}
            </div>
          )}
          {seconds >= 600 && (
            <div className="notice">
              That’s about ten minutes of practice. Finish your thought, then
              end the session for your recap.
            </div>
          )}
          <div className="input-area">
            {!latest ? (
              <div className="begin-area">
                <p>{statusLabel}</p>
                <button
                  className="primary"
                  onClick={() => send(true)}
                  disabled={state !== "READY" || ending}
                >
                  {state === "THINKING" ? (
                    <LoaderCircle size={19} className="spin" />
                  ) : (
                    <MessageCircle size={19} />
                  )}{" "}
                  Say hello
                </button>
              </div>
            ) : (
              <>
                <div className="input-switch">
                  <span>{statusLabel}</span>
                  <button
                    className="quiet"
                    onClick={toggleMode}
                    disabled={
                      (state !== "READY" && state !== "LISTENING") ||
                      (!inputAvailable && textMode) ||
                      ending
                    }
                  >
                    {textMode ? <Mic size={15} /> : <Keyboard size={15} />}{" "}
                    {textMode ? "Voice mode" : "Text mode"}
                  </button>
                </div>
                {!textMode && (
                  <div className="mic-area">
                    <button
                      className={`mic-button ${state === "LISTENING" ? "is-listening" : ""}`}
                      onClick={microphone}
                      disabled={(!autoVoice && state !== "READY") || ending}
                      aria-label={
                        autoVoice
                          ? "Pause conversation"
                          : "Start hands-free conversation"
                      }
                    >
                      {autoVoice ? <Square size={25} /> : <Mic size={28} />}
                    </button>
                    <p>
                      {autoVoice
                        ? "Hands-free is on · Tap to pause"
                        : "Start hands-free conversation"}
                    </p>
                  </div>
                )}
                {!textMode && autoVoice ? (
                  <div className="live-voice-draft">
                    <span>
                      {state === "LISTENING"
                        ? "YOUR WORDS"
                        : "HANDS-FREE CONVERSATION"}
                    </span>
                    <p>
                      {draft ||
                        (state === "LISTENING"
                          ? "Speak naturally. I’ll wait for a 3-second pause."
                          : "Listening resumes after the tutor’s reply.")}
                    </p>
                  </div>
                ) : (
                  <>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                      }}
                      className="composer"
                    >
                      <textarea
                        aria-label="Your message"
                        placeholder={
                          textMode
                            ? "Type your answer here…"
                            : "Your words will appear here…"
                        }
                        value={draft}
                        maxLength={1800}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        disabled={
                          ending ||
                          state === "THINKING" ||
                          state === "LISTENING"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                      />
                      <button
                        type="submit"
                        aria-label="Send message"
                        disabled={!draft.trim() || state !== "READY" || ending}
                      >
                        <ArrowUp size={21} />
                      </button>
                    </form>
                    <div className="composer-hint">
                      <span>
                        {textMode
                          ? "Enter to send · Shift + Enter for a new line"
                          : "Resume the microphone for hands-free practice."}
                      </span>
                      <span>{draft.length}/1800</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      <div className="conversation-foot">
        <span>
          <Check size={15} /> There’s no rush. Mistakes help us learn.
        </span>
        <span>
          {textMode ? "Text mode" : "Hands-free voice"}
          <ChevronDown size={13} />
        </span>
      </div>
    </main>
  );
}
