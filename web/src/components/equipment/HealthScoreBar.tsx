interface HealthScoreBarProps {
  score: number;
  showLabel?: boolean;
}

function getColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getTextColor(score: number): string {
  if (score >= 70) return "text-green-700 dark:text-green-400";
  if (score >= 40) return "text-yellow-700 dark:text-yellow-400";
  return "text-red-700 dark:text-red-400";
}

export function HealthScoreBar({ score, showLabel = true }: HealthScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={`text-xs font-semibold min-w-[2rem] text-right ${getTextColor(score)}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
