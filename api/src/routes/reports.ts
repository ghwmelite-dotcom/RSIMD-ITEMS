import type { Env, AuthSession, ReportRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { corsHeaders } from "../middleware/cors";
import { getReportAggregation } from "../services/aggregator";
import { generateAllNarratives } from "../services/ai-narrator";
import { generateDocx } from "../services/report-generator";

export async function listReports(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  try {
    const result = await env.DB.prepare(
      "SELECT * FROM reports ORDER BY year DESC, quarter DESC, created_at DESC"
    ).all<ReportRow>();

    return jsonResponse(result.results, 200, request);
  } catch (err) {
    console.error("List reports error:", err);
    return errorResponse("Failed to list reports", 500, request);
  }
}

export async function getReport(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  try {
    const report = await env.DB.prepare(
      "SELECT * FROM reports WHERE id = ?"
    )
      .bind(id)
      .first<ReportRow>();

    if (!report) {
      return errorResponse("Report not found", 404, request);
    }

    return jsonResponse(report, 200, request);
  } catch (err) {
    console.error("Get report error:", err);
    return errorResponse("Failed to get report", 500, request);
  }
}

export async function previewReport(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "lead", "admin");
  if (roleError) return roleError;

  let body: { year?: number; quarter?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const now = new Date();
  const year = body.year ?? now.getFullYear();
  const quarter = body.quarter ?? Math.ceil((now.getMonth() + 1) / 3);

  if (quarter < 1 || quarter > 4) {
    return errorResponse("Quarter must be between 1 and 4", 400, request);
  }

  try {
    const aggregatedData = await getReportAggregation(env.DB, year, quarter);

    const narratives = await generateAllNarratives(
      env.AI,
      quarter,
      year,
      aggregatedData
    );

    return jsonResponse(
      {
        narratives,
        tables: aggregatedData,
        year,
        quarter,
      },
      200,
      request
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Report preview error:", err);
    return errorResponse(`Report preview failed: ${errorMsg}`, 500, request);
  }
}

export async function generateReport(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  // Require lead or admin role
  const roleError = requireRole(session, request, "lead", "admin");
  if (roleError) return roleError;

  let body: { year?: number; quarter?: number; narratives?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const now = new Date();
  const year = body.year ?? now.getFullYear();
  const quarter = body.quarter ?? Math.ceil((now.getMonth() + 1) / 3);

  if (quarter < 1 || quarter > 4) {
    return errorResponse("Quarter must be between 1 and 4", 400, request);
  }

  const id = crypto.randomUUID();
  const title = `RSIMD ICT Maintenance Report Q${quarter} ${year}`;
  const createdAt = now.toISOString();

  // Step 1: Create draft report record
  try {
    await env.DB.prepare(
      `INSERT INTO reports (id, title, quarter, year, file_url, file_size, generated_by, status, ai_model, generation_log, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 'draft', '@cf/meta/llama-3.1-70b-instruct', NULL, ?, ?)`
    )
      .bind(id, title, quarter, year, session.technician_id, createdAt, createdAt)
      .run();
  } catch (err) {
    console.error("Create draft report error:", err);
    return errorResponse("Failed to create report record", 500, request);
  }

  try {
    // Step 2: Aggregate data
    const aggregatedData = await getReportAggregation(env.DB, year, quarter);

    // Step 3: Use provided narratives or generate AI narratives
    const narratives = body.narratives
      ? (body.narratives as unknown as import("../services/ai-narrator").AllNarratives)
      : await generateAllNarratives(env.AI, quarter, year, aggregatedData);

    // Step 4: Generate DOCX
    const docxBuffer = await generateDocx({
      quarter,
      year,
      narratives,
      tables: {
        routineByCategory: aggregatedData.routineByCategory,
        correctiveSummary: aggregatedData.correctiveSummary,
        correctiveByEntity: aggregatedData.correctiveByEntity,
        emergencyByCategory: aggregatedData.emergencyByCategory,
      },
    });

    // Step 5: Upload to R2
    const r2Key = `reports/${year}-Q${quarter}-${id}.docx`;
    await env.R2.put(r2Key, docxBuffer, {
      httpMetadata: {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });

    // Step 6: Update report record
    const fileSize = docxBuffer.byteLength;
    const updatedAt = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE reports SET file_url = ?, file_size = ?, status = 'generated', generation_log = 'Report generated successfully', updated_at = ? WHERE id = ?`
    )
      .bind(r2Key, fileSize, updatedAt, id)
      .run();

    const report = await env.DB.prepare(
      "SELECT * FROM reports WHERE id = ?"
    )
      .bind(id)
      .first<ReportRow>();

    return jsonResponse(report, 201, request);
  } catch (err) {
    // Step 7: On error, update report with error log
    const errorMsg =
      err instanceof Error ? err.message : "Unknown generation error";
    console.error("Report generation error:", err);

    try {
      await env.DB.prepare(
        `UPDATE reports SET status = 'draft', generation_log = ?, updated_at = ? WHERE id = ?`
      )
        .bind(
          `Error: ${errorMsg}`,
          new Date().toISOString(),
          id
        )
        .run();
    } catch (logErr) {
      console.error("Failed to update error log:", logErr);
    }

    return errorResponse(
      `Report generation failed: ${errorMsg}`,
      500,
      request
    );
  }
}

export async function downloadReport(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  try {
    const report = await env.DB.prepare(
      "SELECT * FROM reports WHERE id = ?"
    )
      .bind(id)
      .first<ReportRow>();

    if (!report) {
      return errorResponse("Report not found", 404, request);
    }

    if (!report.file_url) {
      return errorResponse(
        "Report file not yet generated",
        404,
        request
      );
    }

    const file = await env.R2.get(report.file_url);
    if (!file) {
      return errorResponse("Report file not found in storage", 404, request);
    }

    const cors = corsHeaders(request);
    const filename = `${report.title.replace(/[^a-zA-Z0-9 ]/g, "")}.docx`;

    return new Response(file.body, {
      headers: {
        ...cors,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(file.size),
      },
    });
  } catch (err) {
    console.error("Download report error:", err);
    return errorResponse("Failed to download report", 500, request);
  }
}
