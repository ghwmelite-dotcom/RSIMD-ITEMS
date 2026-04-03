import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EquipmentList } from "../components/equipment/EquipmentList";
import { EquipmentForm } from "../components/equipment/EquipmentForm";

export function EquipmentPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Equipment Registry</h1>
        <Button onClick={() => setFormOpen(true)}>Register Equipment</Button>
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
