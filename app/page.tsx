"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  History,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { topics, getTopic } from "@/lib/tutor/topics";
import { TopicIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useTopicTool } from "@/components/use-topic-tool";
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
    try {
      setAck(hasAcknowledgement());
      setSessions(getSessions());
    } catch {
      setNotice(
        "Browser storage is unavailable or unreadable. New practice can still run, but history may not save.",
      );
    }
    fetch("/api/tutor")
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
    <div className="app-shell">
      <header className="header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            if (view === "conversation") {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            setView("home");
            setNotice("");
          }}
          aria-label="Little Talk home"
        >
          <span className="brand-icon">
            <MessageCircle size={25} />
          </span>
          little<span>talk</span>
          <span className="brand-divider" />
          <small>ENGLISH, ONE CONVERSATION AT A TIME</small>
        </a>
        <button
          className="quiet"
          disabled={view === "conversation"}
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
      </header>
      {view === "home" && (
        <main className="home-main">
          <div className="intro">
            <div>
              <div className="eyebrow">
                A LITTLE PRACTICE. A LITTLE MORE CONFIDENCE.
              </div>
              <h1>What shall we talk about?</h1>
              <p>Pick something you like. Let’s turn it into a conversation.</p>
            </div>
            <span className="duration-pill">
              <Clock3 size={16} /> About 10 minutes
            </span>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          <div className="home-grid">
            <section aria-label="Conversation topics">
              <div className="section-label">
                <h2>Choose your topic</h2>
                <span>10 ways to start talking</span>
              </div>
              <div className="topic-grid">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    aria-pressed={selected === t.id}
                    className={`topic-card ${selected === t.id ? "selected" : ""}`}
                  >
                    <span className={`topic-icon ${t.color}`}>
                      <TopicIcon name={t.icon} />
                    </span>
                    <span className="topic-title">{t.title}</span>
                    <span className="topic-description">{t.description}</span>
                    <span className="topic-check" aria-hidden>
                      {selected === t.id ? "✓" : "↗"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <aside className="setup-panel">
              <div className="portrait-preview">
                <img
                  src="/teacher.jpg"
                  alt="The English teacher whose lessons inspire the AI tutor"
                />
                <span className="ai-badge">
                  <Sparkles size={13} /> AI PRACTICE TUTOR
                </span>
              </div>
              <form
                className="setup-body"
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
                }}
              >
                <span className="eyebrow">
                  A FAMILIAR FACE. A FRIENDLY SPACE.
                </span>
                <h2>Your conversation starts here.</h2>
                <p>
                  An AI tutor inspired by your teacher’s lessons. Take your
                  time, try things out, and be yourself.
                </p>
                <div className="setup-rule" />
                <label>
                  What should we call you?
                  <input
                    autoComplete="off"
                    placeholder="First name or nickname"
                    maxLength={24}
                    required
                    value={student.name}
                    onChange={(e) =>
                      setStudent({ ...student, name: e.target.value })
                    }
                  />
                </label>
                <div className="two-fields">
                  <label>
                    Age
                    <select
                      value={student.age}
                      onChange={(e) =>
                        setStudent({ ...student, age: Number(e.target.value) })
                      }
                    >
                      {[8, 9, 10, 11, 12, 13, 14].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    English level
                    <select
                      value={student.level}
                      onChange={(e) =>
                        setStudent({
                          ...student,
                          level: e.target.value as Level,
                        })
                      }
                    >
                      <option value="A1">A1 · Beginner</option>
                      <option value="A2">A2 · Elementary</option>
                      <option value="B1">B1 · Intermediate</option>
                    </select>
                  </label>
                </div>
                <p className="level-help">
                  {student.level === "A1"
                    ? "Simple words and short sentences."
                    : student.level === "A2"
                      ? "Everyday chats and a little more detail."
                      : "Share ideas, stories, and opinions."}
                </p>
                {configured === false && (
                  <div className="setup-demo">
                    <Sparkles size={14} />
                    <span>Demo mode · Explore with sample replies.</span>
                    <details>
                      <summary>Connect live AI</summary>
                      <p>
                        Add OPENAI_API_KEY to .env.local and restart the app.
                        Demo replies do not assess your English.
                      </p>
                    </details>
                  </div>
                )}
                {configured && (
                  <label className="check-label demo-check">
                    <input
                      type="checkbox"
                      checked={demo}
                      onChange={(e) => setDemo(e.target.checked)}
                    />
                    Use demo replies (no AI calls)
                  </label>
                )}
                {formError && (
                  <p className="error" role="alert">
                    {formError}
                  </p>
                )}
                <button
                  className="primary start-button"
                  disabled={configured === null}
                >
                  {configured === null
                    ? "Checking connection…"
                    : `Let’s talk about ${topic.title}`}{" "}
                  <ArrowRight size={18} />
                </button>
                <span className="under-button">
                  <MessageCircle size={14} /> A little conversation goes a long
                  way
                </span>
              </form>
            </aside>
          </div>
          <footer className="footer">
            <span>
              <ShieldCheck size={17} /> A safe space to find your voice.
            </span>
            <span>No accounts. No saved recordings. Just practice.</span>
          </footer>
        </main>
      )}
      {view === "conversation" && (
        <Conversation
          student={student}
          topic={topic}
          demo={demo}
          onEnd={finish}
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
              <MessageCircle size={35} />
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
            Little Talk is an experimental AI English practice tutor for ages
            8–14, inspired by a real teacher’s lessons. It is not the teacher
            and can make mistakes.
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
              The tutor uses a synthetic voice.
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
