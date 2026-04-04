import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { CategoryRanking } from "../components/dashboard/CategoryRanking";
import { RecentActivity } from "../components/dashboard/RecentActivity";

interface EntityDetailData {
  entity: { id: string; name: string; code: string; type: string };
  total: number;
  by_type: Record<string, number>;
  by_room: { room: string; count: number }[];
  by_category: { category_name: string; count: number }[];
  by_equipment: {
    asset_tag: string;
    type: string;
    make: string | null;
    model: string | null;
    count: number;
  }[];
  recent_logs: {
    id: string;
    logged_date: string;
    maintenance_type: string;
    description: string;
    status: string;
    org_entity_code: string;
    technician_name: string;
  }[];
}

function currentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const quarter = searchParams.get("quarter") ?? String(currentQuarter());

  const [data, setData] = useState<EntityDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await api.get<EntityDetailData>(
        `/dashboard/entity/${id}?year=${year}&quarter=${quarter}`
      );
      setData(result);
    } catch {
      showToast("error", "Failed to load entity details");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, year, quarter, showToast, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ghana-green border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const roomHeight = Math.max(200, data.by_room.length * 40);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {data.entity.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.entity.code} &middot; Q{quarter} {year}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
          &larr; Back to Dashboard
        </Button>
      </div>

      <div className="space-y-6">
        <SummaryCards total={data.total} byType={data.by_type} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              By Room
            </h3>
            <ResponsiveContainer width="100%" height={roomHeight}>
              <BarChart data={data.by_room} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="room"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => [String(value), "Count"]} />
                <Bar dataKey="count" fill="#006B3F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <CategoryRanking data={data.by_category} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Top Equipment
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">
                      Asset Tag
                    </th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">
                      Make / Model
                    </th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">
                      Logs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_equipment.map((eq) => (
                    <tr
                      key={eq.asset_tag}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <td className="py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                        {eq.asset_tag}
                      </td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">
                        {eq.type}
                      </td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">
                        {[eq.make, eq.model].filter(Boolean).join(" ") || "---"}
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {eq.count}
                      </td>
                    </tr>
                  ))}
                  {data.by_equipment.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-gray-400"
                      >
                        No equipment data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <RecentActivity data={data.recent_logs} />
        </div>
      </div>
    </div>
  );
}
