import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ReportList } from "../components/reports/ReportList";
import { ReportGenerator } from "../components/reports/ReportGenerator";
import { ReportPreview } from "../components/reports/ReportPreview";
import { api } from "../lib/api-client";
import { useAuth } from "../hooks/useAuth";
import type { Report } from "../types";

export function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<{ year: number; quarter: number } | null>(null);

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

  if (previewConfig) {
    return (
      <ReportPreview
        year={previewConfig.year}
        quarter={previewConfig.quarter}
        onClose={() => setPreviewConfig(null)}
        onGenerated={() => {
          setPreviewConfig(null);
          loadReports();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="led led-green" />
          <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
            Quarterly Reports
          </h1>
        </div>
        {canGenerate && (
          <Button onClick={() => setGeneratorOpen(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Report
          </Button>
        )}
      </div>

      <Card padding="sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
            <span className="font-mono text-[10px] text-surface-500">Loading reports...</span>
          </div>
        ) : (
          <ReportList reports={reports} />
        )}
      </Card>

      <ReportGenerator
        isOpen={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onPreview={(year, quarter) => setPreviewConfig({ year, quarter })}
      />
    </div>
  );
}
