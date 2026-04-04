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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
        <span className="font-mono text-[10px] text-surface-500">Loading equipment...</span>
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
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate("/equipment")}>
            &larr; Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="led led-green" />
            <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
              {equipment.asset_tag}
            </h1>
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit
        </Button>
      </div>

      <EquipmentDetail equipment={equipment} entityName={entityName} />

      <Card padding="sm">
        <h2 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider mb-4">
          Maintenance History
        </h2>
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
