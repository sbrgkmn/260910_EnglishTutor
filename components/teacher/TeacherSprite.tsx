"use client";
import { useEffect, useRef, useState } from "react";
import { spriteManifest, transitionFrames } from "@/lib/teacher/spriteManifest";
import type { TeacherState } from "@/lib/teacher/teacherState";
export function TeacherSprite({
  state,
  talking = false,
}: {
  state: TeacherState;
  talking?: boolean;
}) {
  const previous = useRef<TeacherState>("neutral");
  const [src, setSrc] = useState(spriteManifest.poses.neutral[0].src);
  const [old, setOld] = useState(src);
  const [fadeMs, setFadeMs] = useState(400);
  const currentSrc = useRef(src);
  useEffect(() => {
    Object.values(spriteManifest.poses)
      .flat()
      .forEach((frame) => {
        const image = new Image();
        image.src = frame.src;
      });
  }, []);
  useEffect(() => {
    const frames = transitionFrames(previous.current, state);
    previous.current = state;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    (reduced ? [frames.at(-1)!] : frames).forEach((frame) => {
      timers.push(
        setTimeout(() => {
          setFadeMs(Math.min(400, frame.duration));
          setOld(currentSrc.current);
          currentSrc.current = frame.src;
          setSrc(frame.src);
        }, elapsed),
      );
      elapsed += frame.duration;
    });
    return () => timers.forEach(clearTimeout);
  }, [state]);
  return (
    <div
      className={`teacher-sprite pose-${state} ${talking ? "is-talking" : ""}`}
      role="img"
      data-teacher-state={state}
      aria-label={`Teacher: ${state}`}
    >
      <div className="teacher-sprite-frames" aria-hidden="true">
        <img src={old} alt="" />
        <img
          key={src}
          className="pose-front"
          style={{ animationDuration: `${fadeMs}ms` }}
          src={src}
          alt=""
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/teacher-source.jpg";
          }}
        />
      </div>
      <span className="teacher-mood" aria-hidden="true">
        {state === "celebrating"
          ? "✦"
          : state === "happy"
            ? "★"
            : state === "thinking"
              ? "…"
              : state === "listening"
                ? "♪"
                : state === "surprised"
                  ? "!"
                  : ""}
      </span>
    </div>
  );
}
