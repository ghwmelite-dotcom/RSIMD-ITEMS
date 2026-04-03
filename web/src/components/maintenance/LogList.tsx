import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { MAINTENANCE_TYPES } from "../../lib/constants";
import { Select } from "../ui/Select";
import { Table } from "../ui/Table";
import { StatusPill } from "../ui/StatusPill";
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
      .then(([ents, cats]) => {
        setEntities(ents);
        setCategories(cats);
      })
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
      // empty table on failure
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterQuarter, filterType, filterLocation]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs, refreshKey]);

  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const typeMap = new Map<string, string>(MAINTENANCE_TYPES.map((t) => [t.value, t.label]));

  const locationOptions = [
    { value: "", label: "All Locations" },
    ...entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })),
  ];

  type Row = Record<string, unknown>;
  const columns = [
    {
      key: "logged_date",
      header: "Date",
      render: (row: Row) => {
        const d = String(row.logged_date ?? "");
        return d ? new Date(d).toLocaleDateString() : "—";
      },
    },
    {
      key: "maintenance_type",
      header: "Type",
      render: (row: Row) => typeMap.get(String(row.maintenance_type)) ?? String(row.maintenance_type),
    },
    {
      key: "category_id",
      header: "Category",
      render: (row: Row) => {
        const catId = row.category_id as string | null;
        return catId ? categoryMap.get(catId)?.name ?? "—" : "—";
      },
    },
    {
      key: "org_entity_id",
      header: "Location",
      render: (row: Row) => entityMap.get(String(row.org_entity_id))?.code ?? "—",
    },
    { key: "room_number", header: "Room" },
    {
      key: "description",
      header: "Description",
      render: (row: Row) => {
        const desc = String(row.description ?? "");
        return desc.length > 60 ? `${desc.slice(0, 60)}...` : desc;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: Row) => <StatusPill status={String(row.status)} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Select
          options={YEAR_OPTIONS}
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        />
        <Select
          options={QUARTER_OPTIONS}
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
        />
        <Select
          options={TYPE_OPTIONS}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        />
        <Select
          options={locationOptions}
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={logs as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage="No maintenance logs found"
        />
      )}
    </div>
  );
}
