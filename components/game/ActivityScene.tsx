"use client";
import { useEffect, useState } from "react";
import type {
  ActivityScene as Scene,
  ActivityQuestion,
} from "@/lib/activities/activityTypes";
export function ActivityScene({
  scene,
  question,
  disabled,
  onSelect,
  selected,
  success,
  hidden = false,
  debug = false,
}: {
  scene: Scene;
  question: ActivityQuestion;
  disabled: boolean;
  onSelect: (id: string) => void;
  selected?: string;
  success?: boolean;
  hidden?: boolean;
  debug?: boolean;
}) {
  const interactive = question.type === "find";
  const illustrated = scene.composition === "illustration";
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [scene.id, scene.background]);
  return (
    <div
      className={`activity-scene ${illustrated ? "scene-illustration" : ""} ${hidden ? "scene-hidden" : ""} ${debug ? "show-hitboxes" : ""}`}
      aria-label={
        hidden ? "Picture hidden for the memory question" : scene.description
      }
    >
      {!hidden && !failed && (
        <>
          <img
            key={`${scene.background}-${attempt}`}
            className="scene-backdrop"
            src={scene.background}
            alt={illustrated ? scene.description : ""}
            onError={() => setFailed(true)}
          />
          {scene.imageSource === "generated" && !illustrated && (
            <img
              className="scene-backdrop scene-foreground"
              src="/scenes/park-foreground.svg"
              alt=""
            />
          )}
          {scene.objects.map((o) => (
            <div
              className="scene-object"
              key={o.id}
              style={{
                left: `${o.hitbox.x * 100}%`,
                top: `${o.hitbox.y * 100}%`,
                width: `${o.hitbox.width * 100}%`,
                height: `${o.hitbox.height * 100}%`,
              }}
            >
              {!illustrated && (
                <img
                  src={`/scenes/${o.id}.svg`}
                  alt={interactive ? "" : `${o.attributes.color} ${o.label}`}
                  draggable={false}
                />
              )}
              {interactive && (
                <button
                  className={`object-target ${selected === o.id ? (success ? "target-correct" : "target-retry") : ""}`}
                  aria-label={`Find ${o.label}`}
                  disabled={disabled}
                  onClick={() => onSelect(o.id)}
                >
                  <span className="sr-only">{o.label}</span>
                  {selected === o.id && success && (
                    <span className="tap-star" aria-hidden="true">
                      ✦
                    </span>
                  )}
                </button>
              )}
              {debug && <span className="hitbox-label">{o.id}</span>}
            </div>
          ))}
        </>
      )}
      {hidden && (
        <div className="memory-cover">
          <span aria-hidden="true">✦</span>
          <strong>Picture in your mind…</strong>
        </div>
      )}
      {!hidden && failed && (
        <div className="memory-cover">
          <strong>Let’s load the picture again.</strong>
          <button
            className="primary"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
