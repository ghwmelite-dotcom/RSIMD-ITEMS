import { Card } from "../ui/Card";

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

const TYPE_COLORS: Record<string, string> = {
  routine: "bg-neon-green/20 text-neon-green",
  corrective: "bg-neon-amber/20 text-neon-amber",
  emergency: "bg-neon-red/20 text-neon-red",
  condition_based: "bg-neon-blue/20 text-neon-blue",
  predictive: "bg-purple-500/20 text-purple-400",
};

const TYPE_SHORT: Record<string, string> = {
  routine: "RTN",
  corrective: "COR",
  emergency: "EMR",
  condition_based: "CND",
  predictive: "PRD",
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function truncate(text: string, max: number): string {
  const clean = stripHtml(text);
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

export function RecentActivity({ data }: RecentActivityProps) {
  return (
    <Card className="flex flex-col">
      <h3 className="font-display text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-3">
        Recent Activity
      </h3>
      <div className="flex-1 overflow-y-auto max-h-[320px] -mx-2 px-2 space-y-1.5">
        {data.length === 0 ? (
          <p className="text-xs text-surface-500 py-4 text-center font-mono">No activity</p>
        ) : (
          data.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800/50 transition-colors"
            >
              {/* Type badge */}
              <span className={`flex-shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[item.maintenance_type] ?? "bg-surface-200 text-surface-500"}`}>
                {TYPE_SHORT[item.maintenance_type] ?? "???"}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-800 dark:text-surface-200 leading-snug truncate">
                  {truncate(item.description, 50)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] text-surface-400">{item.org_entity_code}</span>
                  <span className="text-surface-600 text-[10px]">·</span>
                  <span className="font-mono text-[10px] text-surface-400">
                    {new Date(item.logged_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
