import type { Env, EquipmentRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { listEquipment, getAllEquipmentLogStats } from "../db/queries";
import {
  calculateHealthScore,
  getWin11Readiness,
} from "../services/health-score";

const LEGACY_PROCESSOR_PATTERN = /pentium|celeron|core\s*2\s*duo/i;

interface ReadinessDetail {
  id: string;
  asset_tag: string;
  type: string;
  make: string | null;
  model: string | null;
  os_version: string | null;
  processor_gen: string | null;
  readiness: "can_upgrade" | "cannot_upgrade";
}

interface FlaggedEquipment {
  id: string;
  asset_tag: string;
  type: string;
  make: string | null;
  model: string | null;
  os_version: string | null;
  processor_gen: string | null;
  health_score: number;
  reasons: string[];
}

export async function readinessReport(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  try {
    const equipment = await listEquipment(env.DB, {});

    let ready = 0;
    let can_upgrade = 0;
    let cannot_upgrade = 0;
    let unknown = 0;
    let na = 0;
    const details: ReadinessDetail[] = [];

    for (const eq of equipment) {
      const readiness = getWin11Readiness(eq.os_version, eq.processor_gen);

      switch (readiness) {
        case "ready":
          ready++;
          break;
        case "can_upgrade":
          can_upgrade++;
          details.push(toReadinessDetail(eq, "can_upgrade"));
          break;
        case "cannot_upgrade":
          cannot_upgrade++;
          details.push(toReadinessDetail(eq, "cannot_upgrade"));
          break;
        case "unknown":
          unknown++;
          break;
        case "n/a":
          na++;
          break;
      }
    }

    return jsonResponse(
      { ready, can_upgrade, cannot_upgrade, unknown, na, details },
      200,
      request
    );
  } catch (err) {
    console.error("Readiness report error:", err);
    return errorResponse("Failed to generate readiness report", 500, request);
  }
}

export async function agingReport(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  try {
    const [equipment, logStatsMap] = await Promise.all([
      listEquipment(env.DB, {}),
      getAllEquipmentLogStats(env.DB),
    ]);

    const ageBrackets: Record<string, number> = {
      "0-2yr": 0,
      "2-5yr": 0,
      "5-8yr": 0,
      "8+yr": 0,
      unknown: 0,
    };

    const osDistribution: Record<string, number> = {};
    const flagged: FlaggedEquipment[] = [];

    for (const eq of equipment) {
      // Age bracket
      const bracket = getAgeBracket(eq.installed_date);
      ageBrackets[bracket] = (ageBrackets[bracket] ?? 0) + 1;

      // OS distribution
      const osKey = eq.os_version ?? "Not set";
      osDistribution[osKey] = (osDistribution[osKey] ?? 0) + 1;

      // Health score
      const stats = logStatsMap.get(eq.id) ?? {
        corrective_emergency_count: 0,
        last_log_date: null,
      };
      const healthScore = calculateHealthScore(
        eq,
        stats.corrective_emergency_count,
        stats.last_log_date
      );

      // Flagging
      const reasons: string[] = [];

      if (healthScore < 40) {
        reasons.push("Health score below 40");
      }

      const readiness = getWin11Readiness(eq.os_version, eq.processor_gen);
      if (readiness === "cannot_upgrade") {
        reasons.push("Cannot upgrade to Windows 11");
      }

      if (eq.os_version && /windows\s*10/i.test(eq.os_version)) {
        reasons.push("Windows 10 end-of-life");
      }

      if (eq.processor_gen && LEGACY_PROCESSOR_PATTERN.test(eq.processor_gen)) {
        reasons.push("Legacy processor");
      }

      if (reasons.length > 0) {
        flagged.push({
          id: eq.id,
          asset_tag: eq.asset_tag,
          type: eq.type,
          make: eq.make,
          model: eq.model,
          os_version: eq.os_version,
          processor_gen: eq.processor_gen,
          health_score: healthScore,
          reasons,
        });
      }
    }

    // Sort flagged by health_score ascending (worst first)
    flagged.sort((a, b) => a.health_score - b.health_score);

    return jsonResponse(
      {
        total_equipment: equipment.length,
        age_distribution: ageBrackets,
        os_distribution: osDistribution,
        flagged,
      },
      200,
      request
    );
  } catch (err) {
    console.error("Aging report error:", err);
    return errorResponse("Failed to generate aging report", 500, request);
  }
}

function toReadinessDetail(
  eq: EquipmentRow,
  readiness: "can_upgrade" | "cannot_upgrade"
): ReadinessDetail {
  return {
    id: eq.id,
    asset_tag: eq.asset_tag,
    type: eq.type,
    make: eq.make,
    model: eq.model,
    os_version: eq.os_version,
    processor_gen: eq.processor_gen,
    readiness,
  };
}

function getAgeBracket(installedDate: string | null): string {
  if (!installedDate) return "unknown";

  const installedMs = new Date(installedDate).getTime();
  const nowMs = Date.now();
  const years = (nowMs - installedMs) / (365.25 * 24 * 60 * 60 * 1000);

  if (years < 2) return "0-2yr";
  if (years < 5) return "2-5yr";
  if (years < 8) return "5-8yr";
  return "8+yr";
}
