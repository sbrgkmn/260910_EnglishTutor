export function ProgressDisplay({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      className="game-progress"
      aria-label={`${current} of ${total} questions complete`}
    >
      <small className="progress-count" aria-hidden="true">{current}/{total}</small>
      <div className="progress-track" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={i < current ? "done" : i === current ? "current" : ""}
          />
        ))}
      </div>
    </div>
  );
}
