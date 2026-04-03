interface MonthByType {
  month: number;
  count: number;
  by_type: Record<string, number>;
}

interface EntityCount {
  entity_id: string;
  entity_code: string;
  entity_name: string;
  count: number;
}

interface CategoryCount {
  category_id: string;
  category_name: string;
  count: number;
}

interface RecentLog {
  id: string;
  logged_date: string;
  maintenance_type: string;
  description: string;
  status: string;
  org_entity_code: string;
  technician_name: string;
}

export interface DashboardSummary {
  total: number;
  by_type: Record<string, number>;
  by_month: MonthByType[];
  by_entity: EntityCount[];
  top_categories: CategoryCount[];
  recent_logs: RecentLog[];
  equipment_status: Record<string, number>;
}

export interface YearlyTrends {
  monthly: MonthByType[];
}

function pivotMonthByType(
  rows: Array<{ month: number; maintenance_type: string; count: number }>
): MonthByType[] {
  const map = new Map<number, { count: number; by_type: Record<string, number> }>();

  for (const row of rows) {
    const entry = map.get(row.month) ?? { count: 0, by_type: {} };
    entry.count += row.count;
    entry.by_type[row.maintenance_type] = row.count;
    map.set(row.month, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, data]) => ({ month, count: data.count, by_type: data.by_type }));
}

export async function getDashboardSummary(
  db: D1Database,
  year: number,
  quarter: number
): Promise<DashboardSummary> {
  const [
    totalResult,
    byTypeResult,
    byMonthResult,
    byEntityResult,
    topCategoriesResult,
    recentLogsResult,
    equipmentStatusResult,
  ] = await Promise.all([
    // total
    db
      .prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ?")
      .bind(year, quarter)
      .first<{ count: number }>(),

    // by_type
    db
      .prepare(
        "SELECT maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? GROUP BY maintenance_type"
      )
      .bind(year, quarter)
      .all<{ maintenance_type: string; count: number }>(),

    // by_month
    db
      .prepare(
        "SELECT month, maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? GROUP BY month, maintenance_type"
      )
      .bind(year, quarter)
      .all<{ month: number; maintenance_type: string; count: number }>(),

    // by_entity
    db
      .prepare(
        `SELECT ml.org_entity_id as entity_id, oe.code as entity_code, oe.name as entity_name, COUNT(*) as count
         FROM maintenance_logs ml
         JOIN org_entities oe ON oe.id = ml.org_entity_id
         WHERE ml.year = ? AND ml.quarter = ?
         GROUP BY ml.org_entity_id`
      )
      .bind(year, quarter)
      .all<EntityCount>(),

    // top_categories
    db
      .prepare(
        `SELECT ml.category_id, mc.name as category_name, COUNT(*) as count
         FROM maintenance_logs ml
         LEFT JOIN maintenance_categories mc ON mc.id = ml.category_id
         WHERE ml.year = ? AND ml.quarter = ? AND ml.category_id IS NOT NULL
         GROUP BY ml.category_id
         ORDER BY count DESC
         LIMIT 10`
      )
      .bind(year, quarter)
      .all<CategoryCount>(),

    // recent_logs
    db
      .prepare(
        `SELECT ml.id, ml.logged_date, ml.maintenance_type, ml.description, ml.status,
                oe.code as org_entity_code, t.name as technician_name
         FROM maintenance_logs ml
         JOIN org_entities oe ON oe.id = ml.org_entity_id
         JOIN technicians t ON t.id = ml.technician_id
         WHERE ml.year = ? AND ml.quarter = ?
         ORDER BY ml.created_at DESC
         LIMIT 10`
      )
      .bind(year, quarter)
      .all<RecentLog>(),

    // equipment_status
    db
      .prepare("SELECT status, COUNT(*) as count FROM equipment GROUP BY status")
      .all<{ status: string; count: number }>(),
  ]);

  const by_type: Record<string, number> = {};
  for (const row of byTypeResult.results) {
    by_type[row.maintenance_type] = row.count;
  }

  const equipment_status: Record<string, number> = {};
  for (const row of equipmentStatusResult.results) {
    equipment_status[row.status] = row.count;
  }

  return {
    total: totalResult?.count ?? 0,
    by_type,
    by_month: pivotMonthByType(byMonthResult.results),
    by_entity: byEntityResult.results,
    top_categories: topCategoriesResult.results,
    recent_logs: recentLogsResult.results,
    equipment_status,
  };
}

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

function pivotCategoryByMonth(
  rows: Array<{ category: string; month: number; count: number }>
): Array<{ category: string; months: Record<number, number>; total: number }> {
  const map = new Map<
    string,
    { months: Record<number, number>; total: number }
  >();

  for (const row of rows) {
    const entry = map.get(row.category) ?? { months: {}, total: 0 };
    entry.months[row.month] = (entry.months[row.month] ?? 0) + row.count;
    entry.total += row.count;
    map.set(row.category, entry);
  }

  return Array.from(map.entries()).map(([category, data]) => ({
    category,
    months: data.months,
    total: data.total,
  }));
}

export async function getReportAggregation(
  db: D1Database,
  year: number,
  quarter: number
): Promise<ReportAggregation> {
  const [
    totalResult,
    byTypeResult,
    routineResult,
    correctiveSummaryResult,
    correctiveByEntityResult,
    emergencyResult,
    conditionBasedResult,
    predictiveResult,
    challengesResult,
    recommendationsResult,
  ] = await Promise.all([
    // total
    db
      .prepare(
        "SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ?"
      )
      .bind(year, quarter)
      .first<{ count: number }>(),

    // by type
    db
      .prepare(
        "SELECT maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? GROUP BY maintenance_type"
      )
      .bind(year, quarter)
      .all<{ maintenance_type: string; count: number }>(),

    // routine by category + month
    db
      .prepare(
        `SELECT COALESCE(mc.name, 'Uncategorised') as category, ml.month, COUNT(*) as count
         FROM maintenance_logs ml
         LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
         WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'routine'
         GROUP BY ml.category_id, ml.month`
      )
      .bind(year, quarter)
      .all<{ category: string; month: number; count: number }>(),

    // corrective summary by category
    db
      .prepare(
        `SELECT COALESCE(mc.name, 'Uncategorised') as category, COUNT(*) as count
         FROM maintenance_logs ml
         LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
         WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'corrective'
         GROUP BY ml.category_id
         ORDER BY count DESC`
      )
      .bind(year, quarter)
      .all<{ category: string; count: number }>(),

    // corrective by entity + room
    db
      .prepare(
        `SELECT oe.name as entity, COALESCE(ml.room_number, 'N/A') as room, COUNT(*) as issues
         FROM maintenance_logs ml
         JOIN org_entities oe ON oe.id = ml.org_entity_id
         WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'corrective'
         GROUP BY ml.org_entity_id, ml.room_number
         ORDER BY issues DESC`
      )
      .bind(year, quarter)
      .all<{ entity: string; room: string; issues: number }>(),

    // emergency by category + month
    db
      .prepare(
        `SELECT COALESCE(mc.name, 'Uncategorised') as category, ml.month, COUNT(*) as count
         FROM maintenance_logs ml
         LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
         WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'emergency'
         GROUP BY ml.category_id, ml.month`
      )
      .bind(year, quarter)
      .all<{ category: string; month: number; count: number }>(),

    // condition-based count
    db
      .prepare(
        "SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? AND maintenance_type = 'condition_based'"
      )
      .bind(year, quarter)
      .first<{ count: number }>(),

    // predictive count
    db
      .prepare(
        "SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? AND maintenance_type = 'predictive'"
      )
      .bind(year, quarter)
      .first<{ count: number }>(),

    // challenges from report_items
    db
      .prepare(
        `SELECT description FROM report_items
         WHERE type = 'challenge'
         ORDER BY created_at DESC
         LIMIT 10`
      )
      .all<{ description: string }>(),

    // recommendations from report_items
    db
      .prepare(
        `SELECT description FROM report_items
         WHERE type = 'recommendation'
         ORDER BY created_at DESC
         LIMIT 10`
      )
      .all<{ description: string }>(),
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeResult.results) {
    byType[row.maintenance_type] = row.count;
  }

  return {
    total: totalResult?.count ?? 0,
    byType,
    routineByCategory: pivotCategoryByMonth(routineResult.results),
    correctiveSummary: correctiveSummaryResult.results,
    correctiveByEntity: correctiveByEntityResult.results,
    emergencyByCategory: pivotCategoryByMonth(emergencyResult.results),
    conditionBasedCount: conditionBasedResult?.count ?? 0,
    predictiveCount: predictiveResult?.count ?? 0,
    challenges: challengesResult.results.map((r) => r.description),
    recommendations: recommendationsResult.results.map((r) => r.description),
  };
}

export async function getYearlyTrends(
  db: D1Database,
  year: number
): Promise<YearlyTrends> {
  const result = await db
    .prepare(
      "SELECT month, maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? GROUP BY month, maintenance_type"
    )
    .bind(year)
    .all<{ month: number; maintenance_type: string; count: number }>();

  return {
    monthly: pivotMonthByType(result.results),
  };
}
