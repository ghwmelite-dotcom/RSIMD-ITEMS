import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { LogList } from "../components/maintenance/LogList";
import { LogForm } from "../components/maintenance/LogForm";

export function MaintenancePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Logs</h1>
        <Button onClick={() => setFormOpen(true)}>Log Activity</Button>
      </div>

      <Card>
        <LogList refreshKey={refreshKey} />
      </Card>

      <LogForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
