import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";

interface ReportPreviewProps {
  year: number;
  quarter: number;
  onClose: () => void;
  onGenerated: () => void;
}

interface Narratives {
  introduction: string;
  methodology: string;
  conditionBased: string;
  routineNarrative: string;
  correctiveNarrative: string;
  emergencyNarrative: string;
  predictive: string;
  challenges: string;
  recommendations: string;
  conclusion: string;
}

interface PreviewResponse {
  narratives: Narratives;
  tables: {
    routine?: unknown[];
    corrective?: unknown[];
    emergency?: unknown[];
    challenges?: string[];
    recommendations?: string[];
  };
  year: number;
  quarter: number;
}

const SECTIONS: {
  key: keyof Narratives;
  heading: string;
  tableKey?: "routine" | "corrective" | "emergency";
  tableLabel?: string;
  bulletKey?: "challenges" | "recommendations";
  rows?: number;
}[] = [
  { key: "introduction", heading: "1.0 Introduction", rows: 4 },
  { key: "methodology", heading: "2.0 Methodology", rows: 4 },
  { key: "conditionBased", heading: "3.1 Condition-Based", rows: 5 },
  {
    key: "routineNarrative",
    heading: "3.2 Routine Maintenance",
    tableKey: "routine",
    tableLabel: "categories in table",
    rows: 5,
  },
  {
    key: "correctiveNarrative",
    heading: "3.3 Corrective Maintenance",
    tableKey: "corrective",
    tableLabel: "entries",
    rows: 5,
  },
  {
    key: "emergencyNarrative",
    heading: "3.4 Emergency Maintenance",
    tableKey: "emergency",
    tableLabel: "categories",
    rows: 5,
  },
  { key: "predictive", heading: "3.5 Predictive", rows: 5 },
  {
    key: "challenges",
    heading: "4.0 Challenges",
    bulletKey: "challenges",
    rows: 6,
  },
  {
    key: "recommendations",
    heading: "5.0 Recommendations",
    bulletKey: "recommendations",
    rows: 6,
  },
  { key: "conclusion", heading: "6.0 Conclusion", rows: 5 },
];

export function ReportPreview({
  year,
  quarter,
  onClose,
  onGenerated,
}: ReportPreviewProps) {
  const [narratives, setNarratives] = useState<Narratives | null>(null);
  const [tables, setTables] = useState<PreviewResponse["tables"]>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function fetchPreview() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post<PreviewResponse>("/reports/preview", {
          year,
          quarter,
        });
        if (!cancelled) {
          setNarratives(data.narratives);
          setTables(data.tables ?? {});
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load preview";
          setError(message);
          showToast("error", message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [year, quarter]);

  function updateNarrative(key: keyof Narratives, value: string) {
    if (!narratives) return;
    setNarratives({ ...narratives, [key]: value });
  }

  async function handleGenerate() {
    if (!narratives) return;
    setGenerating(true);
    try {
      await api.post("/reports/generate", { year, quarter, narratives });
      showToast("success", "Report generated successfully");
      onGenerated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate report";
      showToast("error", message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin h-10 w-10 border-4 border-ghana-green border-t-transparent rounded-full" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Generating AI narratives for Q{quarter} {year}...
        </p>
      </div>
    );
  }

  if (error || !narratives) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">
          {error ?? "Failed to load preview data."}
        </p>
        <Button variant="secondary" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          &larr; Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Report Preview — Q{quarter} {year}
        </h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Review and edit the AI-generated narratives below, then click "Generate
        DOCX" to produce the final report.
      </p>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const tableCount = section.tableKey
          ? (tables[section.tableKey] as unknown[] | undefined)?.length ?? 0
          : 0;
        const bullets = section.bulletKey
          ? (tables[section.bulletKey] as string[] | undefined) ?? []
          : [];

        return (
          <Card key={section.key}>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {section.heading}
            </h2>

            {/* Bullet list for challenges / recommendations */}
            {bullets.length > 0 && (
              <ul className="mb-3 space-y-1 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                {bullets.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 text-sm leading-relaxed focus:ring-2 focus:ring-ghana-green focus:border-transparent resize-y"
              rows={section.rows ?? 5}
              value={narratives[section.key]}
              onChange={(e) => updateNarrative(section.key, e.target.value)}
            />

            {/* Table data summary */}
            {section.tableKey && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {tableCount} {section.tableLabel}
              </p>
            )}
          </Card>
        );
      })}

      {/* Generate button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        isLoading={generating}
      >
        Generate DOCX
      </Button>
    </div>
  );
}
