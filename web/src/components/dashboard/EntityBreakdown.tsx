import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../ui/Card";

interface EntityData {
  entity_id?: string;
  entity_code: string;
  entity_name: string;
  count: number;
}

interface EntityBreakdownProps {
  data: EntityData[];
  onEntityClick?: (entityId: string) => void;
}

export function EntityBreakdown({ data, onEntityClick }: EntityBreakdownProps) {
  const height = Math.max(200, data.length * 40);

  return (
    <Card>
      <h3 className="font-display text-lg text-surface-900 dark:text-surface-100 mb-4">By Directorate/Unit</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="entity_code"
            width={80}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [String(value), "Count"]}
            labelFormatter={(label) => {
              const entity = data.find((d) => d.entity_code === String(label));
              return entity?.entity_name ?? String(label);
            }}
          />
          <Bar
            dataKey="count"
            fill="#006B3F"
            radius={[0, 4, 4, 0]}
            cursor={onEntityClick ? "pointer" : undefined}
            onClick={(barData: unknown) => {
              const payload = barData as { entity_id?: string };
              if (onEntityClick && payload?.entity_id) {
                onEntityClick(payload.entity_id);
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
