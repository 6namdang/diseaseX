/**
 * SQLite schema for DiseaseX. Single-patient-per-device model.
 *
 * Runs once on first open via expo-sqlite's SQLiteProvider onInit. The
 * `user_version` pragma acts as the migration fence — bump SCHEMA_VERSION
 * and append an if-block when evolving the schema.
 */

export const SCHEMA_VERSION = 1;

/** DDL for a fresh database. */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patient (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  age INTEGER,
  sex TEXT,
  weight_kg REAL,
  height_cm REAL,
  is_pregnant INTEGER,
  pregnancy_trimester INTEGER,
  is_breastfeeding INTEGER,
  allergies TEXT,
  current_medications TEXT,
  chronic_conditions TEXT,
  prior_malaria_episodes INTEGER,
  country_code TEXT,
  country_name TEXT,
  region TEXT,
  latitude REAL,
  longitude REAL,
  endemicity TEXT,
  preferred_language TEXT,
  reading_level TEXT,
  patient_phone TEXT,
  clinician_name TEXT,
  clinician_phone TEXT,
  clinician_email TEXT,
  onboarding_completed_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  fever INTEGER,
  fever_temp_c REAL,
  vomiting INTEGER,
  can_keep_fluids_down INTEGER,
  symptom_onset_days_ago INTEGER,
  symptoms TEXT,
  red_flag_confused INTEGER DEFAULT 0,
  red_flag_seizures INTEGER DEFAULT 0,
  red_flag_unable_to_walk INTEGER DEFAULT 0,
  red_flag_dark_urine INTEGER DEFAULT 0,
  red_flag_yellow_eyes INTEGER DEFAULT 0,
  red_flag_persistent_vomiting INTEGER DEFAULT 0,
  severity_score REAL NOT NULL DEFAULT 0,
  notes TEXT,
  escalated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_assessment_created ON assessment(created_at DESC);

CREATE TABLE IF NOT EXISTS assessment_photo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  symptom_tag TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photo_assessment ON assessment_photo(assessment_id);

CREATE TABLE IF NOT EXISTS escalation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  red_flags TEXT NOT NULL,
  sms_body TEXT NOT NULL,
  clinician_phone TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT NOT NULL,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_escalation_created ON escalation(created_at DESC);

CREATE TABLE IF NOT EXISTS chat_message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  thinking TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_message(created_at DESC);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
