import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "../ui/Card";

interface EquipmentHealthProps {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#006B3F",
  faulty: "#CE1126",
  under_repair: "#FCD116",
  decommissioned: "#9CA3AF",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  faulty: "Faulty",
  under_repair: "Under Repair",
  decommissioned: "Decommissioned",
};

export function EquipmentHealth({ data }: EquipmentHealthProps) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);

  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] ?? key.replace(/_/g, " "),
      value,
      color: STATUS_COLORS[key] ?? "#9CA3AF",
    }));

  if (total === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Health</h3>
        <p className="text-sm text-gray-400 text-center py-8">No equipment data</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Health</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [String(value), "Count"]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
