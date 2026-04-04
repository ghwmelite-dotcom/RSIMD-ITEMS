import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = "No data found",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
        <thead className="bg-surface-50 dark:bg-surface-950">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-200 dark:divide-surface-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-surface-500 dark:text-surface-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800" : ""}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100 whitespace-nowrap">
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
