import { useState } from "react";
import { Table } from "../ui/Table";
import { StatusPill } from "../ui/StatusPill";
import { Button } from "../ui/Button";
import { API_BASE } from "../../lib/constants";
import type { Report } from "../../types";

interface ReportListProps {
  reports: Report[];
}

export function ReportList({ reports }: ReportListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(report: Report) {
    setDownloadingId(report.id);
    try {
      const token = localStorage.getItem("rsimd_items_token");
      const res = await fetch(`${API_BASE}/reports/${report.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail – user sees no file downloaded
    } finally {
      setDownloadingId(null);
    }
  }

  const columns = [
    {
      key: "title",
      header: "Report",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as Report;
        return <span className="font-medium text-gray-900">{r.title}</span>;
      },
    },
    {
      key: "quarter",
      header: "Quarter",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as Report;
        return `Q${r.quarter} ${r.year}`;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as Report;
        return <StatusPill status={r.status} />;
      },
    },
    {
      key: "created_at",
      header: "Generated",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as Report;
        return r.created_at.slice(0, 10);
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as Report;
        return r.file_url ? (
          <Button
            size="sm"
            variant="secondary"
            isLoading={downloadingId === r.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(r);
            }}
          >
            Download
          </Button>
        ) : (
          <span className="text-sm text-gray-400">--</span>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={reports as unknown as Record<string, unknown>[]}
      keyField="id"
      emptyMessage="No reports generated yet"
    />
  );
}
