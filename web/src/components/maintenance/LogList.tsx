import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { MAINTENANCE_TYPES } from "../../lib/constants";
import { exportToCsv } from "../../lib/export-csv";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import type { MaintenanceLog, OrgEntity, MaintenanceCategory } from "../../types";

interface LogListProps {
  refreshKey: number;
}

const currentYear = new Date().getFullYear();

const YEAR_OPTIONS = [
  { value: "", label: "All Years" },
  { value: String(currentYear), label: String(currentYear) },
  { value: String(currentYear - 1), label: String(currentYear - 1) },
];

const QUARTER_OPTIONS = [
  { value: "", label: "All Quarters" },
  { value: "1", label: "Q1" },
  { value: "2", label: "Q2" },
  { value: "3", label: "Q3" },
  { value: "4", label: "Q4" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  ...MAINTENANCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

const TYPE_BADGE: Record<string, { label: string; variant: "green" | "gold" | "red" | "gray" }> = {
  routine: { label: "RTN", variant: "green" },
  corrective: { label: "COR", variant: "gold" },
  emergency: { label: "EMR", variant: "red" },
  condition_based: { label: "CND", variant: "gray" },
  predictive: { label: "PRD", variant: "gray" },
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export function LogList({ refreshKey }: LogListProps) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<OrgEntity[]>("/org-entities"),
      api.get<MaintenanceCategory[]>("/categories"),
    ])
      .then(([ents, cats]) => { setEntities(ents); setCategories(cats); })
      .catch(() => {});
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("year", filterYear);
      if (filterQuarter) params.set("quarter", filterQuarter);
      if (filterType) params.set("maintenance_type", filterType);
      if (filterLocation) params.set("org_entity_id", filterLocation);
      const qs = params.toString();
      const data = await api.get<MaintenanceLog[]>(`/maintenance${qs ? `?${qs}` : ""}`);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterQuarter, filterType, filterLocation]);

  useEffect(() => { loadLogs(); }, [loadLogs, refreshKey]);

  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const typeMap = new Map<string, string>(MAINTENANCE_TYPES.map((t) => [t.value, t.label]));

  const locationOptions = [
    { value: "", label: "All Locations" },
    ...entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })),
  ];

  function handleExport() {
    const exportData = logs.map((log) => ({
      logged_date: log.logged_date ? new Date(log.logged_date).toLocaleDateString() : "",
      maintenance_type: typeMap.get(log.maintenance_type) ?? log.maintenance_type,
      category: log.category_id ? categoryMap.get(log.category_id)?.name ?? "" : "",
      location: entityMap.get(log.org_entity_id)?.code ?? "",
      room_number: log.room_number ?? "",
      description: log.description ?? "",
      status: log.status,
    }));
    exportToCsv("maintenance-logs", [
      { key: "logged_date", header: "Date" },
      { key: "maintenance_type", header: "Type" },
      { key: "category", header: "Category" },
      { key: "location", header: "Location" },
      { key: "room_number", header: "Room" },
      { key: "description", header: "Description" },
      { key: "status", header: "Status" },
    ], exportData);
  }

  return (
    <div>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Select options={YEAR_OPTIONS} value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
            <Select options={QUARTER_OPTIONS} value={filterQuarter} onChange={(e) => setFilterQuarter(e.target.value)} />
            <Select options={TYPE_OPTIONS} value={filterType} onChange={(e) => setFilterType(e.target.value)} />
            <Select options={locationOptions} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-surface-500">{logs.length} logs</span>
            <button
              onClick={handleExport}
              className="font-mono text-[10px] text-surface-400 hover:text-neon-green uppercase tracking-wider transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
          <span className="font-mono text-[10px] text-surface-500">Loading logs...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="w-10 h-10 mx-auto text-surface-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-mono text-xs text-surface-500">No maintenance logs found</p>
          <p className="text-[10px] text-surface-600 mt-1">Try adjusting your filters or log a new activity</p>
        </div>
      ) : (
        /* Log entries */
        <div className="divide-y divide-surface-100 dark:divide-surface-800/30">
          {logs.map((log) => {
            const entity = entityMap.get(log.org_entity_id);
            const category = log.category_id ? categoryMap.get(log.category_id) : null;
            const typeCfg = TYPE_BADGE[log.maintenance_type];
            const desc = stripHtml(log.description);

            return (
              <div key={log.id} className="px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/20 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Type badge */}
                  <Badge variant={typeCfg?.variant ?? "gray"} className="mt-0.5 flex-shrink-0">
                    {typeCfg?.label ?? "???"}
                  </Badge>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-900 dark:text-surface-100 leading-snug">
                      {desc.length > 80 ? desc.slice(0, 80) + "..." : desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="font-mono text-[10px] text-surface-500">
                        {new Date(log.logged_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      {entity && (
                        <span className="font-mono text-[10px] text-neon-green/70">{entity.code}</span>
                      )}
                      {log.room_number && (
                        <span className="font-mono text-[10px] text-surface-400">Rm {log.room_number}</span>
                      )}
                      {category && (
                        <span className="text-[10px] text-surface-400">{category.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className={`led ${log.status === "completed" ? "led-green" : log.status === "in_progress" ? "led-amber" : log.status === "escalated" ? "led-red" : "led-blue"}`} />
                    <span className="font-mono text-[10px] text-surface-500 hidden sm:inline">
                      {log.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Resolution (if exists) */}
                {log.resolution && (
                  <div className="ml-11 mt-1.5 text-[11px] text-surface-400 italic">
                    Resolution: {log.resolution.length > 100 ? log.resolution.slice(0, 100) + "..." : log.resolution}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
