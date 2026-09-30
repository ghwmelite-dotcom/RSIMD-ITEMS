import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { validateMigration, checkMigrations } from './check-migrations.mjs';

test('existing schema satisfies baseline', checkMigrations);
test('incomplete schema fails baseline', () => {
  const db = new DatabaseSync(':memory:');
  try { assert.throws(() => db.exec(readFileSync(new URL('../api/migrations/0001_existing_production_baseline.sql', import.meta.url), 'utf8'))); }
  finally { db.close(); }
});
test('additive schema accepted', () => {
  validateMigration('CREATE TABLE example (id TEXT); CREATE INDEX idx_example ON example(id); ALTER TABLE example ADD COLUMN note TEXT;');
});
test('destructive and data-writing operations rejected', () => {
  for (const sql of ['DROP TABLE technicians;', 'DELETE FROM team_forms;', 'UPDATE technicians SET role=1;', 'INSERT INTO technicians VALUES (1);', 'ALTER TABLE team_forms RENAME TO old;', 'CREATE TRIGGER evil AFTER INSERT ON team_forms BEGIN DELETE FROM reports; END;', 'SELECT * FROM technicians;']) assert.throws(() => validateMigration(sql));
});
test('baseline only permits non-returning column probes', () => {
  validateMigration('SELECT id, name FROM technicians LIMIT 0;', true);
  assert.throws(() => validateMigration('SELECT id FROM technicians LIMIT 1;', true));
});
