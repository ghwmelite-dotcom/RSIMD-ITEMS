import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../ui/Card";

interface MonthData {
  month: number;
  by_type: Record<string, number>;
}

interface TrendChartProps {
  data: MonthData[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const TYPE_COLORS: Record<string, string> = {
  routine: "#006B3F",
  corrective: "#F97316",
  emergency: "#CE1126",
  condition_based: "#3B82F6",
  predictive: "#8B5CF6",
};

const TYPE_LABELS: Record<string, string> = {
  routine: "Routine",
  corrective: "Corrective",
  emergency: "Emergency",
  condition_based: "Condition-Based",
  predictive: "Predictive",
};

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map((d) => ({
    month: MONTH_NAMES[d.month - 1] ?? `M${d.month}`,
    ...d.by_type,
  }));

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {Object.entries(TYPE_COLORS).map(([key, color]) => (
            <Bar
              key={key}
              dataKey={key}
              name={TYPE_LABELS[key]}
              stackId="a"
              fill={color}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
