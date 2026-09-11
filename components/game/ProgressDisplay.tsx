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
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={i < current ? "done" : i === current ? "current" : ""}
        />
      ))}
    </div>
  );
}
