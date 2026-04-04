import { useState, useEffect } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Table } from "../ui/Table";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface AuditEntry {
  id: string;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  created_at: string;
  [key: string]: unknown;
}

const ACTION_VARIANTS: Record<string, "green" | "gold" | "red" | "gray"> = {
  create: "green",
  update: "gold",
  delete: "red",
};

export function AuditLog() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    setIsLoading(true);
    api
      .get<AuditEntry[]>(`/audit-log?limit=${limit}&offset=${offset}`)
      .then(setEntries)
      .catch(() => showToast("error", "Failed to load audit log"))
      .finally(() => setIsLoading(false));
  }, [offset, showToast]);

  const columns = [
    {
      key: "created_at",
      header: "Time",
      render: (r: AuditEntry) =>
        new Date(r.created_at).toLocaleString(),
    },
    { key: "actor_name", header: "Actor" },
    {
      key: "action",
      header: "Action",
      render: (r: AuditEntry) => (
        <Badge variant={ACTION_VARIANTS[r.action] ?? "gray"}>
          {r.action}
        </Badge>
      ),
    },
    { key: "resource_type", header: "Resource" },
    {
      key: "resource_id",
      header: "ID",
      render: (r: AuditEntry) =>
        (r.resource_id ?? "\u2014").slice(0, 8),
    },
    {
      key: "details",
      header: "Details",
      render: (r: AuditEntry) =>
        (r.details ?? "\u2014").slice(0, 60),
    },
  ];

  if (isLoading)
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Audit Log
      </h3>
      <Table
        columns={columns}
        data={entries}
        keyField="id"
        emptyMessage="No audit entries"
      />
      <div className="flex justify-between">
        <Button
          variant="secondary"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={entries.length < limit}
          onClick={() => setOffset(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
