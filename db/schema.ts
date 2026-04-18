/**
 * Schema migrations for the local SQLite store.
 *
 * Bump `SCHEMA_VERSION` and add a new entry to `MIGRATIONS` when the schema
 * changes — `runMigrations()` will replay anything missing on next boot.
 */

export const SCHEMA_VERSION = 2;

export const MIGRATIONS: Record<number, string> = {
  1: `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY NOT NULL,
      case_id TEXT NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'monitor',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      answers TEXT NOT NULL,
      triage_level TEXT NOT NULL,
      triage_score INTEGER NOT NULL,
      triage_reasons TEXT NOT NULL,
      notes TEXT,
      photo_uri TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assessments_patient
      ON assessments(patient_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT,
      label TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE SET NULL
    );
  `,
  2: `
    CREATE TABLE IF NOT EXISTS smears (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      photo_uri TEXT NOT NULL,
      species TEXT NOT NULL,
      parasitemia_pct REAL NOT NULL,
      confidence REAL NOT NULL,
      band TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      notes TEXT,
      model_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_smears_patient
      ON smears(patient_id, created_at DESC);
  `,
};
