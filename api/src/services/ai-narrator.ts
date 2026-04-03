export interface ReportAggregation {
  total: number;
  byType: Record<string, number>;
  routineByCategory: Array<{
    category: string;
    months: Record<number, number>;
    total: number;
  }>;
  correctiveSummary: Array<{ category: string; count: number }>;
  correctiveByEntity: Array<{
    entity: string;
    room: string;
    issues: number;
  }>;
  emergencyByCategory: Array<{
    category: string;
    months: Record<number, number>;
    total: number;
  }>;
  conditionBasedCount: number;
  predictiveCount: number;
  challenges: string[];
  recommendations: string[];
}

interface NarrativeRequest {
  section: string;
  quarter: number;
  year: number;
  data: unknown;
}

export interface AllNarratives {
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

const SYSTEM_PROMPT = `You are a professional report writer for the Office of the Head of Civil Service (OHCS) Ghana,
Research, Statistics, and Information Management Directorate (RSIMD).
Write in formal British English. Be concise, data-driven, and professional.
Do not use markdown formatting. Write plain prose paragraphs only.`;

function buildUserPrompt(req: NarrativeRequest): string {
  const { section, quarter, year, data } = req;
  const dataStr = JSON.stringify(data, null, 2);

  switch (section) {
    case "introduction":
      return `Write a brief introduction paragraph for the Q${quarter} ${year} quarterly ICT maintenance report for RSIMD/OHCS Ghana. Total maintenance activities: ${dataStr}. Mention the directorate's mandate to maintain ICT infrastructure.`;
    case "methodology":
      return `Write a brief methodology paragraph explaining the ICT maintenance approach for Q${quarter} ${year}. Cover condition-based, routine, corrective, emergency, and predictive maintenance types. Keep it under 100 words.`;
    case "conditionBased":
      return `Write a paragraph about condition-based maintenance activities for Q${quarter} ${year}. Data: ${dataStr}. Explain what condition-based maintenance entails and summarise the count.`;
    case "routineNarrative":
      return `Write a paragraph summarising routine maintenance activities for Q${quarter} ${year}. Data: ${dataStr}. Highlight key categories and monthly trends.`;
    case "correctiveNarrative":
      return `Write a paragraph summarising corrective maintenance activities for Q${quarter} ${year}. Data: ${dataStr}. Note the most common issues and affected entities.`;
    case "emergencyNarrative":
      return `Write a paragraph summarising emergency maintenance activities for Q${quarter} ${year}. Data: ${dataStr}. Highlight urgency and response patterns.`;
    case "predictive":
      return `Write a paragraph about predictive maintenance activities for Q${quarter} ${year}. Data: ${dataStr}. Explain the proactive approach and summarise the count.`;
    case "challenges":
      return `Write a paragraph listing key challenges encountered during ICT maintenance in Q${quarter} ${year}. Challenges: ${dataStr}. Frame them professionally.`;
    case "recommendations":
      return `Write a paragraph with recommendations for improving ICT maintenance based on Q${quarter} ${year} findings. Recommendations: ${dataStr}. Be actionable and specific.`;
    case "conclusion":
      return `Write a brief conclusion paragraph for the Q${quarter} ${year} quarterly ICT maintenance report. Total activities: ${dataStr}. Summarise achievements and outlook.`;
    default:
      return `Write a paragraph about ${section} for Q${quarter} ${year}. Data: ${dataStr}.`;
  }
}

export async function generateNarrative(
  ai: Ai,
  request: NarrativeRequest
): Promise<string> {
  try {
    const response = await ai.run(
      "@cf/meta/llama-3.1-70b-instruct" as Parameters<Ai["run"]>[0],
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(request) },
        ],
        max_tokens: 1024,
      } as Parameters<Ai["run"]>[1]
    );

    if (
      response &&
      typeof response === "object" &&
      "response" in response &&
      typeof (response as { response: unknown }).response === "string"
    ) {
      return (response as { response: string }).response;
    }

    return `[Auto-generated narrative unavailable for ${request.section}. Please review data and add narrative manually.]`;
  } catch (err) {
    console.error(`AI narrative error for ${request.section}:`, err);
    return `[Auto-generated narrative unavailable for ${request.section}. Please review data and add narrative manually.]`;
  }
}

export async function generateAllNarratives(
  ai: Ai,
  quarter: number,
  year: number,
  aggregatedData: ReportAggregation
): Promise<AllNarratives> {
  const sections = [
    { section: "introduction", data: { total: aggregatedData.total, byType: aggregatedData.byType } },
    { section: "methodology", data: { types: Object.keys(aggregatedData.byType) } },
    { section: "conditionBased", data: { count: aggregatedData.conditionBasedCount } },
    { section: "routineNarrative", data: aggregatedData.routineByCategory },
    { section: "correctiveNarrative", data: { summary: aggregatedData.correctiveSummary, byEntity: aggregatedData.correctiveByEntity } },
    { section: "emergencyNarrative", data: aggregatedData.emergencyByCategory },
    { section: "predictive", data: { count: aggregatedData.predictiveCount } },
    { section: "challenges", data: aggregatedData.challenges },
    { section: "recommendations", data: aggregatedData.recommendations },
    { section: "conclusion", data: { total: aggregatedData.total, byType: aggregatedData.byType } },
  ] as const;

  const results = await Promise.all(
    sections.map((s) =>
      generateNarrative(ai, { section: s.section, quarter, year, data: s.data })
    )
  );

  return {
    introduction: results[0]!,
    methodology: results[1]!,
    conditionBased: results[2]!,
    routineNarrative: results[3]!,
    correctiveNarrative: results[4]!,
    emergencyNarrative: results[5]!,
    predictive: results[6]!,
    challenges: results[7]!,
    recommendations: results[8]!,
    conclusion: results[9]!,
  };
}
