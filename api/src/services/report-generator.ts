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
  BorderStyle,
  ShadingType,
  TableOfContents,
  LevelFormat,
  Header,
  Footer,
  PageNumber,
  PageBreak,
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

const FONT = "Bookman Old Style";
const QUARTER_MONTHS: Record<number, [string, string, string]> = {
  1: ["JANUARY", "FEBRUARY", "MARCH"],
  2: ["APRIL", "MAY", "JUNE"],
  3: ["JULY", "AUGUST", "SEPTEMBER"],
  4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
};
const QUARTER_LABELS: Record<number, string> = {
  1: "FIRST",
  2: "SECOND",
  3: "THIRD",
  4: "FOURTH",
};

// --- Table Helpers ---

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 };
const TABLE_WIDTH = 9026; // A4 content width with 1" margins

function hCell(text: string, width?: number): TableCell {
  return new TableCell({
    borders: BORDERS,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: { fill: "1F4E79", type: ShadingType.CLEAR },
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, font: FONT, size: 20, color: "FFFFFF" })],
      }),
    ],
  });
}

function dCell(text: string | number, bold = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    borders: BORDERS,
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text), font: FONT, size: 20, bold })],
      }),
    ],
  });
}

function nCell(num: number, bold = false): TableCell {
  return dCell(num, bold, AlignmentType.CENTER);
}

function totalCell(text: string | number): TableCell {
  return new TableCell({
    borders: BORDERS,
    shading: { fill: "D6E4F0", type: ShadingType.CLEAR },
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: typeof text === "number" ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: String(text), bold: true, font: FONT, size: 20 })],
      }),
    ],
  });
}

// --- Section Helpers ---

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT, size: 26 })],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 24 })],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 200, line: 360 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function tableCaption(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, italics: true, font: FONT, size: 20 })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

// --- Table Builders ---

function buildMonthlyTable(data: MonthlyData[], quarter: number): Table {
  const months = QUARTER_MONTHS[quarter] ?? ["M1", "M2", "M3"];
  const startMonth = (quarter - 1) * 3 + 1;

  const headerRow = new TableRow({
    children: [
      hCell("ITEM DESCRIPTION"),
      hCell(months[0]),
      hCell(months[1]),
      hCell(months[2]),
      hCell("TOTAL"),
    ],
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: [
          dCell(row.category),
          nCell(row.months[startMonth] ?? 0),
          nCell(row.months[startMonth + 1] ?? 0),
          nCell(row.months[startMonth + 2] ?? 0),
          nCell(row.total, true),
        ],
      })
  );

  const m1 = data.reduce((s, r) => s + (r.months[startMonth] ?? 0), 0);
  const m2 = data.reduce((s, r) => s + (r.months[startMonth + 1] ?? 0), 0);
  const m3 = data.reduce((s, r) => s + (r.months[startMonth + 2] ?? 0), 0);
  const grand = data.reduce((s, r) => s + r.total, 0);

  const totalRow = new TableRow({
    children: [totalCell("TOTAL"), totalCell(m1), totalCell(m2), totalCell(m3), totalCell(grand)],
  });

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    rows: [headerRow, ...dataRows, totalRow],
  });
}

function buildSummaryTable(data: CorrectiveSummaryRow[]): Table {
  const headerRow = new TableRow({
    children: [hCell("DESCRIPTION"), hCell("QUANTITY")],
  });

  const dataRows = data.map(
    (row) => new TableRow({ children: [dCell(row.category), nCell(row.count)] })
  );

  const total = data.reduce((s, r) => s + r.count, 0);
  const totalRow = new TableRow({
    children: [totalCell("TOTAL"), totalCell(total)],
  });

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    rows: [headerRow, ...dataRows, totalRow],
  });
}

function buildEntityBreakdownTable(data: CorrectiveEntityRow[]): Table {
  const headerRow = new TableRow({
    children: [hCell("Directorates"), hCell("ROOM No"), hCell("Issues Resolved")],
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: [dCell(row.entity), dCell(row.room || "N/A", false, AlignmentType.CENTER), dCell(String(row.issues))],
      })
  );

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
  });
}

function buildOverviewTable(quarter: number, year: number, tables: ReportContent["tables"]): Table {
  const routineTotal = tables.routineByCategory.reduce((s, r) => s + r.total, 0);
  const correctiveTotal = tables.correctiveSummary.reduce((s, r) => s + r.count, 0);
  const emergencyTotal = tables.emergencyByCategory.reduce((s, r) => s + r.total, 0);
  const grandTotal = routineTotal + correctiveTotal + emergencyTotal;

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [hCell("MAINTENANCE TYPE"), hCell("COUNT"), hCell("% OF TOTAL")],
      }),
      new TableRow({
        children: [dCell("Routine Maintenance"), nCell(routineTotal), nCell(grandTotal > 0 ? Math.round((routineTotal / grandTotal) * 100) : 0)],
      }),
      new TableRow({
        children: [dCell("Corrective Maintenance"), nCell(correctiveTotal), nCell(grandTotal > 0 ? Math.round((correctiveTotal / grandTotal) * 100) : 0)],
      }),
      new TableRow({
        children: [dCell("Emergency Maintenance"), nCell(emergencyTotal), nCell(grandTotal > 0 ? Math.round((emergencyTotal / grandTotal) * 100) : 0)],
      }),
      new TableRow({
        children: [totalCell("GRAND TOTAL"), totalCell(grandTotal), totalCell("100%")],
      }),
    ],
  });
}

// --- Main Generator ---

export async function generateDocx(content: ReportContent): Promise<Uint8Array> {
  const { quarter, year, narratives, tables } = content;
  const months = QUARTER_MONTHS[quarter] ?? ["M1", "M2", "M3"];
  const qLabel = QUARTER_LABELS[quarter] ?? `Q${quarter}`;

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: FONT },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: FONT },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "roman-list",
          levels: [{
            level: 0,
            format: LevelFormat.LOWER_ROMAN,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: "bullet-list",
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "RSIMD-ITEMS | OHCS Ghana", font: FONT, size: 16, color: "999999", italics: true })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", font: FONT, size: 16, color: "999999" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ===== TITLE PAGE =====
          new Paragraph({ spacing: { before: 2000 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "RESEARCH, STATISTICS, AND INFORMATION MANAGEMENT DIRECTORATE (RSIMD)", bold: true, font: FONT, size: 28 })],
          }),
          new Paragraph({ spacing: { after: 400 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${qLabel} QUARTER EQUIPMENT MAINTENANCE REPORT`, bold: true, font: FONT, size: 32 })],
          }),
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `(${months[0]} - ${months[2]}, ${year})`, font: FONT, size: 24 })],
          }),
          new Paragraph({ spacing: { after: 600 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Office of the Head of Civil Service", font: FONT, size: 22, italics: true, color: "666666" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Accra, Ghana", font: FONT, size: 22, italics: true, color: "666666" })],
          }),

          // ===== TABLE OF CONTENTS =====
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: "TABLE OF CONTENTS", bold: true, font: FONT, size: 26 })],
          }),
          new TableOfContents("Table of Contents", {
            hyperlink: true,
            headingStyleRange: "1-2",
          }),

          // ===== 1.0 INTRODUCTION =====
          new Paragraph({ children: [new PageBreak()] }),
          heading1("1.0 Introduction"),
          bodyText(narratives.introduction),

          heading2("1.1 Objectives"),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "This report aims to update management on activities conducted, specifically:", font: FONT, size: 22 })],
          }),
          new Paragraph({
            numbering: { reference: "roman-list", level: 0 },
            spacing: { after: 60 },
            children: [new TextRun({ text: "Maintenance and servicing of computers and their accessories.", font: FONT, size: 22 })],
          }),
          new Paragraph({
            numbering: { reference: "roman-list", level: 0 },
            spacing: { after: 60 },
            children: [new TextRun({ text: "Maintenance and servicing of CCTV surveillance cameras.", font: FONT, size: 22 })],
          }),
          new Paragraph({
            numbering: { reference: "roman-list", level: 0 },
            spacing: { after: 200 },
            children: [new TextRun({ text: "Maintenance of network infrastructure and internet connectivity.", font: FONT, size: 22 })],
          }),

          // ===== 2.0 METHODOLOGY =====
          heading1("2.0 Methodology"),
          bodyText(narratives.methodology),

          // ===== 3.0 DETAILS =====
          heading1("3.0 Details of Maintenance and Servicing"),

          // Overview summary table
          tableCaption("Table 1: Summary of Maintenance Activities"),
          buildOverviewTable(quarter, year, tables),
          spacer(),

          // --- 3.1 Condition-Based ---
          heading2("3.1 Condition Based Servicing and Monitoring"),
          bodyText(narratives.conditionBased),

          // --- 3.2 Routine ---
          heading2("3.2 Routine Maintenance and Servicing"),
          bodyText(narratives.routineNarrative),
          tableCaption("Table 2: Routine Maintenance Breakdown by Month"),
          buildMonthlyTable(tables.routineByCategory, quarter),
          spacer(),

          // --- 3.3 Corrective ---
          heading2("3.3 Corrective Maintenance"),
          bodyText(narratives.correctiveNarrative),
          tableCaption("Table 3: Corrective Maintenance Summary"),
          buildSummaryTable(tables.correctiveSummary),
          spacer(),
          tableCaption("Table 4: Breakdown of Maintenance by Directorate/Rooms"),
          buildEntityBreakdownTable(tables.correctiveByEntity),
          spacer(),

          // --- 3.4 Emergency ---
          heading2("3.4 Emergency Maintenance"),
          bodyText(narratives.emergencyNarrative),
          tableCaption("Table 5: Emergency Maintenance Breakdown by Month"),
          buildMonthlyTable(tables.emergencyByCategory, quarter),
          spacer(),

          // --- 3.5 Predictive ---
          heading2("3.5 Predictive Maintenance"),
          bodyText(narratives.predictive),

          // ===== 4.0 CHALLENGES =====
          heading1("4.0 Challenges"),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "The following key issues were identified during maintenance and servicing activities:", font: FONT, size: 22 })],
          }),
          ...narratives.challenges.split(/[.\n]/).filter((s: string) => s.trim().length > 10).map((challenge: string) =>
            new Paragraph({
              numbering: { reference: "bullet-list", level: 0 },
              spacing: { after: 60 },
              children: [new TextRun({ text: challenge.trim().replace(/^\d+\.\s*/, ""), font: FONT, size: 22 })],
            })
          ),
          spacer(),

          // ===== 5.0 RECOMMENDATIONS =====
          heading1("5.0 Recommendations"),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "The Directorate recommends the following to ensure efficient maintenance and operation of office equipment:", font: FONT, size: 22 })],
          }),
          ...narratives.recommendations.split(/[.\n]/).filter((s: string) => s.trim().length > 10).map((rec: string) =>
            new Paragraph({
              numbering: { reference: "bullet-list", level: 0 },
              spacing: { after: 60 },
              children: [new TextRun({ text: rec.trim().replace(/^\d+\.\s*/, ""), font: FONT, size: 22 })],
            })
          ),
          spacer(),

          // ===== 6.0 CONCLUSION =====
          heading1("6.0 Conclusion"),
          bodyText(narratives.conclusion),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
