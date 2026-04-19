/**
 * Row types for every SQLite table. Numeric booleans (INTEGER 0/1) are
 * kept as numbers at the DB layer and converted to booleans by the repo
 * helpers before hitting UI/domain code.
 */

import type { EndemicityStatus } from '../data/whoMalariaEndemic';

export type Sex = 'male' | 'female' | 'other';
export type ReadingLevel = 'basic' | 'intermediate' | 'advanced';
export type RedFlagKey =
  | 'confused'
  | 'seizures'
  | 'unable_to_walk'
  | 'dark_urine'
  | 'yellow_eyes'
  | 'persistent_vomiting';

export type SymptomPhotoTag = 'eyes' | 'urine' | 'palm' | 'skin' | 'other';

/** DB-shaped patient row (snake_case, booleans as 0/1). */
export type PatientRow = {
  id: 1;
  name: string | null;
  age: number | null;
  sex: Sex | null;
  weight_kg: number | null;
  height_cm: number | null;
  is_pregnant: number | null;
  pregnancy_trimester: number | null;
  is_breastfeeding: number | null;
  allergies: string | null;
  current_medications: string | null;
  chronic_conditions: string | null;
  prior_malaria_episodes: number | null;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  endemicity: EndemicityStatus | null;
  preferred_language: string | null;
  reading_level: ReadingLevel | null;
  patient_phone: string | null;
  clinician_name: string | null;
  clinician_email: string | null;
  /** ntfy.sh topic the clinician subscribes to for push alerts (v3+). */
  clinician_alert_topic: string | null;
  onboarding_completed_at: number | null;
  updated_at: number;
};

/** Domain-shaped patient (camelCase, parsed JSON arrays, booleans as booleans). */
export type Patient = {
  name: string | null;
  age: number | null;
  sex: Sex | null;
  weightKg: number | null;
  heightCm: number | null;
  isPregnant: boolean | null;
  pregnancyTrimester: 1 | 2 | 3 | null;
  isBreastfeeding: boolean | null;
  allergies: string[];
  currentMedications: string[];
  chronicConditions: string[];
  priorMalariaEpisodes: number | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  endemicity: EndemicityStatus | null;
  preferredLanguage: string | null;
  readingLevel: ReadingLevel | null;
  patientPhone: string | null;
  clinicianName: string | null;
  clinicianEmail: string | null;
  /** ntfy.sh topic the clinician subscribes to for push alerts (v3+). */
  clinicianAlertTopic: string | null;
  onboardingCompletedAt: number | null;
  updatedAt: number;
};

export type AssessmentRow = {
  id: number;
  created_at: number;
  fever: number | null;
  fever_temp_c: number | null;
  vomiting: number | null;
  can_keep_fluids_down: number | null;
  symptom_onset_days_ago: number | null;
  symptoms: string | null;
  red_flag_confused: number;
  red_flag_seizures: number;
  red_flag_unable_to_walk: number;
  red_flag_dark_urine: number;
  red_flag_yellow_eyes: number;
  red_flag_persistent_vomiting: number;
  severity_score: number;
  notes: string | null;
  escalated_at: number | null;
};

export type Assessment = {
  id: number;
  createdAt: number;
  fever: boolean | null;
  feverTempC: number | null;
  vomiting: boolean | null;
  canKeepFluidsDown: boolean | null;
  symptomOnsetDaysAgo: number | null;
  symptoms: string[];
  redFlags: Record<RedFlagKey, boolean>;
  severityScore: number;
  notes: string | null;
  escalatedAt: number | null;
};

export type AssessmentPhotoRow = {
  id: number;
  assessment_id: number;
  symptom_tag: SymptomPhotoTag;
  file_uri: string;
  created_at: number;
};

export type AssessmentPhoto = {
  id: number;
  assessmentId: number;
  symptomTag: SymptomPhotoTag;
  fileUri: string;
  createdAt: number;
};

/**
 * Escalation delivery status.
 *  - 'sent':            push accepted by the alert provider (ntfy.sh)
 *  - 'failed':          network / HTTP error talking to the provider
 *  - 'disabled':        legacy rows from the Twilio era (no provider
 *                       credentials). New code never emits this.
 *  - 'skipped_cooldown': legacy — before v4 an escalation could be throttled
 *                       if red flags were unchanged within 6h. New code
 *                       never emits this; every red-flag assessment sends
 *                       immediately. Preserved in the union so existing DB
 *                       rows still parse.
 */
export type EscalationStatus = 'sent' | 'failed' | 'disabled' | 'skipped_cooldown';

export type EscalationRow = {
  id: number;
  assessment_id: number;
  created_at: number;
  red_flags: string;
  /** Push message body. Column name kept from the SMS era. */
  sms_body: string;
  /**
   * Contact string the alert was addressed to. In the Twilio era this held
   * an E.164 phone number; in the ntfy era it holds the topic name. Kept
   * as 'clinician_phone' at the SQL level to avoid a risky table rebuild;
   * the domain type exposes it as `clinicianAlertTopic`.
   */
  clinician_phone: string;
  /** Legacy Twilio message SID. Null on all v3+ rows. */
  twilio_sid: string | null;
  /** ntfy.sh response id for successful publishes (v3+). */
  provider_message_id: string | null;
  status: EscalationStatus;
  error_message: string | null;
};

export type Escalation = {
  id: number;
  assessmentId: number;
  createdAt: number;
  redFlags: RedFlagKey[];
  /** Full message body that was pushed. */
  messageBody: string;
  /** ntfy topic (or, for legacy rows, the phone number) the alert was sent to. */
  clinicianAlertTopic: string;
  /** Provider message id. ntfy id for v3+ rows, Twilio SID for legacy rows. */
  providerMessageId: string | null;
  status: EscalationStatus;
  errorMessage: string | null;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessageRow = {
  id: number;
  created_at: number;
  role: ChatRole;
  content: string;
  thinking: string | null;
};

export type ChatMessage = {
  id: number;
  createdAt: number;
  role: ChatRole;
  content: string;
  thinking: string | null;
};

/** Blood-smear analysis result persisted after inference. */
export type SmearSpecies = 'none' | 'pf' | 'pv' | 'po' | 'pm' | 'mixed';
export type SmearBand = 'negative' | 'low' | 'moderate' | 'high';

export type SmearRow = {
  id: number;
  created_at: number;
  photo_uri: string;
  species: SmearSpecies;
  parasitemia_pct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  model_id: string;
  duration_ms: number | null;
  notes: string | null;
};

export type Smear = {
  id: number;
  createdAt: number;
  photoUri: string;
  species: SmearSpecies;
  parasitemiaPct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  modelId: string;
  durationMs: number | null;
  notes: string | null;
};
