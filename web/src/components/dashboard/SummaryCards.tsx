import { DeltaBadge } from "./DeltaBadge";

interface SummaryCardsProps {
  total: number;
  byType: Record<string, number>;
  previous?: { total: number; by_type: Record<string, number> };
}

const TYPE_CONFIG: Record<
  string,
  { label: string; colorClass: string; borderAccent: string }
> = {
  routine: {
    label: "Routine",
    colorClass: "text-ghana-green",
    borderAccent: "border-t-ghana-green",
  },
  corrective: {
    label: "Corrective",
    colorClass: "text-orange-600",
    borderAccent: "border-t-orange-500",
  },
  emergency: {
    label: "Emergency",
    colorClass: "text-ghana-red",
    borderAccent: "border-t-ghana-red",
  },
  condition_based: {
    label: "Condition-Based",
    colorClass: "text-blue-600",
    borderAccent: "border-t-blue-500",
  },
  predictive: {
    label: "Predictive",
    colorClass: "text-purple-600",
    borderAccent: "border-t-purple-500",
  },
};

const STAGGER = [
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
];

export function SummaryCards({ total, byType, previous }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total card */}
      <div
        className={`opacity-0 animate-slide-up ${STAGGER[0]} bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/50 border-t-2 border-t-ghana-gold rounded-2xl shadow-warm p-5`}
      >
        <p className="text-xs uppercase tracking-wider text-surface-500">
          Total Logs
        </p>
        <p className="text-3xl font-display text-surface-900 dark:text-surface-100">
          {total}
        </p>
        {previous && <DeltaBadge current={total} previous={previous.total} />}
      </div>

      {/* Per-type cards */}
      {Object.entries(TYPE_CONFIG).map(
        ([key, { label, colorClass, borderAccent }], index) => (
          <div
            key={key}
            className={`opacity-0 animate-slide-up ${STAGGER[index + 1]} bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/50 border-t-2 ${borderAccent} rounded-2xl shadow-warm p-5`}
          >
            <p className="text-xs uppercase tracking-wider text-surface-500">
              {label}
            </p>
            <p className={`text-3xl font-display ${colorClass}`}>
              {byType[key] ?? 0}
            </p>
            {previous && (
              <DeltaBadge
                current={byType[key] ?? 0}
                previous={previous.by_type[key] ?? 0}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}
