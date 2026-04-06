import { useState, useEffect } from "react";
import { api } from "../../lib/api-client";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface ScheduleItem {
  id: string;
  date: string;
  entity_code: string;
  entity_name: string;
  rooms: string[];
  technician_names: string[];
  notes: string | null;
  status: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TodaySchedule() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [weekItems, setWeekItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ScheduleItem[]>("/schedules/today"),
      api.get<ScheduleItem[]>("/schedules"),
    ])
      .then(([today, week]) => { setItems(today); setWeekItems(week); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (items.length === 0 && weekItems.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);

  // Group week items by date
  const byDate = new Map<string, ScheduleItem[]>();
  for (const item of weekItems) {
    const existing = byDate.get(item.date) ?? [];
    existing.push(item);
    byDate.set(item.date, existing);
  }

  return (
    <Card className="border-neon-green/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-circuit-pattern opacity-20 pointer-events-none" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="led led-green animate-pulse-slow" />
            <h3 className="font-mono text-xs font-bold text-neon-green uppercase tracking-wider">
              Maintenance Schedule
            </h3>
          </div>
          <span className="font-mono text-[10px] text-surface-500">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
          </span>
        </div>

        {/* Today's assignments */}
        {items.length > 0 && (
          <div className="mb-4">
            <p className="font-mono text-[10px] text-neon-green/60 uppercase tracking-wider mb-2">Today</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    item.status === "completed"
                      ? "bg-neon-green/5 border-neon-green/15"
                      : item.status === "in_progress"
                      ? "bg-neon-amber/5 border-neon-amber/15"
                      : "bg-surface-800/30 border-surface-700/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-sm font-bold text-surface-100">{item.entity_code}</span>
                    <Badge variant={item.status === "completed" ? "green" : item.status === "in_progress" ? "gold" : "gray"}>
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-400 mb-1">{item.entity_name}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.rooms.map((room) => (
                      <span key={room} className="font-mono text-[10px] bg-surface-800 text-surface-300 px-2 py-0.5 rounded">
                        Rm {room}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.technician_names.map((name) => (
                      <span key={name} className="text-[10px] text-neon-green/70">{name}</span>
                    ))}
                    {item.technician_names.length > 1 && (
                      <span className="text-[10px] text-surface-600">({item.technician_names.length} assigned)</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-surface-500 mt-1 italic">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Week overview (compact) */}
        {weekItems.length > 0 && (
          <div>
            {items.length > 0 && <div className="h-px bg-surface-700/30 mb-3" />}
            <p className="font-mono text-[10px] text-surface-500 uppercase tracking-wider mb-2">
              {items.length > 0 ? "This Week" : "Upcoming Schedule"}
            </p>
            <div className="space-y-1.5">
              {Array.from(byDate.entries()).map(([date, dayItems]) => {
                const d = new Date(date + "T00:00:00");
                const dayName = DAY_NAMES[d.getDay()] ?? "";
                const isToday = date === today;
                const isPast = date < today;

                return (
                  <div
                    key={date}
                    className={`flex items-center gap-3 px-2 py-1.5 rounded ${
                      isToday ? "bg-neon-green/5" : isPast ? "opacity-40" : ""
                    }`}
                  >
                    <span className={`font-mono text-[10px] w-12 flex-shrink-0 ${isToday ? "text-neon-green font-bold" : "text-surface-500"}`}>
                      {dayName.slice(0, 3)}
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {dayItems.map((item) => (
                        <span key={item.id} className="font-mono text-[10px] text-surface-300">
                          {item.entity_code}
                          <span className="text-surface-600 ml-1">({item.rooms.join(",")})</span>
                        </span>
                      ))}
                    </div>
                    {isToday && <span className="led led-green" />}
                    {isPast && dayItems.every((i) => i.status === "completed") && (
                      <svg className="w-3 h-3 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
