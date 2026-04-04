import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { HealthScoreBar } from "../components/equipment/HealthScoreBar";
import { api } from "../lib/api-client";
import { exportToCsv } from "../lib/export-csv";

interface FlaggedItem {
  id: string;
  asset_tag: string;
  type: string;
  make: string;
  model: string;
  os_version: string;
  processor_gen: string;
  health_score: number;
  reasons: string[];
}

interface AgingData {
  total_equipment: number;
  age_distribution: Record<string, number>;
  os_distribution: Record<string, number>;
  flagged: FlaggedItem[];
}

const OS_COLORS: Record<string, string> = {
  "Windows 10 Pro": "#CE1126",
  "Windows 10 Home": "#CE1126",
  "Windows 11 Pro": "#006B3F",
  "Windows 11 Home": "#006B3F",
  "Not set": "#9CA3AF",
};

const DEFAULT_PIE_COLOR = "#6B7280";

function getOsColor(name: string): string {
  return OS_COLORS[name] ?? DEFAULT_PIE_COLOR;
}

function isRedReason(reason: string): boolean {
  const lower = reason.toLowerCase();
  return lower.includes("eol") || lower.includes("cannot");
}

export function AgingReportPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.get<AgingData>("/equipment/aging");
        setData(result);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleExport() {
    if (!data) return;
    exportToCsv(
      "aging-fleet-flagged",
      [
        { key: "asset_tag", header: "Asset Tag" },
        { key: "type", header: "Type" },
        { key: "make_model", header: "Make/Model" },
        { key: "os_version", header: "OS" },
        { key: "processor_gen", header: "Processor" },
        { key: "health_score", header: "Health Score" },
        { key: "reasons", header: "Issues" },
      ],
      data.flagged.map((item) => ({
        asset_tag: item.asset_tag,
        type: item.type,
        make_model: `${item.make} ${item.model}`,
        os_version: item.os_version,
        processor_gen: item.processor_gen,
        health_score: item.health_score,
        reasons: item.reasons.join("; "),
      }))
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
        <span className="font-mono text-[10px] text-surface-500">Loading aging report...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate("/equipment")}>
            &larr; Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="led led-red" />
            <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
              Aging Fleet Report
            </h1>
          </div>
        </div>
        <Card padding="sm">
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="font-mono text-xs text-surface-500">
              Failed to load aging report data.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const ageChartData = Object.entries(data.age_distribution).map(
    ([name, value]) => ({ name, value })
  );

  const osChartData = Object.entries(data.os_distribution).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate("/equipment")}>
          &larr; Back
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <span className="led led-green" />
            <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
              Aging Fleet Report
            </h1>
          </div>
          <p className="font-mono text-[10px] text-surface-500 mt-1 ml-6">
            {data.total_equipment} total equipment
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <Card padding="sm">
          <h2 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider mb-4">
            Age Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageChartData}
                layout="vertical"
                margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={70} />
                <Tooltip />
                <Bar dataKey="value" fill="#39FF14" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* OS Distribution */}
        <Card padding="sm">
          <h2 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider mb-4">
            OS Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={osChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: { name?: string; percent?: number }) =>
                    `${props.name ?? ""} (${((props.percent ?? 0) * 100).toFixed(0)}%)`
                  }
                >
                  {osChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={getOsColor(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Flagged Equipment */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider">
            Needs Replacement
          </h2>
          {data.flagged.length > 0 && (
            <button
              onClick={handleExport}
              className="font-mono text-[10px] text-surface-400 hover:text-neon-green uppercase tracking-wider transition-colors"
            >
              Export CSV &darr;
            </button>
          )}
        </div>

        {data.flagged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-mono text-xs text-surface-500">
              No equipment flagged for replacement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    Asset Tag
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    Make/Model
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    OS
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    Processor
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {data.flagged.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/equipment/${item.id}`)}
                    className="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-surface-900 dark:text-surface-100 whitespace-nowrap">
                      {item.asset_tag}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300 capitalize whitespace-nowrap">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300 whitespace-nowrap">
                      {item.make} {item.model}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-surface-700 dark:text-surface-300 whitespace-nowrap">
                      {item.os_version}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-surface-700 dark:text-surface-300 whitespace-nowrap">
                      {item.processor_gen}
                    </td>
                    <td className="px-4 py-3 w-32">
                      <HealthScoreBar score={item.health_score} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.reasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant={isRedReason(reason) ? "red" : "gold"}
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
