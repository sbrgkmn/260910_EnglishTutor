"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Clock3,
  Keyboard,
  Mic,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Student, Turn, TutorState } from "@/lib/types";
import type { Topic } from "@/lib/tutor/topics";
import { validateTutorReply } from "@/lib/tutor/validation";
import { formatTime } from "./report-view";
import type { VoiceProvider } from "@/lib/voice/types";
import { speechSentences } from "@/lib/voice";
import { Modal } from "./modal";
import { handsFreeSupported, listenHandsFree } from "@/lib/speech/hands-free";
export function Conversation({
  voice,
  initialTextMode = false,
  student,
  topic,
  demo,
  onEnd,
}: {
  voice: VoiceProvider;
  initialTextMode?: boolean;
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
  const [textMode, setTextMode] = useState(initialTextMode);
  const [sound, setSound] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [inputAvailable, setInputAvailable] = useState(true);
  const speechOutput = useRef(voice);
  const [currentSentence, setCurrentSentence] = useState("");
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
    const opening = setTimeout(() => {
      const handsFree = !initialTextMode && handsFreeSupported();
      autoVoiceRef.current = handsFree;
      setAutoVoice(handsFree);
      void send(true);
    }, 0);
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
      clearTimeout(opening);
      request.current?.abort();
      listening.current?.abort();
      output.cancel();
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function play(text: string) {
    setState("THINKING");
    try {
      await speechOutput.current.textToSpeech(text, {
        rate: student.level === "A1" ? 0.85 : 0.95,
        onStart: () => {
          if (mounted.current && !endingRef.current) setState("SPEAKING");
        },
        onSentence: (sentence) => {
          if (mounted.current && !endingRef.current)
            setCurrentSentence(sentence);
        },
        onFallback: () => {
          if (mounted.current)
            setVoiceNotice("Using the browser voice for now.");
        },
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
      setCurrentSentence(speechSentences(reply.message)[0] || reply.message);
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
  return (
    <main className="talk-screen">
      <div className="talk-context">
        <span>{topic.title}</span>
        <span aria-hidden>·</span>
        <span>{student.level}</span>
        {demo && <span className="demo-label">Demo · sample replies</span>}
      </div>
      <div
        className={`talk-portrait ${state === "SPEAKING" ? "is-speaking" : ""}`}
      >
        <img
          src="/teacher.jpg"
          alt="Your AI tutor, inspired by your teacher’s lessons"
        />
      </div>
      <div className="spoken-sentence" aria-live="polite">
        {currentSentence ||
          (state === "THINKING" ? "One moment…" : "Ready to talk?")}
      </div>
      <div className="talk-status" role="status">
        <span className={`state-dot ${state.toLowerCase()}`} />
        {ending
          ? "Finishing your practice…"
          : state === "LISTENING"
            ? speakingDetected
              ? "Listening…"
              : "Listening · take your time"
            : state === "THINKING"
              ? "Thinking…"
              : state === "SPEAKING"
                ? "Speaking…"
                : "Ready when you are"}
      </div>
      {(error || voiceNotice) && (
        <p className="talk-notice" role={error ? "alert" : "status"}>
          {error || voiceNotice}
        </p>
      )}
      {seconds >= 600 && (
        <p className="talk-notice">
          Ten minutes of practice. Finish your thought, then tap End.
        </p>
      )}
      <div className="talk-controls">
        {!textMode && (
          <div className="talk-mic">
            <button
              className={`mic-button ${state === "LISTENING" ? "is-listening" : ""}`}
              onClick={microphone}
              disabled={(!autoVoice && state !== "READY") || ending || !latest}
              aria-label={autoVoice ? "Pause microphone" : "Resume microphone"}
              aria-pressed={autoVoice}
            >
              {autoVoice ? <Square size={25} /> : <Mic size={29} />}
            </button>
            <span>{autoVoice ? "Tap to pause" : "Tap to speak"}</span>
          </div>
        )}
        {textMode && (
          <form
            className="text-practice"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="student-answer">Your answer</label>
            <div className="composer">
              <textarea
                id="student-answer"
                placeholder="Type your answer…"
                value={draft}
                maxLength={1800}
                rows={2}
                onChange={(e) => setDraft(e.target.value)}
                disabled={ending || state === "THINKING"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="submit"
                aria-label="Send answer"
                disabled={
                  !draft.trim() || state !== "READY" || ending || !latest
                }
              >
                <ArrowUp size={21} />
              </button>
            </div>
          </form>
        )}
        {!textMode && draft && state === "LISTENING" && (
          <p className="heard-words">{draft}</p>
        )}
        {!latest && error && (
          <button
            className="quiet"
            onClick={() => void send(true)}
            disabled={state !== "READY" || ending}
          >
            Try again
          </button>
        )}
        <div className="talk-footer">
          <span
            className="talk-timer"
            aria-label={`Conversation duration ${formatTime(seconds)}`}
          >
            <Clock3 size={16} />
            {formatTime(seconds)}
          </span>
          <button
            className="quiet end-talk"
            onClick={() => void end()}
            disabled={ending}
          >
            End
          </button>
        </div>
      </div>
      <div className="talk-secondary">
        <button className="quiet" onClick={() => setTranscript(true)}>
          <BookOpen size={16} />
          Transcript
        </button>
        <button
          className="quiet"
          onClick={toggleMode}
          disabled={
            (state !== "READY" && state !== "LISTENING") ||
            ending ||
            (!inputAvailable && textMode)
          }
        >
          {textMode ? <Mic size={16} /> : <Keyboard size={16} />}{" "}
          {textMode ? "Voice mode" : "Text mode"}
        </button>
        <button
          className="quiet icon-control"
          aria-label={sound ? "Mute tutor" : "Enable tutor voice"}
          onClick={toggleSound}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
      <p className="talk-disclosure">AI practice tutor · Synthetic voice</p>
      {transcript && (
        <Modal title="Your conversation" onClose={() => setTranscript(false)}>
          <div className="transcript transcript-sheet">
            {turns.map((turn, i) => (
              <div className="transcript-turn" key={i}>
                <strong>
                  {turn.role === "user" ? student.name : "AI tutor"}
                </strong>
                <p>{turn.content}</p>
              </div>
            ))}
          </div>
          <button
            className="quiet"
            onClick={() => void replay()}
            disabled={state !== "READY" || ending || !latest}
          >
            <Volume2 size={16} />
            Hear the latest reply again
          </button>
        </Modal>
      )}
    </main>
  );
}
