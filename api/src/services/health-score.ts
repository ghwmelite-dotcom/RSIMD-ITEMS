import type { EquipmentRow } from "../types";

const LEGACY_PROCESSOR_PATTERN = /pentium|celeron|core\s*2\s*duo/i;
const UPGRADE_BLOCKER_PATTERN = /pentium|celeron|core\s*2\s*duo|(?:4th|5th|6th|7th)\s*gen/i;

export function calculateHealthScore(
  equipment: EquipmentRow,
  correctiveEmergencyCount: number,
  lastLogDate: string | null
): number {
  let score = 100;

  // Age penalty: -5 per year since installed_date, max -40
  if (equipment.installed_date) {
    const installedMs = new Date(equipment.installed_date).getTime();
    const nowMs = Date.now();
    const yearsOld = (nowMs - installedMs) / (365.25 * 24 * 60 * 60 * 1000);
    score -= Math.min(Math.floor(yearsOld) * 5, 40);
  } else {
    score -= 10;
  }

  // Failure penalty: -3 per corrective/emergency log, max -30
  score -= Math.min(correctiveEmergencyCount * 3, 30);

  // Staleness penalty: -10 if no log in 180 days or no logs at all
  if (!lastLogDate) {
    score -= 10;
  } else {
    const lastLogMs = new Date(lastLogDate).getTime();
    const daysSinceLog = (Date.now() - lastLogMs) / (24 * 60 * 60 * 1000);
    if (daysSinceLog > 180) {
      score -= 10;
    }
  }

  // OS EOL penalty: -20 if Windows 10
  if (equipment.os_version && /windows\s*10/i.test(equipment.os_version)) {
    score -= 20;
  }

  // Legacy hardware penalty: -10 if pentium/celeron/core 2 duo
  if (equipment.processor_gen && LEGACY_PROCESSOR_PATTERN.test(equipment.processor_gen)) {
    score -= 10;
  }

  return Math.max(score, 0);
}

export function getWin11Readiness(
  osVersion: string | null,
  processorGen: string | null
): "ready" | "can_upgrade" | "cannot_upgrade" | "unknown" | "n/a" {
  if (!osVersion) return "unknown";

  if (/windows\s*11/i.test(osVersion)) return "ready";

  if (!/windows\s*10/i.test(osVersion)) return "n/a";

  // Windows 10 from here
  if (!processorGen) return "unknown";

  if (UPGRADE_BLOCKER_PATTERN.test(processorGen)) return "cannot_upgrade";

  return "can_upgrade";
}
