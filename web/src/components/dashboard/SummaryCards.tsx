import { DeltaBadge } from "./DeltaBadge";

interface SummaryCardsProps {
  total: number;
  byType: Record<string, number>;
  previous?: { total: number; by_type: Record<string, number> };
}

const TYPE_CONFIG: Record<string, { label: string; ledClass: string; textClass: string }> = {
  routine: { label: "Routine", ledClass: "led-green", textClass: "text-neon-green" },
  corrective: { label: "Corrective", ledClass: "led-amber", textClass: "text-neon-amber" },
  emergency: { label: "Emergency", ledClass: "led-red", textClass: "text-neon-red" },
  condition_based: { label: "Condition", ledClass: "led-blue", textClass: "text-neon-blue" },
  predictive: { label: "Predictive", ledClass: "led-green", textClass: "text-purple-400" },
};

const STAGGER = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5", "stagger-6"];

export function SummaryCards({ total, byType, previous }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total card */}
      <div className={`opacity-0 animate-slide-up ${STAGGER[0]} bg-surface-900 border border-surface-700/30 rounded-xl p-4 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="led led-green animate-pulse-slow" />
            <span className="font-mono text-[9px] text-surface-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="font-mono text-3xl font-bold text-neon-green tabular-nums">{total}</p>
          {previous && <DeltaBadge current={total} previous={previous.total} />}
        </div>
      </div>

      {/* Per-type cards */}
      {Object.entries(TYPE_CONFIG).map(([key, { label, ledClass, textClass }], index) => (
        <div
          key={key}
          className={`opacity-0 animate-slide-up ${STAGGER[index + 1]} bg-surface-900 border border-surface-700/30 rounded-xl p-4 relative overflow-hidden`}
        >
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className={`led ${ledClass}`} />
              <span className="font-mono text-[9px] text-surface-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`font-mono text-3xl font-bold tabular-nums ${textClass}`}>
              {byType[key] ?? 0}
            </p>
            {previous && <DeltaBadge current={byType[key] ?? 0} previous={previous.by_type[key] ?? 0} />}
          </div>
        </div>
      ))}
    </div>
  );
}
