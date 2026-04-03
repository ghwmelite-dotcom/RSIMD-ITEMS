import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api-client";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } from "../../lib/constants";
import { exportToCsv } from "../../lib/export-csv";
import { Select } from "../ui/Select";
import { Table } from "../ui/Table";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";
import type { Equipment, OrgEntity } from "../../types";

interface EquipmentListProps {
  refreshKey: number;
}

export function EquipmentList({ refreshKey }: EquipmentListProps) {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterLocation, setFilterLocation] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLocation) params.set("org_entity_id", filterLocation);
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const qs = params.toString();
      const data = await api.get<Equipment[]>(`/equipment${qs ? `?${qs}` : ""}`);
      setEquipment(data);
    } catch {
      // silently fail — empty table will show
    } finally {
      setLoading(false);
    }
  }, [filterLocation, filterType, filterStatus]);

  useEffect(() => {
    api.get<OrgEntity[]>("/org-entities").then(setEntities).catch(() => {});
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment, refreshKey]);

  const entityMap = new Map(entities.map((e) => [e.id, e]));

  const typeOptions = [{ value: "", label: "All Types" }, ...EQUIPMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))];
  const statusOptions = [{ value: "", label: "All Statuses" }, ...EQUIPMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))];
  const locationOptions = [
    { value: "", label: "All Locations" },
    ...entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })),
  ];

  const typeMap = new Map<string, string>(EQUIPMENT_TYPES.map((t) => [t.value, t.label]));

  type Row = Record<string, unknown>;
  const columns = [
    { key: "asset_tag", header: "Asset Tag" },
    {
      key: "type",
      header: "Type",
      render: (row: Row) => typeMap.get(String(row.type)) ?? String(row.type),
    },
    {
      key: "make_model",
      header: "Make / Model",
      render: (row: Row) =>
        [row.make, row.model].filter(Boolean).join(" ") || "—",
    },
    {
      key: "location",
      header: "Location",
      render: (row: Row) => entityMap.get(String(row.org_entity_id))?.code ?? "—",
    },
    { key: "room_number", header: "Room" },
    {
      key: "status",
      header: "Status",
      render: (row: Row) => <StatusPill status={String(row.status)} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <Select
            options={locationOptions}
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            placeholder="All Locations"
          />
          <Select
            options={typeOptions}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            placeholder="All Types"
          />
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder="All Statuses"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const exportData = equipment.map((e) => ({
              asset_tag: e.asset_tag,
              type: typeMap.get(e.type) ?? e.type,
              make: e.make ?? "",
              model: e.model ?? "",
              location: entityMap.get(e.org_entity_id)?.code ?? "",
              room_number: e.room_number ?? "",
              status: e.status,
            }));
            exportToCsv("equipment", [
              { key: "asset_tag", header: "Asset Tag" },
              { key: "type", header: "Type" },
              { key: "make", header: "Make" },
              { key: "model", header: "Model" },
              { key: "location", header: "Location" },
              { key: "room_number", header: "Room" },
              { key: "status", header: "Status" },
            ], exportData);
          }}
        >
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={equipment as unknown as Record<string, unknown>[]}
          keyField="id"
          onRowClick={(row) => navigate(`/equipment/${(row as unknown as Equipment).id}`)}
          emptyMessage="No equipment found"
        />
      )}
    </div>
  );
}
