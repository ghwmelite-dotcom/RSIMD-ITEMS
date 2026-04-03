import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ReportList } from "../components/reports/ReportList";
import { ReportGenerator } from "../components/reports/ReportGenerator";
import { api } from "../lib/api-client";
import { useAuth } from "../hooks/useAuth";
import type { Report } from "../types";

export function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const canGenerate = user?.role === "lead" || user?.role === "admin";

  async function loadReports() {
    setLoading(true);
    try {
      const data = await api.get<Report[]>("/reports");
      setReports(data);
    } catch {
      // fail silently – empty list shown
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quarterly Reports</h1>
        {canGenerate && (
          <Button onClick={() => setGeneratorOpen(true)}>Generate Report</Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
          </div>
        ) : (
          <ReportList reports={reports} />
        )}
      </Card>

      <ReportGenerator
        isOpen={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onGenerated={loadReports}
      />
    </div>
  );
}
