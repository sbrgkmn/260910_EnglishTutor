"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Keyboard,
  Mic,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Star,
} from "lucide-react";
import { spriteManifest } from "@/lib/teacher/spriteManifest";
import { topics } from "@/lib/tutor/topics";
import type { Student, Level } from "@/lib/types";
import type { VoiceProvider } from "@/lib/voice/types";
import { useGameController } from "@/lib/game/useGameController";
import { TeacherAvatar } from "../teacher/TeacherAvatar";
import { teacherStates, type TeacherState } from "@/lib/teacher/teacherState";
import { ObjectPicture } from "./ObjectPicture";
import { getTopic } from "@/lib/tutor/topics";
import { ActivityScene } from "./ActivityScene";
import { ScoreDisplay } from "./ScoreDisplay";
import { ProgressDisplay } from "./ProgressDisplay";
import { Modal } from "../modal";
import { formatTime } from "../report-view";
export function Game({
  student,
  topicId,
  voice,
  initialTextMode = false,
  dev = false,
  onWorkshopChange,
  onExit,
}: {
  student: Student;
  topicId: string;
  voice: VoiceProvider;
  initialTextMode?: boolean;
  dev?: boolean;
  onWorkshopChange: (topic: string, level: Level) => void;
  onExit: () => void;
}) {
  const c = useGameController({
    topicId,
    level: student.level,
    age: student.age,
    voice,
    initialTextMode,
    onExit,
  });
  const [transcript, setTranscript] = useState(false);
  const [hitboxes, setHitboxes] = useState(false);
  const [pose, setPose] = useState<TeacherState>();
  useEffect(() => {
    void c.fetchScene();
  }, [c.game.activity.id, c.fetchScene]);
  const q = c.game.activity.questions[c.game.index];
  const busy = c.state === "THINKING" || c.state === "SPEAKING";
  const status = c.micStatus === "starting" ? "Connecting microphone…"
    : c.micStatus === "reconnecting" ? "Reconnecting microphone…"
    : c.state === "LISTENING" ? c.hearing ? "Hearing your voice…" : "Listening…"
    : c.state === "THINKING" ? "Thinking…"
    : c.state === "SPEAKING" ? "Speaking…"
    : q.type === "find" ? "Tap the picture or speak." : "";
  return (
    <main className="game-main">
      <div className="game-topline">
        <span className="game-eyebrow">{getTopic(topicId)?.title}</span>
        <div className="game-top-actions">
          <ScoreDisplay score={c.game.stars} />
          <button className="quiet game-end" onClick={c.exit}>
            End
          </button>
        </div>
      </div>
      {c.game.completed ? (
        <section className="game-celebration">
          <div className="celebration-stars" aria-hidden="true">
            ✦ <Star fill="currentColor" size={64} /> ✦
          </div>
          <TeacherAvatar
            state={c.state === "LISTENING" ? "READY" : c.state}
            complete
            override={pose}
          />
          <h1>Lovely work, {student.name}!</h1>
          <p>
            You earned <strong>{c.game.earned} stars</strong>!
          </p>
          <div className="celebration-actions">
            <button className="primary" disabled={busy} onClick={c.next}>
              Another round <ArrowRight size={20} />
            </button>
            <button className="quiet" onClick={c.exit}>
              Finish
            </button>
          </div>
        </section>
      ) : (
        <>
          <ActivityScene
            scene={c.game.activity.scene}
            question={q}
            disabled={busy}
            onSelect={(objectId) => c.submit({ type: "click", objectId })}
            selected={c.selected}
            success={c.feedback?.success}
            hidden={c.memoryHidden}
            debug={hitboxes}
          />
          <section
            className="game-conversation"
            aria-label="Your teacher’s question"
          >
            <TeacherAvatar
              state={c.state}
              result={c.feedback}
              override={pose}
            />
            <div className="game-question">
              <h1 aria-live="polite">{c.sentence}</h1>
              {status && <span className="game-state" role="status">
                <i className={c.state.toLowerCase()} />
                {status}
              </span>}
              {c.micStatus === "listening" && (
                <meter className="mic-level" aria-label="Microphone input level" min={0} max={1} value={c.micLevel} />
              )}
            </div>
            <button
              className={`game-mic ${c.auto ? "mic-on" : ""}`}
              disabled={busy}
              onClick={c.toggleMic}
              aria-label={c.auto ? "Pause microphone" : "Speak your answer"}
            >
              {c.auto ? <Pause size={25} /> : <Mic size={27} />}
              <span>{c.auto ? "Pause" : "Speak"}</span>
            </button>
          </section>
          {q.type === "choose" && (
            <div className="picture-choices" aria-label="Choose a picture">
              {q.choices?.map((id) => (
                <button
                  key={id}
                  disabled={busy}
                  onClick={() => c.submit({ type: "click", objectId: id })}
                >
                  <ObjectPicture
                    scene={c.game.activity.scene}
                    object={
                      c.game.activity.scene.objects.find((o) => o.id === id)!
                    }
                  />
                  <span>
                    {
                      c.game.activity.scene.objects.find((o) => o.id === id)
                        ?.label
                    }
                  </span>
                </button>
              ))}
            </div>
          )}
          {c.textMode && (
            <form
              className="game-text-form"
              onSubmit={(e) => {
                e.preventDefault();
                c.submit({ type: "text", text: c.draft });
              }}
            >
              <input
                aria-label="Your answer"
                placeholder="Type your answer…"
                value={c.draft}
                maxLength={1000}
                disabled={busy}
                onChange={(e) => c.setDraft(e.target.value)}
              />
              <button
                className="primary"
                aria-label="Send answer"
                disabled={busy || !c.draft.trim()}
              >
                <ArrowRight size={23} />
              </button>
            </form>
          )}
          {!c.textMode && c.draft && (
            <p className="live-answer" aria-live="polite">
              {c.draft}
            </p>
          )}
          <div className="game-bottom">
            <ProgressDisplay
              current={c.game.answered.length}
              total={c.game.activity.questions.length}
            />
          </div>
        </>
      )}
      {c.notice && (
        <p className="game-notice" role="status">
          {c.notice}
        </p>
      )}
      <div className="game-utilities">
        <button className="quiet" onClick={c.toggleText}>
          <Keyboard size={16} />
          {c.textMode ? "Voice mode" : "Type instead"}
        </button>
        <button
          className="quiet"
          onClick={() => void c.replay()}
          disabled={busy}
        >
          <RotateCcw size={16} />
          Hear again
        </button>
        <button
          className="quiet"
          onClick={c.toggleSound}
          aria-label={c.sound ? "Mute tutor" : "Unmute tutor"}
        >
          {c.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button className="quiet" onClick={() => setTranscript(true)}>
          Transcript
        </button>
      </div>
      {transcript && (
        <Modal title="Our conversation" onClose={() => setTranscript(false)}>
          {c.turns.map((t, i) => (
            <p key={i}>
              <strong>{t.role === "user" ? "You" : "Teacher"}: </strong>
              {t.content}
            </p>
          ))}
        </Modal>
      )}
      {dev && (
        <details className="game-dev">
          <summary>Lesson workshop · developer tools</summary>
          <p>
            {student.level} · {formatTime(c.seconds)} ·{" "}
            {c.feedbackSource === "ai" ? "Live feedback" : "Guided feedback"}
          </p>
          <div className="dev-selectors">
            <label>
              Topic
              <select
                aria-label="Workshop topic"
                value={topicId}
                onChange={(e) =>
                  onWorkshopChange(e.target.value, student.level)
                }
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level
              <select
                aria-label="Workshop level"
                value={student.level}
                onChange={(e) =>
                  onWorkshopChange(topicId, e.target.value as Level)
                }
              >
                {["A1", "A2", "B1"].map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="dev-actions">
            <button onClick={() => setHitboxes((v) => !v)}>
              Inspect hitboxes
            </button>
            {c.game.activity.scene.composition !== "illustration" && (
              <button
                onClick={() => void c.fetchScene(true)}
                disabled={c.imageLoading || busy}
              >
                {c.imageLoading ? "Generating…" : "Regenerate background"}
              </button>
            )}
            <button onClick={() => void c.replay()} disabled={busy}>
              Test voice
            </button>
            <button onClick={c.next} disabled={busy}>
              Next activity
            </button>
            <button onClick={c.reset}>Reset score</button>
          </div>
          <div className="sprite-tester">
            <button
              className="follow-conversation"
              onClick={() => setPose(undefined)}
            >
              Follow conversation
            </button>
            {teacherStates.map((s) => (
              <button
                key={s}
                aria-pressed={pose === s}
                onClick={() => setPose(s)}
              >
                <img
                  src={spriteManifest.poses[s][0].src}
                  alt=""
                  loading="lazy"
                />
                <span>{s}</span>
              </button>
            ))}
          </div>
          <p>
            Sprite pack: generated expressions · pending teacher review. Image:{" "}
            {c.game.activity.scene.imageSource}. Hitboxes: authored.
          </p>
          <details className="mic-diagnostics">
            <summary>Microphone diagnostics · {c.micStatus}</summary>
            <p>Connection events only. Audio and recognized words are not saved here.</p>
            <ol>{c.micDiagnostics.map((event, i) => (
              <li key={i}>{event.time} · {event.event}{event.detail ? ` · ${event.detail}` : ""}</li>
            ))}</ol>
          </details>
          <pre>{JSON.stringify(c.game.activity, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}
