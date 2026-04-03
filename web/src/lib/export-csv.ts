export function exportToCsv(
  filename: string,
  columns: { key: string; header: string }[],
  data: Record<string, unknown>[]
): void {
  const headers = columns.map((c) => escapeCsvValue(c.header));
  const rows = data.map((row) =>
    columns.map((c) => escapeCsvValue(String(row[c.key] ?? "")))
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
