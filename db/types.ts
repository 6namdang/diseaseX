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
  clinician_phone: string | null;
  clinician_email: string | null;
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
  clinicianPhone: string | null;
  clinicianEmail: string | null;
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

export type EscalationStatus = 'sent' | 'failed' | 'disabled' | 'skipped_cooldown';

export type EscalationRow = {
  id: number;
  assessment_id: number;
  created_at: number;
  red_flags: string;
  sms_body: string;
  clinician_phone: string;
  twilio_sid: string | null;
  status: EscalationStatus;
  error_message: string | null;
};

export type Escalation = {
  id: number;
  assessmentId: number;
  createdAt: number;
  redFlags: RedFlagKey[];
  smsBody: string;
  clinicianPhone: string;
  twilioSid: string | null;
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
