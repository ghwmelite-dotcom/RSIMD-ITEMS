import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";
import { api } from "../../lib/api-client";

interface ReadinessData {
  ready: number;
  can_upgrade: number;
  cannot_upgrade: number;
  unknown: number;
}

const COLORS: Record<keyof ReadinessData, string> = {
  ready: "#006B3F",
  can_upgrade: "#FCD116",
  cannot_upgrade: "#CE1126",
  unknown: "#9CA3AF",
};

const LABELS: Record<keyof ReadinessData, string> = {
  ready: "Ready",
  can_upgrade: "Can Upgrade",
  cannot_upgrade: "Cannot Upgrade",
  unknown: "Unknown",
};

const KEYS: (keyof ReadinessData)[] = [
  "ready",
  "can_upgrade",
  "cannot_upgrade",
  "unknown",
];

export function ReadinessWidget() {
  const [data, setData] = useState<ReadinessData | null>(null);

  useEffect(() => {
    api
      .get<ReadinessData>("/equipment/readiness")
      .then(setData)
      .catch(() => {
        /* silently fail */
      });
  }, []);

  if (!data) return null;

  const chartData = KEYS.filter((k) => data[k] > 0).map((k) => ({
    name: LABELS[k],
    value: data[k],
    color: COLORS[k],
  }));

  return (
    <Card>
      <h3 className="font-display text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-3">
        Win11 Readiness
      </h3>

      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={70}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {KEYS.map((k) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[k] }}
            />
            {LABELS[k]}: {data[k]}
          </div>
        ))}
      </div>
    </Card>
  );
}
