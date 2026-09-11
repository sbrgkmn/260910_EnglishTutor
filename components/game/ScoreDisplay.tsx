import { Star } from "lucide-react";
export function ScoreDisplay({ score }: { score: number }) {
  return (
    <div className="game-score" aria-label={`${score} stars`}>
      <Star fill="currentColor" size={22} />
      <strong key={score}>{score}</strong>
    </div>
  );
}
