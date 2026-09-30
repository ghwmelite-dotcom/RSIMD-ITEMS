import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Conservative deployment policy, not a general-purpose SQL security parser.
// Ambiguous or destructive SQL requires a separate reviewed manual migration.
export function validateMigration(sql, baseline = false) {
  const statements = sql.replace(/--[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split(';').map(s => s.trim()).filter(Boolean);
  if (!statements.length) throw new Error('Empty migration');
  for (const statement of statements) {
    if (baseline && /^SELECT\s+[\w,\s]+\s+FROM\s+\w+\s+LIMIT\s+0$/i.test(statement)) continue;
    if (/\b(DROP|DELETE|UPDATE|REPLACE|RENAME|TRIGGER|ATTACH|DETACH|PRAGMA)\b/i.test(statement)) throw new Error('Manual review required for destructive or unsupported SQL');
    if (!/^(CREATE\s+(TABLE|(?:UNIQUE\s+)?INDEX)\s|ALTER\s+TABLE\s+\w+\s+ADD\s+(?:COLUMN\s+)?)/i.test(statement)) throw new Error('Only additive schema migrations are automatic');
  }
}

export function checkMigrations() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dir = resolve(root, 'api/migrations');
  const files = readdirSync(dir).sort();
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(resolve(root, 'api/src/db/baseline-2026-09-30.sql'), 'utf8'));
    for (const file of files) {
      if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(file)) throw new Error(`Invalid migration name: ${file}`);
      const sql = readFileSync(resolve(dir, file), 'utf8');
      validateMigration(sql, file === '0001_existing_production_baseline.sql');
      // Apply every tracked migration in sequence to the frozen pre-tracking schema.
      db.exec(sql);
    }
    console.log(`Validated ${files.length} migration file(s); baseline probes passed.`);
  } finally { db.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkMigrations();
