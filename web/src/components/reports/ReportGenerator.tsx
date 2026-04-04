import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (year: number, quarter: number) => void;
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

export function ReportGenerator({ isOpen, onClose, onPreview }: ReportGeneratorProps) {
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState("1");

  function handlePreview() {
    onPreview(Number(year), Number(quarter));
    onClose();
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

        <p className="text-sm text-gray-500 dark:text-gray-400">
          This will generate an AI-powered preview of the report narratives. You
          can review and edit them before producing the final DOCX.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePreview}>
            Generate Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
}
