"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Level, TutorState, Turn } from "../types";
import type { VoiceProvider } from "../voice/types";
import { speechSentences } from "../voice";
import { handsFreeSupported, listenHandsFree } from "../speech/hands-free";
import { generateActivity } from "../activities/generateActivity";
import { evaluateAnswer } from "../activities/evaluateAnswer";
import type {
  Activity,
  EvaluationResult,
  StudentAnswer,
} from "../activities/activityTypes";
import { applyAnswer, nextQuestion, startGame } from "./gameState";
export function useGameController({
  level,
  topicId,
  age,
  voice,
  initialTextMode,
  onExit,
}: {
  level: Level;
  topicId: string;
  age: number;
  voice: VoiceProvider;
  initialTextMode: boolean;
  onExit: () => void;
}) {
  const [game, setGame] = useState(() =>
    startGame(generateActivity(level, 0, topicId)),
  );
  const gameRef = useRef(game);
  const live = useRef(true);
  const run = useRef(0);
  const busy = useRef(true);
  const soundRef = useRef(true);
  const spokenText = useRef("");
  const input = useRef<AbortController | null>(null);
  const request = useRef<AbortController | null>(null);
  const imageRequest = useRef<AbortController | null>(null);
  const [state, setState] = useState<TutorState>("THINKING");
  const [sound, setSound] = useState(true);
  const [textMode, setTextMode] = useState(initialTextMode);
  const [auto, setAuto] = useState(!initialTextMode);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState("");
  const [sentence, setSentence] = useState("Let’s explore!");
  const [notice, setNotice] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selected, setSelected] = useState<string>();
  const [feedback, setFeedback] = useState<EvaluationResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [memoryHidden, setMemoryHidden] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [feedbackSource, setFeedbackSource] = useState<"local" | "ai">("local");
  const submitRef = useRef<(a: StudentAnswer) => void>(() => {});
  const commit = (next: typeof game) => {
    gameRef.current = next;
    setGame(next);
  };
  async function speak(text: string, token: number) {
    if (!live.current || token !== run.current) return;
    spokenText.current = text;
    setSentence(speechSentences(text)[0] || text);
    setState("THINKING");
    setTurns((t) => [...t, { role: "assistant", content: text }]);
    if (!soundRef.current) {
      setSentence(text);
      return;
    }
    try {
      await voice.textToSpeech(text, {
        rate: level === "A1" ? 0.85 : 0.95,
        onStart: () => {
          if (live.current && token === run.current && soundRef.current)
            setState("SPEAKING");
        },
        onSentence: (s) => {
          if (live.current && token === run.current) setSentence(s);
        },
        onFallback: () => {
          if (live.current) setNotice("Using the browser voice for now.");
        },
      });
    } catch {
      if (live.current && token === run.current) {
        setSentence(text);
        setTextMode(true);
        setAuto(false);
        setNotice("Tap Hear again for the teacher’s voice, or type your answer to keep playing.");
      }
    } finally {
      if (live.current && token === run.current && !soundRef.current)
        setSentence(text);
    }
  }
  async function ask(token: number) {
    const q = gameRef.current.activity.questions[gameRef.current.index];
    setMemoryHidden(false);
    setFeedback(null);
    setSelected(undefined);
    await speak(q.prompt, token);
    if (!live.current || token !== run.current) return;
    busy.current = false;
    setState("READY");
  }
  async function replay() {
    if (busy.current) return;
    voice.unlock?.();
    busy.current = true;
    input.current?.abort();
    setListening(false);
    const token = ++run.current;
    setNotice("");
    await speak(spokenText.current || sentence, token);
    if (live.current && token === run.current) {
      busy.current = false;
      setState("READY");
    }
  }
  async function submit(answer: StudentAnswer) {
    if (busy.current || gameRef.current.completed || !live.current) return;
    if (answer.type !== "click" && !answer.text.trim()) return;
    busy.current = true;
    input.current?.abort();
    setListening(false);
    setDraft("");
    const token = ++run.current;
    const current = gameRef.current;
    const q = current.activity.questions[current.index];
    setFeedback(null);
    setSelected(answer.type === "click" ? answer.objectId : undefined);
    setState("THINKING");
    setTurns((t) => [
      ...t,
      {
        role: "user",
        content:
          answer.type === "click" ? `Tapped ${answer.objectId}` : answer.text,
      },
    ]);
    let result = evaluateAnswer(current.activity, q, answer);
    if (answer.type !== "click") {
      const controller = new AbortController();
      request.current = controller;
      try {
        const res = await fetch("/api/activity/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(18000),
          ]),
          body: JSON.stringify({
            level,
            topicId,
            age,
            variant: current.activity.variant,
            questionId: q.id,
            petChoice: q.id === "pet-followup" ? q.targetId : undefined,
            choiceId: q.id === "followup" ? q.targetId : undefined,
            answer,
            guardianAcknowledged: true,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.result) result = data.result;
      } catch {
        if (live.current && token === run.current)
          setNotice("We’re using practice feedback. Keep going!");
      }
    }
    if (!live.current || token !== run.current) return;
    setFeedbackSource(result.source);
    setFeedback(result);
    const updated = applyAnswer(current, q.id, answer, result);
    commit(updated);
    await speak(result.feedback, token);
    await new Promise((resolve) =>
      setTimeout(resolve, soundRef.current ? 250 : 1400),
    );
    if (!live.current || token !== run.current) return;
    if (!updated.answered.includes(q.id)) {
      busy.current = false;
      setState("READY");
      return;
    }
    const next = nextQuestion(updated);
    commit(next);
    if (next.completed) {
      setFeedback(null);
      await speak(
        `You earned ${next.earned} stars! What a lovely adventure.`,
        token,
      );
      if (live.current && token === run.current) {
        busy.current = false;
        setState("READY");
      }
    } else await ask(token);
  }
  submitRef.current = (answer) => {
    void submit(answer);
  };
  useEffect(() => {
    live.current = true;
    const token = ++run.current;
    if (!handsFreeSupported()) {
      setAuto(false);
      setTextMode(true);
    }
    const opening = setTimeout(() => void ask(token), 0);
    const started = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    const hide = () => {
      if (document.hidden) {
        setAuto(false);
        input.current?.abort();
        setListening(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      live.current = false;
      run.current++;
      clearTimeout(opening);
      clearInterval(timer);
      input.current?.abort();
      request.current?.abort();
      imageRequest.current?.abort();
      voice.cancel();
      document.removeEventListener("visibilitychange", hide);
    };
    // A Game is keyed by student level, so a changed level starts a fresh controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (
      state !== "READY" ||
      !auto ||
      textMode ||
      game.completed ||
      !handsFreeSupported()
    )
      return;
    const controller = new AbortController();
    input.current = controller;
    setListening(true);
    void listenHandsFree(
      {
        onText: setDraft,
        onSpeaking: () => {},
        onComplete: (text) => submitRef.current({ type: "speech", text }),
        onError: () => {
          if (!controller.signal.aborted) {
            setAuto(false);
            setTextMode(true);
            setListening(false);
            setNotice(
              "Try typing your answer, or allow your microphone and tap Speak.",
            );
          }
        },
      },
      controller.signal,
    );
    return () => {
      controller.abort();
      setListening(false);
    };
  }, [auto, textMode, state, game.index, game.completed]);
  useEffect(() => {
    if (game.activity.questions[game.index].type !== "memory" || game.completed)
      return;
    const timer = setTimeout(() => setMemoryHidden(true), 6000);
    return () => clearTimeout(timer);
  }, [game.index, game.activity, game.completed]);
  function stop() {
    run.current++;
    input.current?.abort();
    request.current?.abort();
    imageRequest.current?.abort();
    voice.cancel();
    busy.current = false;
  }
  async function newActivity(activity: Activity, reset = false) {
    stop();
    setListening(false);
    setState("THINKING");
    busy.current = true;
    commit(startGame(activity, reset ? 0 : gameRef.current.stars));
    setFeedback(null);
    setDraft("");
    await ask(run.current);
  }
  const fetchScene = useCallback(
    async (regenerate = false) => {
      if (gameRef.current.activity.scene.composition === "illustration") return;
      setImageLoading(true);
      const current = gameRef.current;
      const controller = new AbortController();
      imageRequest.current?.abort();
      imageRequest.current = controller;
      try {
        const res = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(95000),
          ]),
          body: JSON.stringify({
            level,
            topicId,
            variant: current.activity.variant,
            regenerate,
            guardianAcknowledged: true,
          }),
        });
        if (!res.ok) throw new Error();
        const activity: Activity = await res.json();
        if (
          live.current &&
          !controller.signal.aborted &&
          gameRef.current.activity.id === activity.id &&
          (regenerate || gameRef.current.answered.length === 0)
        )
          commit({
            ...gameRef.current,
            activity: { ...gameRef.current.activity, scene: activity.scene },
          });
      } catch {
        if (live.current && !controller.signal.aborted)
          setNotice("Our park picture is ready. Let’s keep playing.");
      } finally {
        if (live.current && imageRequest.current === controller)
          setImageLoading(false);
      }
    },
    [level, topicId],
  );
  return {
    game,
    feedbackSource,
    state: listening ? ("LISTENING" as const) : state,
    feedback,
    sentence,
    seconds,
    draft,
    setDraft,
    turns,
    selected,
    notice,
    textMode,
    sound,
    auto,
    memoryHidden,
    imageLoading,
    fetchScene,
    submit: (a: StudentAnswer) => submitRef.current(a),
    toggleMic: () => {
      if (!handsFreeSupported()) {
        setTextMode(true);
        setNotice(
          "Your browser supports typing. Try Chrome to use the microphone.",
        );
        return;
      }
      setTextMode(false);
      setAuto((v) => !v);
      voice.unlock?.();
    },
    toggleText: () => {
      setAuto(false);
      input.current?.abort();
      setListening(false);
      // Switching to typing is also an escape from blocked/slow audio playback.
      if (!textMode) voice.cancel();
      setTextMode((v) => !v);
    },
    toggleSound: () => {
      soundRef.current = !soundRef.current;
      setSound(soundRef.current);
      if (!soundRef.current) {
        voice.cancel();
        setSentence(spokenText.current || sentence);
      } else {
        void replay();
      }
    },
    replay,
    next: () =>
      void newActivity(
        generateActivity(level, game.activity.variant + 1, topicId),
      ),
    reset: () =>
      void newActivity(
        generateActivity(level, game.activity.variant, topicId),
        true,
      ),
    exit: () => {
      stop();
      onExit();
    },
  };
}
