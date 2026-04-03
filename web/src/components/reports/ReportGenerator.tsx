import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import type { Report } from "../../types";

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

const currentYear = new Date().getFullYear();

const yearOptions = [
  { value: String(currentYear), label: String(currentYear) },
  { value: String(currentYear - 1), label: String(currentYear - 1) },
];

const quarterOptions = [
  { value: "1", label: "Q1 (Jan - Mar)" },
  { value: "2", label: "Q2 (Apr - Jun)" },
  { value: "3", label: "Q3 (Jul - Sep)" },
  { value: "4", label: "Q4 (Oct - Dec)" },
];

export function ReportGenerator({ isOpen, onClose, onGenerated }: ReportGeneratorProps) {
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState("1");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleGenerate() {
    setLoading(true);
    try {
      await api.post<Report>("/reports/generate", {
        year: Number(year),
        quarter: Number(quarter),
      });
      showToast("success", "Report generated successfully");
      onGenerated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Quarterly Report">
      <div className="space-y-4">
        <Select
          label="Year"
          options={yearOptions}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />

        <Select
          label="Quarter"
          options={quarterOptions}
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        />

        <p className="text-sm text-gray-500">
          This will aggregate all maintenance data for the selected period and generate a
          DOCX report. This process may take 30-60 seconds.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} isLoading={loading}>
            Generate Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}
