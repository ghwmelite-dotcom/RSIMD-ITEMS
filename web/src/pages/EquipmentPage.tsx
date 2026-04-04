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
        <h1 className="text-2xl font-bold text-gray-900">Equipment Registry</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/equipment/aging")}>Fleet Report</Button>
          <Button onClick={() => setFormOpen(true)}>Register Equipment</Button>
        </div>
      </div>

      <Card>
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
