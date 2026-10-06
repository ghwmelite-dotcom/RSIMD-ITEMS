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
  TableOfContents,
  LevelFormat,
  Footer,
  PageNumber,
  PageBreak,
} from "docx";
import type { AllNarratives } from "./ai-narrator";
import type { TeamForm } from "./team-form";

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
  helpdesk?: string;
  activityTables?: { routine: string[][]; corrective: string[][]; breakdown: string[][]; emergency: string[][] };
  tables: {
    teamForms?: TeamForm[];
    routineByCategory: MonthlyData[];
    correctiveSummary: CorrectiveSummaryRow[];
    correctiveByEntity: CorrectiveEntityRow[];
    emergencyByCategory: MonthlyData[];
  };
}

const FONT = "Bookman Old Style";

// Public reports use directorates and rooms. Import identities and revision
// bookkeeping remain in the saved source records, not the management document.
export function reportText(text: string): string {
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/u)
    .filter(sentence => !/\b(structured date|date field|group-date anchor|do not duplicate|do not repeat|record these group results once|source workbook|findings are credited|user confirmation|tag corrected from|supersede.*figures|no per-device overlap reconciliation)\b/i.test(sentence))
    .map(sentence => sentence
      .replace(/\b(?:RSIMD\s+)?Team\s+[A-Z]\b/g, "maintenance officers")
      .replace(/\bteam-reported\b/gi, "reported")
      .replace(/\bTeam reports\b/g, "Officers report")
      .replace(/\bChecked by:[^.]*\.?/gi, "")
      .replace(/\bChecked by [^.]*\.?/gi, "")
      .replace(/\bCOMBINED findings\b/g, "Combined findings")
      .replace(/, recorded once(?=:|\.)/g, "")
      .replace(/\bconfirmed by the user\b/gi, "confirmed by the reporting officer"))
    .join(" ").trim();
}
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
const TABLE_WIDTH = 9360; // Default OHCS Letter page with one-inch margins

function hCell(text: string, width?: number): TableCell {
  return new TableCell({
    borders: BORDERS,
    width: width ? { size: width, type: WidthType.DXA } : undefined,

    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, font: FONT, size: 24, color: "000000" })],
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
        children: [new TextRun({ text: String(text), font: FONT, size: 24, bold })],
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
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: typeof text === "number" ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: String(text), bold: true, font: FONT, size: 24 })],
      }),
    ],
  });
}

// --- Section Helpers ---

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT, size: 24 })],
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
    children: [new TextRun({ text, font: FONT, size: 24 })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function evidenceTable(headers: string[], rows: string[][]): Table {
  const widths = headers.map((_, i) => Math.floor(TABLE_WIDTH / headers.length) + (i === 0 ? TABLE_WIDTH % headers.length : 0));
  const row = (values: string[], header = false) => new TableRow({
    tableHeader: header,
    children: values.map((text, i) => new TableCell({
      width: { size: widths[i]!, type: WidthType.DXA }, borders: BORDERS, margins: CELL_MARGINS,
  
      children: [new Paragraph({ children: [new TextRun({ text: reportText(text), font: FONT, size: 24, bold: header, color: "000000" })] })],
    })),
  });
  return new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: widths, rows: [row(headers, true), ...rows.map(values => row(values))] });
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

// --- Main Generator ---

export async function generateDocx(content: ReportContent): Promise<Uint8Array> {
  const { quarter, year, tables } = content;
  const narratives = Object.fromEntries(Object.entries(content.narratives).map(([key, value]) => [key, reportText(value)])) as unknown as AllNarratives;
  const qLabel = QUARTER_LABELS[quarter] ?? `Q${quarter}`;

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 24 } },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: FONT },
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
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
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
            children: [new TextRun({ text: "RESEARCH, STATISTICS, AND INFORMATION MANAGEMENT DIRECTORATE (RSIMD)", bold: true, font: FONT, size: 36 })],
          }),
          new Paragraph({ spacing: { after: 400 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${year} ${qLabel} QUARTER IT EQUIPMENT MAINTENANCE AND SERVICING REPORT`, bold: true, font: FONT, size: 36 })],
          }),
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${["APRIL", "JULY", "OCTOBER", "JANUARY"][quarter - 1]}, ${quarter === 4 ? year + 1 : year}`, font: FONT, size: 24 })],
          }),
          // ===== TABLE OF CONTENTS =====
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: "TABLE OF CONTENTS", bold: true, font: FONT, size: 24 })],
          }),
          new TableOfContents("Table of Contents", {
            hyperlink: true,
            headingStyleRange: "1-2",
            // Workers cannot paginate Word files. Cache real section labels so
            // readers see contents immediately; Word calculates pages on update.
            cachedEntries: [
              { title: "1.0 Introduction", level: 1 },
              { title: "1.1 Objectives", level: 2 },
              { title: "2.0 Methodology", level: 1 },
              { title: "3.0 Details of Maintenance and Servicing", level: 1 },
              { title: "3.1 Condition Based Servicing and Monitoring", level: 2 },
              { title: "3.2 Routine Maintenance and Servicing", level: 2 },
              { title: "3.3 Corrective Maintenance", level: 2 },
              { title: "3.4 Emergency Maintenance", level: 2 },
              { title: "3.5 Predictive Maintenance", level: 2 },
              { title: "4.0 OHCS Helpdesk Activities", level: 1 },
              { title: "5.0 Challenges", level: 1 },
              { title: "6.0 Recommendations", level: 1 },
              { title: "7.0 Conclusion", level: 1 },
            ],
          }),

          // ===== 1.0 INTRODUCTION =====
          new Paragraph({ children: [new PageBreak()] }),
          heading1("1.0 Introduction"),
          bodyText(narratives.introduction),

          heading2("1.1 Objectives"),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "This report aims to update management on activities conducted, specifically:", font: FONT, size: 24 })],
          }),
          new Paragraph({
            numbering: { reference: "roman-list", level: 0 },
            spacing: { after: 60 },
            children: [new TextRun({ text: "Maintenance and servicing of computers and their accessories.", font: FONT, size: 24 })],
          }),
          new Paragraph({
            numbering: { reference: "roman-list", level: 0 },
            spacing: { after: 60 },
            children: [new TextRun({ text: "Documenting equipment condition, work performed and outstanding faults.", font: FONT, size: 24 })],
          }),
          new Paragraph({
            numbering: { reference: "roman-list", level: 0 },
            spacing: { after: 200 },
            children: [new TextRun({ text: "Identifying repair, replacement and follow-up priorities for management.", font: FONT, size: 24 })],
          }),

          // ===== 2.0 METHODOLOGY =====
          heading1("2.0 Methodology"),
          bodyText(narratives.methodology),

          // ===== 3.0 DETAILS =====
          heading1("3.0 Details of Maintenance and Servicing"),

          // --- 3.1 Condition-Based ---
          heading2("3.1 Condition Based Servicing and Monitoring"),
          bodyText(narratives.conditionBased),

          // --- 3.2 Routine ---
          heading2("3.2 Routine Maintenance and Servicing"),
          bodyText(narratives.routineNarrative),
          ...(tables.routineByCategory.length ? [buildMonthlyTable(tables.routineByCategory, quarter)] : [
            evidenceTable(["ACTIVITY", "DESCRIPTION / OUTCOME"], content.activityTables?.routine ?? [["Routine maintenance and servicing", narratives.routineNarrative]]),
          ]),
          spacer(),

          // --- 3.3 Corrective ---
          heading2("3.3 Corrective Maintenance"),
          bodyText(narratives.correctiveNarrative),
          ...(tables.correctiveSummary.length ? [buildSummaryTable(tables.correctiveSummary)] : [
            evidenceTable(["DESCRIPTION", "OUTCOME / REQUIRED ACTION"], content.activityTables?.corrective ?? [["Corrective maintenance", narratives.correctiveNarrative]]),
          ]),
          spacer(),
          heading2("Breakdown of Maintenance by Directorate"),
          ...(content.activityTables ? [evidenceTable(["ACTIVITY", "DESCRIPTION", "EXAMPLES / TOOLS"], content.activityTables.breakdown)] : tables.correctiveByEntity.length ? [buildEntityBreakdownTable(tables.correctiveByEntity)] : [evidenceTable(["ACTIVITY", "DESCRIPTION", "EXAMPLES / TOOLS"], [["Routine maintenance", narratives.routineNarrative, "See recorded maintenance activities"], ["Corrective maintenance", narratives.correctiveNarrative, "See recorded corrective actions"]])]),
          spacer(),

          // --- 3.4 Emergency ---
          heading2("3.4 Emergency Maintenance"),
          bodyText(narratives.emergencyNarrative),
          ...(tables.emergencyByCategory.length ? [buildMonthlyTable(tables.emergencyByCategory, quarter)] : [evidenceTable(["ACTIVITY", "RECORDED STATUS"], content.activityTables?.emergency ?? [["Emergency maintenance", "No emergency intervention recorded in the submitted activity logs."]])]),
          spacer(),

          // --- 3.5 Predictive ---
          heading2("3.5 Predictive Maintenance"),
          bodyText(narratives.predictive),
          heading1("4.0 OHCS Helpdesk Activities"),
          bodyText(content.helpdesk || "Helpdesk activity statistics were not included in the maintenance records for this report."),
          // ===== 5.0 CHALLENGES =====
          heading1("5.0 Challenges"),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "The following key issues were identified during maintenance and servicing activities:", font: FONT, size: 24 })],
          }),
          ...narratives.challenges.split(/[.\n]/).filter((s: string) => s.trim().length > 10).map((challenge: string) =>
            new Paragraph({
              numbering: { reference: "bullet-list", level: 0 },
              spacing: { after: 60 },
              children: [new TextRun({ text: challenge.trim().replace(/^\d+\.\s*/, ""), font: FONT, size: 24 })],
            })
          ),
          spacer(),

          // ===== 5.0 RECOMMENDATIONS =====
          heading1("6.0 Recommendations"),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: "The Directorate recommends the following to ensure efficient maintenance and operation of office equipment:", font: FONT, size: 24 })],
          }),
          ...narratives.recommendations.split(/[.\n]/).filter((s: string) => s.trim().length > 10).map((rec: string) =>
            new Paragraph({
              numbering: { reference: "bullet-list", level: 0 },
              spacing: { after: 60 },
              children: [new TextRun({ text: rec.trim().replace(/^\d+\.\s*/, ""), font: FONT, size: 24 })],
            })
          ),
          spacer(),

          // ===== 6.0 CONCLUSION =====
          heading1("7.0 Conclusion"),
          bodyText(narratives.conclusion),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
