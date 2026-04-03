import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { StatusPill } from "../components/ui/StatusPill";
import { EquipmentDetail } from "../components/equipment/EquipmentDetail";
import { EquipmentForm } from "../components/equipment/EquipmentForm";
import { MAINTENANCE_TYPES } from "../lib/constants";
import type { Equipment, MaintenanceLog, OrgEntity } from "../types";

const maintenanceTypeMap = new Map<string, string>(MAINTENANCE_TYPES.map((t) => [t.value, t.label]));

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([
      api.get<{ equipment: Equipment; maintenance_history: MaintenanceLog[] }>(`/equipment/${id}`),
      api.get<OrgEntity[]>("/org-entities"),
    ])
      .then(([eqData, orgData]) => {
        setEquipment(eqData.equipment);
        setHistory(eqData.maintenance_history);
        setEntities(orgData);
      })
      .catch(() => {
        navigate("/equipment");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!equipment) return null;

  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const entityName = entityMap.get(equipment.org_entity_id)
    ? `${entityMap.get(equipment.org_entity_id)!.code} — ${entityMap.get(equipment.org_entity_id)!.name}`
    : "—";

  type Row = Record<string, unknown>;
  const historyColumns = [
    {
      key: "logged_date",
      header: "Date",
      render: (row: Row) => new Date(String(row.logged_date)).toLocaleDateString(),
    },
    {
      key: "maintenance_type",
      header: "Type",
      render: (row: Row) => maintenanceTypeMap.get(String(row.maintenance_type)) ?? String(row.maintenance_type),
    },
    { key: "description", header: "Description" },
    {
      key: "status",
      header: "Status",
      render: (row: Row) => <StatusPill status={String(row.status)} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate("/equipment")}>
          &larr; Back
        </Button>
        <Button onClick={() => setEditOpen(true)}>Edit</Button>
      </div>

      <EquipmentDetail equipment={equipment} entityName={entityName} />

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance History</h2>
        <Table
          columns={historyColumns}
          data={history as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage="No maintenance records yet"
        />
      </Card>

      <EquipmentForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => window.location.reload()}
        editing={equipment}
      />
    </div>
  );
}
