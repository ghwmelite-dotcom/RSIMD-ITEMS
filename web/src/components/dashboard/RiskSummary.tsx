import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { api } from "../../lib/api-client";

interface AgingItem {
  health_score: number;
  os_name: string;
  flagged: boolean;
}

interface RiskCounts {
  critical: number;
  eol: number;
  flagged: number;
}

export function RiskSummary() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<RiskCounts | null>(null);

  useEffect(() => {
    api
      .get<AgingItem[]>("/equipment/aging")
      .then((items) => {
        setCounts({
          critical: items.filter((i) => i.health_score < 40).length,
          eol: items.filter((i) =>
            i.os_name?.toLowerCase().includes("windows 10")
          ).length,
          flagged: items.filter((i) => i.flagged).length,
        });
      })
      .catch(() => {
        /* silently fail */
      });
  }, []);

  if (!counts) return null;

  return (
    <Card>
      <h3 className="font-display text-lg text-surface-900 dark:text-surface-100 mb-4">
        Equipment Risk
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-500 dark:text-surface-400">
            Critical Health (&lt;40)
          </span>
          <span className="text-lg font-bold text-ghana-red">{counts.critical}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-500 dark:text-surface-400">
            Windows 10 EOL
          </span>
          <span className="text-lg font-bold text-ghana-red">{counts.eol}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-500 dark:text-surface-400">
            Flagged Total
          </span>
          <span className="text-lg font-bold text-yellow-600">{counts.flagged}</span>
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/equipment/aging")}
          className="w-full"
        >
          View Fleet Report
        </Button>
      </div>
    </Card>
  );
}
