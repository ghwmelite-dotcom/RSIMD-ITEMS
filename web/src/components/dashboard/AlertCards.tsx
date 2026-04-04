import { useState } from "react";

interface Alert {
  type: string;
  message: string;
  severity: "high" | "medium";
}

interface AlertCardsProps {
  alerts: Alert[];
}

const STORAGE_KEY = "rsimd_dismissed_alerts";

function getDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function alertKey(alert: Alert): string {
  return `${alert.type}::${alert.message}`;
}

export function AlertCards({ alerts }: AlertCardsProps) {
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  const visible = alerts.filter((a) => !dismissed.includes(alertKey(a)));

  if (visible.length === 0) return null;

  function dismiss(alert: Alert) {
    const key = alertKey(alert);
    const next = [...dismissed, key];
    setDismissed(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="space-y-3">
      {visible.map((alert) => {
        const isHigh = alert.severity === "high";

        return (
          <div
            key={alertKey(alert)}
            className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
              isHigh
                ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"
                : "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950"
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isHigh
                    ? "text-red-700 dark:text-red-300"
                    : "text-yellow-700 dark:text-yellow-300"
                }`}
              >
                {alert.type}
              </p>
              <p
                className={`mt-0.5 text-sm ${
                  isHigh
                    ? "text-red-800 dark:text-red-200"
                    : "text-yellow-800 dark:text-yellow-200"
                }`}
              >
                {alert.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => dismiss(alert)}
              className={`shrink-0 rounded p-1 transition-colors ${
                isHigh
                  ? "text-red-500 hover:bg-red-200 dark:hover:bg-red-800"
                  : "text-yellow-600 hover:bg-yellow-200 dark:hover:bg-yellow-800"
              }`}
              aria-label="Dismiss alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
