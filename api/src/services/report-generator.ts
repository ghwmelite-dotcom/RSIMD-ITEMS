import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
} from "docx";
import type { AllNarratives } from "./ai-narrator";

interface MonthlyData {
  category: string;
  months: Record<number, number>;
  total: number;
}

interface CorrectiveSummaryRow {
  category: string;
  count: number;
}

interface CorrectiveEntityRow {
  entity: string;
  room: string;
  issues: number;
}

interface ReportContent {
  quarter: number;
  year: number;
  narratives: AllNarratives;
  tables: {
    routineByCategory: MonthlyData[];
    correctiveSummary: CorrectiveSummaryRow[];
    correctiveByEntity: CorrectiveEntityRow[];
    emergencyByCategory: MonthlyData[];
  };
}

const QUARTER_MONTHS: Record<number, [string, string, string]> = {
  1: ["January", "February", "March"],
  2: ["April", "May", "June"],
  3: ["July", "August", "September"],
  4: ["October", "November", "December"],
};

function quarterStartMonth(quarter: number): number {
  return (quarter - 1) * 3 + 1;
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, font: "Arial", size: 20 }),
        ],
      }),
    ],
    shading: { fill: "D9E2F3" },
  });
}

function cell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: "Arial", size: 20 })],
      }),
    ],
  });
}

function buildMonthlyTable(
  data: MonthlyData[],
  startMonth: number
): Table {
  const monthNames = QUARTER_MONTHS[Math.ceil(startMonth / 3)] ?? [
    "Month 1",
    "Month 2",
    "Month 3",
  ];

  const headerRow = new TableRow({
    children: [
      headerCell("Description"),
      headerCell(monthNames[0]),
      headerCell(monthNames[1]),
      headerCell(monthNames[2]),
      headerCell("Total"),
    ],
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: [
          cell(row.category),
          cell(String(row.months[startMonth] ?? 0)),
          cell(String(row.months[startMonth + 1] ?? 0)),
          cell(String(row.months[startMonth + 2] ?? 0)),
          cell(String(row.total)),
        ],
      })
  );

  // Grand total row
  const grandTotal = data.reduce((sum, r) => sum + r.total, 0);
  const m1Total = data.reduce(
    (sum, r) => sum + (r.months[startMonth] ?? 0),
    0
  );
  const m2Total = data.reduce(
    (sum, r) => sum + (r.months[startMonth + 1] ?? 0),
    0
  );
  const m3Total = data.reduce(
    (sum, r) => sum + (r.months[startMonth + 2] ?? 0),
    0
  );

  const totalRow = new TableRow({
    children: [
      headerCell("Total"),
      headerCell(String(m1Total)),
      headerCell(String(m2Total)),
      headerCell(String(m3Total)),
      headerCell(String(grandTotal)),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });
}

function buildCorrectiveSummaryTable(
  data: CorrectiveSummaryRow[]
): Table {
  const headerRow = new TableRow({
    children: [headerCell("Category"), headerCell("Count")],
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: [cell(row.category), cell(String(row.count))],
      })
  );

  const totalRow = new TableRow({
    children: [
      headerCell("Total"),
      headerCell(String(data.reduce((sum, r) => sum + r.count, 0))),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });
}

function buildCorrectiveEntityTable(
  data: CorrectiveEntityRow[]
): Table {
  const headerRow = new TableRow({
    children: [
      headerCell("Entity/Department"),
      headerCell("Room"),
      headerCell("Issues"),
    ],
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: [
          cell(row.entity),
          cell(row.room),
          cell(String(row.issues)),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function dateRange(quarter: number, year: number): string {
  const months = QUARTER_MONTHS[quarter];
  if (!months) return `Q${quarter} ${year}`;
  return `${months[0]} - ${months[2]} ${year}`;
}

export async function generateDocx(
  content: ReportContent
): Promise<Uint8Array> {
  const { quarter, year, narratives, tables } = content;
  const startMonth = quarterStartMonth(quarter);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 24 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
          },
        },
        children: [
          // Title block
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "RESEARCH, STATISTICS, AND INFORMATION MANAGEMENT DIRECTORATE (RSIMD)",
                bold: true,
                font: "Arial",
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `QUARTERLY ICT MAINTENANCE REPORT — Q${quarter} ${year}`,
                bold: true,
                font: "Arial",
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: dateRange(quarter, year),
                font: "Arial",
                size: 22,
                italics: true,
              }),
            ],
          }),

          // 1.0 Introduction
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "1.0 Introduction",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: narratives.introduction, font: "Arial", size: 22 }),
            ],
          }),

          // 2.0 Methodology
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "2.0 Methodology",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: narratives.methodology, font: "Arial", size: 22 }),
            ],
          }),

          // 3.0 Maintenance Activities
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "3.0 Maintenance Activities",
                bold: true,
                font: "Arial",
              }),
            ],
          }),

          // 3.1 Condition-Based
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "3.1 Condition-Based Maintenance",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.conditionBased,
                font: "Arial",
                size: 22,
              }),
            ],
          }),

          // 3.2 Routine Maintenance
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "3.2 Routine Maintenance",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.routineNarrative,
                font: "Arial",
                size: 22,
              }),
            ],
          }),
          buildMonthlyTable(tables.routineByCategory, startMonth),
          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // 3.3 Corrective Maintenance
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "3.3 Corrective Maintenance",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.correctiveNarrative,
                font: "Arial",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Table: Corrective Maintenance by Category",
                bold: true,
                italics: true,
                font: "Arial",
                size: 20,
              }),
            ],
          }),
          buildCorrectiveSummaryTable(tables.correctiveSummary),
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Table: Corrective Maintenance by Entity/Room",
                bold: true,
                italics: true,
                font: "Arial",
                size: 20,
              }),
            ],
          }),
          buildCorrectiveEntityTable(tables.correctiveByEntity),
          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // 3.4 Emergency Maintenance
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "3.4 Emergency Maintenance",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.emergencyNarrative,
                font: "Arial",
                size: 22,
              }),
            ],
          }),
          buildMonthlyTable(tables.emergencyByCategory, startMonth),
          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // 3.5 Predictive Maintenance
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "3.5 Predictive Maintenance",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.predictive,
                font: "Arial",
                size: 22,
              }),
            ],
          }),

          // 4.0 Challenges
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "4.0 Challenges",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.challenges,
                font: "Arial",
                size: 22,
              }),
            ],
          }),

          // 5.0 Recommendations
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "5.0 Recommendations",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.recommendations,
                font: "Arial",
                size: 22,
              }),
            ],
          }),

          // 6.0 Conclusion
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "6.0 Conclusion",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: narratives.conclusion,
                font: "Arial",
                size: 22,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
