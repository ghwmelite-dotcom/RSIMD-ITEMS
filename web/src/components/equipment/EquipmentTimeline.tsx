import { Badge } from "../ui/Badge";
import { StatusPill } from "../ui/StatusPill";
import type { MaintenanceLog } from "../../types";

interface EquipmentTimelineProps {
  history: MaintenanceLog[];
  registeredDate: string;
}

const TYPE_LABELS: Record<string, string> = {
  routine: "Routine",
  corrective: "Corrective",
  emergency: "Emergency",
  condition_based: "Condition-Based",
  predictive: "Predictive",
};

const TYPE_DOT_COLORS: Record<string, string> = {
  routine: "bg-green-500",
  corrective: "bg-yellow-500",
  emergency: "bg-red-500",
  condition_based: "bg-blue-500",
  predictive: "bg-purple-500",
  registered: "bg-green-500",
};

const TYPE_BADGE_VARIANTS: Record<
  string,
  "green" | "gold" | "red" | "gray"
> = {
  routine: "green",
  corrective: "gold",
  emergency: "red",
  condition_based: "gray",
  predictive: "gray",
};

interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  description: string;
  status?: string;
  isRegistered: boolean;
}

export function EquipmentTimeline({
  history,
  registeredDate,
}: EquipmentTimelineProps) {
  const events: TimelineEvent[] = [
    ...history.map((log) => ({
      id: log.id,
      date: log.logged_date,
      type: log.maintenance_type,
      description: log.description,
      status: log.status,
      isRegistered: false,
    })),
    {
      id: "registered",
      date: registeredDate,
      type: "registered",
      description: "Equipment registered in the system",
      isRegistered: true,
    },
  ];

  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="relative flex items-start gap-4 pl-10">
            {/* Dot */}
            <div
              className={`absolute left-[13px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                TYPE_DOT_COLORS[event.type] ?? "bg-gray-400"
              }`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <time className="text-xs text-gray-500 dark:text-gray-400">
                  {event.date}
                </time>
                {event.isRegistered ? (
                  <Badge variant="green">Registered</Badge>
                ) : (
                  <Badge variant={TYPE_BADGE_VARIANTS[event.type] ?? "gray"}>
                    {TYPE_LABELS[event.type] ?? event.type}
                  </Badge>
                )}
                {event.status && <StatusPill status={event.status} />}
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                {event.description.length > 100
                  ? `${event.description.slice(0, 100)}...`
                  : event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
