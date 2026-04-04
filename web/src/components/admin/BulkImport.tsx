import { useState, useRef } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Table } from "../ui/Table";
import { Badge } from "../ui/Badge";

interface ParsedRow {
  type: string;
  make: string;
  model: string;
  processor: string;
  serial_number: string;
  org_entity_id: string;
  room_number: string;
  os_version: string;
  processor_gen: string;
  valid: boolean;
  error?: string;
  [key: string]: unknown;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]!
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });

    const type = row["type"] ?? "";
    const org_entity_id = row["org_entity_id"] ?? row["location"] ?? "";
    const valid = Boolean(type && org_entity_id);

    return {
      type,
      make: row["make"] ?? "",
      model: row["model"] ?? "",
      processor: row["processor"] ?? "",
      serial_number: row["serial_number"] ?? "",
      org_entity_id,
      room_number: row["room_number"] ?? row["room"] ?? "",
      os_version: row["os_version"] ?? row["os"] ?? "",
      processor_gen: row["processor_gen"] ?? "",
      valid,
      error: valid ? undefined : "Missing type or org_entity_id",
    };
  });
}

export function BulkImport() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const validItems = rows
      .filter((r) => r.valid)
      .map(({ valid: _valid, error: _error, ...item }) => item);
    if (validItems.length === 0) {
      showToast("error", "No valid rows to import");
      return;
    }

    setImporting(true);
    try {
      const res = await api.post<{
        imported: number;
        errors: { row: number; message: string }[];
      }>("/equipment/bulk-import", { items: validItems });
      setResult(res);
      showToast("success", `Imported ${res.imported} equipment items`);
    } catch {
      showToast("error", "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows.filter((r) => r.valid).length;

  const previewColumns = [
    { key: "type", header: "Type" },
    { key: "make", header: "Make" },
    { key: "model", header: "Model" },
    { key: "org_entity_id", header: "Location ID" },
    { key: "room_number", header: "Room" },
    { key: "os_version", header: "OS" },
    { key: "processor_gen", header: "Processor" },
    {
      key: "status",
      header: "Status",
      render: (r: ParsedRow) =>
        r.valid ? (
          <Badge variant="green">Valid</Badge>
        ) : (
          <Badge variant="red">{r.error ?? "Invalid"}</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Bulk Equipment Import
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Upload a CSV with columns: type, make, model, processor, serial_number,
        org_entity_id, room_number, os_version, processor_gen
      </p>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          Choose CSV File
        </Button>
        {rows.length > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {rows.length} rows ({validCount} valid)
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <Card padding="sm">
            <Table
              columns={previewColumns}
              data={rows}
              keyField="serial_number"
              emptyMessage="No rows"
            />
          </Card>
          <Button
            onClick={handleImport}
            isLoading={importing}
            disabled={validCount === 0}
          >
            Import {validCount} Items
          </Button>
        </>
      )}

      {result && (
        <Card>
          <p className="text-sm text-ghana-green font-medium">
            Successfully imported {result.imported} items
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-ghana-red font-medium">
                {result.errors.length} errors:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc ml-4 mt-1">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
