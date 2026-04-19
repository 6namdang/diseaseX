/**
 * SQLite schema for DiseaseX. Single-patient-per-device model.
 *
 * Runs once on first open via expo-sqlite's SQLiteProvider onInit. The
 * `user_version` pragma acts as the migration fence — bump SCHEMA_VERSION
 * and append an if-block when evolving the schema.
 */

export const SCHEMA_VERSION = 3;

/** DDL for a fresh database (always rebuilt from the latest schema). */
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
  clinician_phone TEXT,           -- legacy (Twilio era), unused as of v3
  clinician_email TEXT,
  clinician_alert_topic TEXT,     -- ntfy.sh topic for push alerts (v3+)
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

-- The escalation table carries both legacy Twilio rows (v1/v2) and new ntfy
-- rows (v3+). To avoid a risky table rebuild we kept the original column
-- names: the 'clinician_phone' column now stores the ntfy topic string for
-- new rows (it's just a contact-string), and 'twilio_sid' stays for legacy
-- data. New code writes to provider_message_id and reads either column.
CREATE TABLE IF NOT EXISTS escalation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  red_flags TEXT NOT NULL,
  sms_body TEXT NOT NULL,
  clinician_phone TEXT NOT NULL,
  twilio_sid TEXT,
  provider_message_id TEXT,
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

CREATE TABLE IF NOT EXISTS smear (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  photo_uri TEXT NOT NULL,
  species TEXT NOT NULL,
  parasitemia_pct REAL NOT NULL,
  confidence REAL NOT NULL,
  band TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  model_id TEXT NOT NULL,
  duration_ms INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_smear_created ON smear(created_at DESC);
`;

/**
 * Additive migrations for existing installs. `SCHEMA_SQL` above already has
 * the latest shape, so v1-fresh installs skip these. `database.ts` replays
 * any missing block based on PRAGMA user_version.
 */
export const MIGRATIONS: Record<number, string> = {
  2: `
    CREATE TABLE IF NOT EXISTS smear (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      photo_uri TEXT NOT NULL,
      species TEXT NOT NULL,
      parasitemia_pct REAL NOT NULL,
      confidence REAL NOT NULL,
      band TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      model_id TEXT NOT NULL,
      duration_ms INTEGER,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_smear_created ON smear(created_at DESC);
  `,
  // v3: replace Twilio SMS escalation with ntfy.sh push alerts. The patient
  // row gains a dedicated topic column; the escalation table keeps its
  // existing 'clinician_phone' string column (used as the "where sent"
  // label) and just adds a nullable provider_message_id for the ntfy id.
  // Legacy 'twilio_sid' values keep rendering in history unchanged.
  3: `
    ALTER TABLE patient ADD COLUMN clinician_alert_topic TEXT;
    ALTER TABLE escalation ADD COLUMN provider_message_id TEXT;
  `,
};
