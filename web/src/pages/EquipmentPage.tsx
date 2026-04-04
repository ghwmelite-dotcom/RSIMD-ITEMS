import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EquipmentList } from "../components/equipment/EquipmentList";
import { EquipmentForm } from "../components/equipment/EquipmentForm";

export function EquipmentPage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="led led-green" />
          <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
            Equipment Registry
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/equipment/aging")}
            className="!bg-blue-500/10 !text-blue-400 !border-blue-500/30 hover:!bg-blue-500/20"
          >
            Fleet Report
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Register Equipment
          </Button>
        </div>
      </div>

      <Card padding="sm">
        <EquipmentList refreshKey={refreshKey} />
      </Card>

      <EquipmentForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
