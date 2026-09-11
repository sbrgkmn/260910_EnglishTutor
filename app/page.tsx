"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  History,
  Star,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { topics, getTopic } from "@/lib/tutor/topics";
import { TopicIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useTopicTool } from "@/components/use-topic-tool";
import { TutorVoice } from "@/lib/voice";
import { spriteManifest } from "@/lib/teacher/spriteManifest";
import { Game } from "@/components/game/Game";
import { Conversation } from "@/components/conversation";
import { ReportView, formatTime } from "@/components/report-view";
import type { Level, SavedSession, Student, Turn } from "@/lib/types";
import {
  acknowledgeGuardian,
  clearSessions,
  getSessions,
  hasAcknowledgement,
  saveSession,
} from "@/lib/storage";
import { localReport, parseReport } from "@/lib/tutor/report";
export default function Home() {
  const [dev, setDev] = useState(false);
  const [initialTextMode, setInitialTextMode] = useState(false);
  const [voice] = useState(() => new TutorVoice());
  const [selected, setSelected] = useState("animals");
  const [student, setStudent] = useState<Student>({
    name: "",
    age: 10,
    level: "A1",
  });
  const [view, setView] = useState<
    "home" | "conversation" | "report" | "history"
  >("home");
  const [guardian, setGuardian] = useState(false);
  const [ack, setAck] = useState(false);
  const [checked, setChecked] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [demo, setDemo] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [current, setCurrent] = useState<SavedSession | null>(null);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [deletePrompt, setDeletePrompt] = useState(false);
  const topic = getTopic(selected)!;
  useTopicTool(setSelected, view === "home");
  useEffect(() => {
    setDev(new URLSearchParams(window.location.search).get("dev") === "true");
    setInitialTextMode(
      new URLSearchParams(window.location.search).get("mode") === "text",
    );
    try {
      setAck(hasAcknowledgement());
      setSessions(getSessions());
    } catch {
      setNotice(
        "Browser storage is unavailable or unreadable. New practice can still run, but history may not save.",
      );
    }
    fetch("/api/tutor", { signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setConfigured(d.configured);
        setDemo(!d.configured);
      })
      .catch(() => {
        setConfigured(false);
        setDemo(true);
        setNotice("Could not check the AI connection. Demo mode is selected.");
      });
  }, []);
  function start() {
    setFormError("");
    if (!/^[\p{L}\p{M}'’-]{1,24}$/u.test(student.name.trim())) {
      setFormError(
        "Use a first name or nickname, with no spaces (up to 24 letters).",
      );
      return;
    }
    setStudent({ ...student, name: student.name.trim() });
    if (!ack) {
      setGuardian(true);
      return;
    }
    setNotice("");
    voice.unlock();
    setView("conversation");
  }
  function accept() {
    if (!checked) return;
    setAck(true);
    try {
      acknowledgeGuardian();
    } catch {
      setNotice(
        "Acknowledgement applies to this visit. Browser storage is unavailable.",
      );
    }
    setGuardian(false);
    voice.unlock();
    setView("conversation");
  }
  async function finish(turns: Turn[], duration: number) {
    let report = localReport(student, topic, turns, duration, demo);
    let message = "";
    if (!demo && turns.some((t) => t.role === "user")) {
      try {
        const res = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(50000),
          body: JSON.stringify({
            student,
            topicId: topic.id,
            turns,
            duration,
            demo,
            guardianAcknowledged: ack,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error();
        report = parseReport(data, {
          topic: topic.title,
          level: student.level,
          duration,
        });
      } catch {
        message =
          "The AI summary wasn’t available. Here is a local recap of your conversation.";
      }
    }
    const session: SavedSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      student,
      topicId: topic.id,
      turns,
      report,
    };
    setCurrent(session);
    try {
      saveSession(session);
      setSessions(getSessions());
    } catch {
      message += " This session could not be saved in your browser.";
    }
    setNotice(message);
    setView("report");
  }
  function removeHistory() {
    try {
      clearSessions();
      setSessions([]);
      setDeletePrompt(false);
      setNotice("Practice history has been removed from this browser.");
    } catch {
      setNotice(
        "Practice history could not be removed. Check your browser storage settings.",
      );
    }
  }
  return (
    <div
      className={`app-shell ${view === "conversation" ? "in-conversation" : ""}`}
    >
      <header className="header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            if (view === "conversation") voice.cancel();
            e.preventDefault();
            setView("home");
            setNotice("");
          }}
          aria-label="Starkids home"
        >
          <img className="brand-logo" src="/starkids-logo-v1.png" alt="Starkids" width={180} height={60} />
        </a>
        {view !== "conversation" && (
          <button
            className="quiet"
            onClick={() => {
              setView(view === "history" ? "home" : "history");
              setNotice("");
            }}
          >
            <History size={18} /> My practice
            {sessions.length > 0 && (
              <span className="history-count">{sessions.length}</span>
            )}
          </button>
        )}
      </header>
      {view === "home" && (
        <main className="start-screen">
          <figure className="start-portrait">
            <img
              src={spriteManifest.poses.neutral[0].src}
              alt="The teacher whose lessons inspire your AI English tutor"
            />
            <figcaption>
              AI English practice, inspired by your teacher.
            </figcaption>
          </figure>
          <form
            className="start-form"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <h1>
              A little adventure
              <br className="desktop-break" /> in English.
            </h1>
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              autoComplete="off"
              placeholder="What should we call you?"
              required
              maxLength={24}
              value={student.name}
              onChange={(e) => setStudent({ ...student, name: e.target.value })}
            />
            <div className="profile-fields">
              <label>
                Age
                <select
                  value={student.age}
                  onChange={(e) =>
                    setStudent({ ...student, age: Number(e.target.value) })
                  }
                >
                  {[7, 8, 9, 10, 11, 12].map((age) => (
                    <option key={age}>{age}</option>
                  ))}
                </select>
              </label>
              <label>
                English level
                <select
                  value={student.level}
                  onChange={(e) =>
                    setStudent({ ...student, level: e.target.value as Level })
                  }
                >
                  <option>A1</option>
                  <option>A2</option>
                  <option>B1</option>
                </select>
              </label>
            </div>
            <fieldset className="topic-picker">
              <legend>Choose a topic</legend>
              <div className="compact-topics">
                {topics.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`compact-topic ${selected === t.id ? "selected" : ""}`}
                    aria-pressed={selected === t.id}
                    onClick={() => setSelected(t.id)}
                  >
                    <TopicIcon name={t.icon} size={19} />
                    {t.title}
                  </button>
                ))}
              </div>
            </fieldset>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <button
              className="primary start-talking"
              disabled={configured === null}
            >
              Start talking <ArrowRight size={19} />
            </button>
          </form>
        </main>
      )}
      {view === "conversation" && (
        <Game
          key={`${selected}-${student.level}`}
          topicId={selected}
          student={student}
          voice={voice}
          initialTextMode={initialTextMode}
          dev={dev}
          onWorkshopChange={(topicId, level) => {
            setSelected(topicId);
            setStudent({ ...student, level });
          }}
          onExit={() => setView("home")}
        />
      )}
      {view === "report" && current && (
        <ReportView
          session={current}
          onBack={() => {
            setView("home");
            setNotice("");
          }}
          notice={notice}
        />
      )}
      {view === "history" && (
        <main className="history-main">
          <button className="quiet back-link" onClick={() => setView("home")}>
            <ArrowLeft size={16} /> Back to topics
          </button>
          <div className="history-heading">
            <div>
              <span className="eyebrow">YOUR LITTLE STEPS FORWARD</span>
              <h1>My practice</h1>
              <p>Your last 20 conversations, saved in this browser.</p>
            </div>
            {sessions.length > 0 && (
              <button className="quiet" onClick={() => setDeletePrompt(true)}>
                <Trash2 size={17} /> Clear history
              </button>
            )}
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {sessions.length ? (
            <div className="history-list">
              {sessions.map((s) => (
                <button
                  className="history-item"
                  key={s.id}
                  onClick={() => {
                    setCurrent(s);
                    setNotice("");
                    setView("report");
                  }}
                >
                  <span
                    className={`topic-icon ${getTopic(s.topicId)?.color || "mint"}`}
                  >
                    <TopicIcon name={getTopic(s.topicId)?.icon || "chat"} />
                  </span>
                  <span>
                    <strong>{s.report.topic}</strong>
                    <small>
                      {s.student.name} ·{" "}
                      {new Date(s.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      ·{" "}
                      {s.report.source === "demo"
                        ? "Demo practice"
                        : "English practice"}
                    </small>
                  </span>
                  <span className="level-badge">{s.report.level}</span>
                  <span>{formatTime(s.report.duration)}</span>
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Star size={35} />
              <h2>Your first conversation is waiting.</h2>
              <p>Pick a topic and give it a try. Your recap will be here.</p>
              <button className="primary" onClick={() => setView("home")}>
                Choose a topic <ArrowRight size={17} />
              </button>
            </div>
          )}
        </main>
      )}
      {guardian && (
        <Modal
          title="A quick note for a grown-up"
          onClose={() => setGuardian(false)}
        >
          <div className="guardian-icon">
            <ShieldCheck size={30} />
          </div>
          <p>
            Starkids is an experimental AI English practice tutor for ages 7–12,
            inspired by a real teacher’s lessons. It is not the teacher and can
            make mistakes.
          </p>
          <ul className="privacy-list">
            <li>
              Use a nickname. Please don’t share addresses, school names, or
              contact details.
            </li>
            <li>
              Transcripts and reports are saved only in this browser. You can
              clear them in My practice.
            </li>
            <li>
              Live AI messages are sent to OpenAI to generate replies. The app
              does not store them on its server. Provider retention policies may
              apply.
            </li>
            <li>
              The app never records or saves microphone audio. Browser speech
              recognition may send audio to the browser provider for processing.
              The tutor uses a synthetic voice. When custom voice is enabled,
              tutor text is sent to ElevenLabs to generate speech.
            </li>
          </ul>
          <label className="check-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              I am a parent or guardian and acknowledge this experimental
              practice experience.
            </span>
          </label>
          <button
            className="primary full-width"
            disabled={!checked}
            onClick={accept}
          >
            Ready to practice <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {deletePrompt && (
        <Modal
          title="Clear your practice history?"
          onClose={() => setDeletePrompt(false)}
        >
          <p>
            This removes all saved conversations and reports from this browser.
          </p>
          <div className="modal-actions">
            <button className="quiet" onClick={() => setDeletePrompt(false)}>
              Keep history
            </button>
            <button className="primary" onClick={removeHistory}>
              Clear history
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
