import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Select } from "../components/ui/Select";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { TrendChart } from "../components/dashboard/TrendChart";
import { EntityBreakdown } from "../components/dashboard/EntityBreakdown";
import { CategoryRanking } from "../components/dashboard/CategoryRanking";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { EquipmentHealth } from "../components/dashboard/EquipmentHealth";
import { AlertCards } from "../components/dashboard/AlertCards";
import { ReadinessWidget } from "../components/dashboard/ReadinessWidget";
import { RiskSummary } from "../components/dashboard/RiskSummary";

interface DashboardSummary {
  total: number;
  by_type: Record<string, number>;
  by_month: { month: number; by_type: Record<string, number> }[];
  by_entity: { entity_id?: string; entity_code: string; entity_name: string; count: number }[];
  top_categories: { category_name: string; count: number }[];
  recent_logs: {
    id: number;
    logged_date: string;
    maintenance_type: string;
    description: string;
    status: string;
    org_entity_code: string;
    technician_name: string | null;
  }[];
  equipment_status: Record<string, number>;
  previous?: { total: number; by_type: Record<string, number> };
  alerts?: { type: string; message: string; severity: "high" | "medium" }[];
}

function currentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const QUARTER_OPTIONS = [
  { value: "1", label: "Q1 (Jan-Mar)" },
  { value: "2", label: "Q2 (Apr-Jun)" },
  { value: "3", label: "Q3 (Jul-Sep)" },
  { value: "4", label: "Q4 (Oct-Dec)" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = useState(String(currentQuarter()));
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<DashboardSummary>(
        `/dashboard/summary?year=${year}&quarter=${quarter}`
      );
      setData(result);
    } catch {
      showToast("error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [year, quarter, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="led led-green animate-pulse-slow" />
          <h2 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">System Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/field-log")}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg hover:bg-neon-green/20 hover:shadow-neon-green transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Field Log
          </button>
          <div className="w-28">
            <Select
              options={YEAR_OPTIONS}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              options={QUARTER_OPTIONS}
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
          <span className="font-mono text-xs text-surface-500 animate-pulse">Loading telemetry...</span>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-8">
          {data.alerts && data.alerts.length > 0 && (
            <AlertCards alerts={data.alerts} />
          )}

          <SummaryCards
            total={data.total}
            byType={data.by_type}
            previous={data.previous}
          />

          <div className="opacity-0 animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TrendChart data={data.by_month} />
            <EntityBreakdown
              data={data.by_entity}
              onEntityClick={(id) =>
                navigate(
                  `/dashboard/entity/${id}?year=${year}&quarter=${quarter}`
                )
              }
            />
          </div>

          <div className="opacity-0 animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CategoryRanking data={data.top_categories} />
            <RecentActivity data={data.recent_logs} />
            <ReadinessWidget />
            <RiskSummary />
          </div>
        </div>
      )}
    </div>
  );
}
