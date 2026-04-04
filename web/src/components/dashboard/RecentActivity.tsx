import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

interface ActivityItem {
  id: number | string;
  logged_date: string;
  maintenance_type: string;
  description: string;
  status: string;
  org_entity_code: string;
  technician_name: string | null;
}

interface RecentActivityProps {
  data: ActivityItem[];
}

const TYPE_LABELS: Record<string, string> = {
  routine: "Routine",
  corrective: "Corrective",
  emergency: "Emergency",
  condition_based: "Condition-Based",
  predictive: "Predictive",
};

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

export function RecentActivity({ data }: RecentActivityProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.id}
            className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {new Date(item.logged_date).toLocaleDateString()} &middot; {item.org_entity_code}
              </span>
              <StatusPill status={item.status} />
            </div>
            <p className="text-sm text-gray-800 mb-1">
              {truncate(item.description, 80)}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{TYPE_LABELS[item.maintenance_type] ?? item.maintenance_type}</span>
              {item.technician_name && (
                <>
                  <span>&middot;</span>
                  <span>{item.technician_name}</span>
                </>
              )}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-gray-400">No recent activity</p>
        )}
      </div>
    </Card>
  );
}
