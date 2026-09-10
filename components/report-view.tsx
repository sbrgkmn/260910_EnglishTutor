"use client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Leaf,
  MessageCircle,
} from "lucide-react";
import type { SavedSession } from "@/lib/types";
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
export function ReportView({
  session,
  onBack,
  notice,
}: {
  session: SavedSession;
  onBack: () => void;
  notice: string;
}) {
  const r = session.report;
  return (
    <main className="report-main">
      <button className="quiet back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Back to topics
      </button>
      <div className="report-heading">
        <span className="report-mark">
          <Leaf size={30} />
        </span>
        <div className="eyebrow">ONE CONVERSATION AT A TIME</div>
        <h1>
          {session.turns.some((t) => t.role === "user")
            ? "A little more confident."
            : "A good place to begin."}
        </h1>
        <p>
          {session.turns.some((t) => t.role === "user")
            ? `Thanks for practicing, ${session.student.name}. Here’s what we explored.`
            : "When you’re ready, come back and try your first answer."}
        </p>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {r.source !== "ai" && (
        <div className="source-note">
          {r.source === "demo"
            ? "Demo session · This recap is based on sample interactions, not an AI assessment."
            : "Local recap · An AI assessment was not available."}
        </div>
      )}
      <div className="report-card">
        <div className="report-topic">
          <span>
            <MessageCircle size={22} />
            <strong>{r.topic}</strong>
          </span>
          <span>
            <Clock3 size={16} />
            {formatTime(r.duration)}
            <span className="level-badge">{r.level}</span>
          </span>
        </div>
        <div className="report-columns">
          <section>
            <span className="eyebrow">WORDS YOU PRACTICED</span>
            <div className="word-chips">
              {r.vocabularyPracticed.length ? (
                r.vocabularyPracticed.map((w) => <span key={w}>{w}</span>)
              ) : (
                <p>Your next conversation will bring more words.</p>
              )}
            </div>
          </section>
          <section>
            <span className="eyebrow">NEW WORDS TO TAKE WITH YOU</span>
            <div className="word-chips new-words">
              {r.newVocabulary.length ? (
                r.newVocabulary.map((w) => <span key={w}>{w}</span>)
              ) : (
                <p>No new words recorded this time.</p>
              )}
            </div>
          </section>
        </div>
        {r.strengths.length > 0 && (
          <section className="strengths">
            <h2>Something to feel good about</h2>
            {r.strengths.map((s, i) => (
              <p key={i}>
                <Check size={17} />
                {s}
              </p>
            ))}
          </section>
        )}
        {r.importantCorrections.length > 0 && (
          <section className="corrections">
            <h2>A little English to remember</h2>
            {r.importantCorrections.map((c, i) => (
              <div key={i}>
                <span>{c.original}</span>
                <ArrowRight size={16} />
                <strong>{c.corrected}</strong>
              </div>
            ))}
          </section>
        )}
        <div className="recommendation">
          <BookOpen size={24} />
          <div>
            <span className="eyebrow">LET’S PRACTICE NEXT</span>
            <p>{r.practiceRecommendation}</p>
          </div>
        </div>
      </div>
      <div className="report-bottom">
        <button className="primary" onClick={onBack}>
          Try another conversation <ArrowRight size={17} />
        </button>
        <p>Practice history stays in this browser.</p>
      </div>
    </main>
  );
}
