interface DeltaBadgeProps {
  current: number;
  previous: number;
}

export function DeltaBadge({ current, previous }: DeltaBadgeProps) {
  if (previous === 0 && current === 0) return null;

  if (previous === 0 && current > 0) {
    return (
      <span className="text-xs font-medium text-green-600 dark:text-green-400">
        New
      </span>
    );
  }

  const pct = ((current - previous) / previous) * 100;

  if (pct === 0) {
    return (
      <span className="text-xs font-medium text-surface-400 dark:text-surface-500">
        &mdash;
      </span>
    );
  }

  const isPositive = pct > 0;

  return (
    <span
      className={`text-xs font-medium inline-flex items-center gap-0.5 ${
        isPositive
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? "\u25B2" : "\u25BC"}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
