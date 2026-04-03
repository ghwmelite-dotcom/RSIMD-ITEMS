import { Card } from "../ui/Card";

interface SummaryCardsProps {
  total: number;
  byType: Record<string, number>;
}

const TYPE_CONFIG: Record<string, { label: string; colorClass: string }> = {
  routine: { label: "Routine", colorClass: "text-ghana-green" },
  corrective: { label: "Corrective", colorClass: "text-orange-600" },
  emergency: { label: "Emergency", colorClass: "text-ghana-red" },
  condition_based: { label: "Condition-Based", colorClass: "text-blue-600" },
  predictive: { label: "Predictive", colorClass: "text-purple-600" },
};

export function SummaryCards({ total, byType }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card padding="sm">
        <p className="text-sm text-gray-500">Total Logs</p>
        <p className="text-2xl font-bold text-gray-900">{total}</p>
      </Card>

      {Object.entries(TYPE_CONFIG).map(([key, { label, colorClass }]) => (
        <Card key={key} padding="sm">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>
            {byType[key] ?? 0}
          </p>
        </Card>
      ))}
    </div>
  );
}
