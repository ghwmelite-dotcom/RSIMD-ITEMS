import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Card } from "../ui/Card";
import { Table } from "../ui/Table";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";

interface WorkloadEntry {
  id: string;
  name: string;
  total: number;
  by_type: Record<string, number>;
  entities: string[];
  [key: string]: unknown;
}

const currentYear = new Date().getFullYear();
const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

export function TechnicianWorkload() {
  const { showToast } = useToast();
  const [data, setData] = useState<WorkloadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState(String(currentQuarter));

  useEffect(() => {
    setIsLoading(true);
    api
      .get<{ technicians: WorkloadEntry[] }>(
        `/dashboard/workload?year=${year}&quarter=${quarter}`
      )
      .then((res) => setData(res.technicians))
      .catch(() => showToast("error", "Failed to load workload"))
      .finally(() => setIsLoading(false));
  }, [year, quarter, showToast]);

  const columns = [
    { key: "name", header: "Technician" },
    { key: "total", header: "Total Logs" },
    {
      key: "routine",
      header: "Routine",
      render: (r: WorkloadEntry) => r.by_type?.routine ?? 0,
    },
    {
      key: "corrective",
      header: "Corrective",
      render: (r: WorkloadEntry) => r.by_type?.corrective ?? 0,
    },
    {
      key: "emergency",
      header: "Emergency",
      render: (r: WorkloadEntry) => r.by_type?.emergency ?? 0,
    },
    {
      key: "entities",
      header: "Covers",
      render: (r: WorkloadEntry) => (
        <div className="flex flex-wrap gap-1">
          {(r.entities ?? []).map((e) => (
            <Badge key={e} variant="green">
              {e}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  if (isLoading)
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Technician Workload
        </h3>
        <Select
          options={[
            { value: String(currentYear), label: String(currentYear) },
            { value: String(currentYear - 1), label: String(currentYear - 1) },
          ]}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <Select
          options={[
            { value: "1", label: "Q1" },
            { value: "2", label: "Q2" },
            { value: "3", label: "Q3" },
            { value: "4", label: "Q4" },
          ]}
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        />
      </div>

      {data.length > 0 && (
        <Card>
          <ResponsiveContainer
            width="100%"
            height={Math.max(150, data.length * 40)}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar dataKey="total" fill="#006B3F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Table
        columns={columns}
        data={data}
        keyField="id"
        emptyMessage="No workload data for this quarter"
      />
    </div>
  );
}
