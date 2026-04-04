import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EquipmentDetail } from "../components/equipment/EquipmentDetail";
import { EquipmentForm } from "../components/equipment/EquipmentForm";
import { EquipmentTimeline } from "../components/equipment/EquipmentTimeline";
import type { Equipment, MaintenanceLog, OrgEntity } from "../types";

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Maintenance History</h2>
        <EquipmentTimeline
          history={history}
          registeredDate={equipment.installed_date ?? new Date().toISOString()}
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
