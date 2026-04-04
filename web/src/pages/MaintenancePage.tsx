import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { LogList } from "../components/maintenance/LogList";
import { LogForm } from "../components/maintenance/LogForm";

export function MaintenancePage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="led led-green" />
          <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Maintenance Logs</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/field-log")}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-neon-blue border border-neon-blue/30 rounded-lg hover:bg-neon-blue/10 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Field Log
          </button>
          <Button onClick={() => setFormOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log Activity
            </span>
          </Button>
        </div>
      </div>

      {/* Log list */}
      <Card padding="sm">
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
