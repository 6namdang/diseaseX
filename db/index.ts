import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

const DB_NAME = 'diseasex.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open (or create) the application database, run any pending migrations,
 * and seed initial data on first boot. Memoised — call freely.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await runMigrations(db);
      await seedIfEmpty(db);
      return db;
    })();
  }
  return dbPromise;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value INTEGER NOT NULL
    );
  `);
  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT value FROM schema_meta WHERE key = 'version'`,
  );
  const current = row?.value ?? 0;
  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (!sql) continue;
    await db.execAsync(sql);
  }
  await db.runAsync(
    `INSERT INTO schema_meta(key, value) VALUES('version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SCHEMA_VERSION,
  );
}

/**
 * Seed initial demo patients + tasks so a fresh install isn't a blank slate.
 * Idempotent — only runs when both tables are empty.
 */
async function seedIfEmpty(db: SQLite.SQLiteDatabase) {
  const pCount = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM patients`);
  if ((pCount?.n ?? 0) === 0) {
    const now = Date.now();
    const seed = [
      { id: 'p_pt204', caseId: 'PT-204', label: 'Severe malaria — suspected', status: 'monitor' },
      { id: 'p_pt198', caseId: 'PT-198', label: 'Uncomplicated malaria', status: 'good' },
      { id: 'p_pt176', caseId: 'PT-176', label: 'Atypical — outbreak flag', status: 'alert' },
    ];
    for (const p of seed) {
      await db.runAsync(
        `INSERT INTO patients(id, case_id, label, status, notes, created_at, updated_at)
         VALUES(?, ?, ?, ?, NULL, ?, ?)`,
        p.id,
        p.caseId,
        p.label,
        p.status,
        now,
        now,
      );
    }
  }

  const tCount = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM tasks`);
  if ((tCount?.n ?? 0) === 0) {
    const now = Date.now();
    const seedTasks = [
      { id: 't_seed_1', label: 'RDT follow-up — under-5 referrals', done: 1 },
      { id: 't_seed_2', label: 'Log first-dose artesunate time', done: 0 },
      { id: 't_seed_3', label: 'Confirm referral transport', done: 0 },
      { id: 't_seed_4', label: 'Sync observations to supervisor queue', done: 0 },
    ];
    for (const t of seedTasks) {
      await db.runAsync(
        `INSERT INTO tasks(id, patient_id, label, done, created_at)
         VALUES(?, NULL, ?, ?, ?)`,
        t.id,
        t.label,
        t.done,
        now,
      );
    }
  }
}

/** Generate a stable, URL-safe id for new rows. */
export function newId(prefix = 'r'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
