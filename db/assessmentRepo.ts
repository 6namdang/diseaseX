/**
 * CRUD for assessments + per-assessment photos. Writes use a transaction so
 * an assessment is never persisted without the photos the user attached to it.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Assessment,
  AssessmentPhoto,
  AssessmentPhotoRow,
  AssessmentRow,
  RedFlagKey,
  SymptomPhotoTag,
} from './types';

const RED_FLAG_COLUMNS: Record<RedFlagKey, keyof AssessmentRow> = {
  confused: 'red_flag_confused',
  seizures: 'red_flag_seizures',
  unable_to_walk: 'red_flag_unable_to_walk',
  dark_urine: 'red_flag_dark_urine',
  yellow_eyes: 'red_flag_yellow_eyes',
  persistent_vomiting: 'red_flag_persistent_vomiting',
};

export const RED_FLAG_KEYS = Object.keys(RED_FLAG_COLUMNS) as RedFlagKey[];

function parseSymptoms(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function rowToAssessment(r: AssessmentRow): Assessment {
  const redFlags: Record<RedFlagKey, boolean> = {
    confused: r.red_flag_confused === 1,
    seizures: r.red_flag_seizures === 1,
    unable_to_walk: r.red_flag_unable_to_walk === 1,
    dark_urine: r.red_flag_dark_urine === 1,
    yellow_eyes: r.red_flag_yellow_eyes === 1,
    persistent_vomiting: r.red_flag_persistent_vomiting === 1,
  };
  return {
    id: r.id,
    createdAt: r.created_at,
    fever: r.fever === null ? null : r.fever === 1,
    feverTempC: r.fever_temp_c,
    vomiting: r.vomiting === null ? null : r.vomiting === 1,
    canKeepFluidsDown: r.can_keep_fluids_down === null ? null : r.can_keep_fluids_down === 1,
    symptomOnsetDaysAgo: r.symptom_onset_days_ago,
    symptoms: parseSymptoms(r.symptoms),
    redFlags,
    severityScore: r.severity_score,
    notes: r.notes,
    escalatedAt: r.escalated_at,
  };
}

function rowToPhoto(r: AssessmentPhotoRow): AssessmentPhoto {
  return {
    id: r.id,
    assessmentId: r.assessment_id,
    symptomTag: r.symptom_tag,
    fileUri: r.file_uri,
    createdAt: r.created_at,
  };
}

export type AssessmentInput = {
  fever: boolean | null;
  feverTempC: number | null;
  vomiting: boolean | null;
  canKeepFluidsDown: boolean | null;
  symptomOnsetDaysAgo: number | null;
  symptoms: string[];
  redFlags: Record<RedFlagKey, boolean>;
  notes: string | null;
  photos: { symptomTag: SymptomPhotoTag; fileUri: string }[];
};

/**
 * Severity score formula (clinical heuristic, not diagnostic):
 *   10 per red flag  + 3 if fever  + 4 if vomiting  + 6 if can't keep fluids
 *   + 2 × max(0, temp-37)  + 2 × min(7, symptomOnsetDays)
 * Range in practice ~0–90.
 */
export function computeSeverity(input: AssessmentInput): number {
  const redFlagCount = RED_FLAG_KEYS.reduce(
    (n, k) => n + (input.redFlags[k] ? 1 : 0),
    0,
  );
  let score = 10 * redFlagCount;
  if (input.fever) score += 3;
  if (input.vomiting) score += 4;
  if (input.canKeepFluidsDown === false) score += 6;
  if (input.feverTempC && input.feverTempC > 37) {
    score += 2 * (input.feverTempC - 37);
  }
  if (input.symptomOnsetDaysAgo && input.symptomOnsetDaysAgo > 0) {
    score += 2 * Math.min(7, input.symptomOnsetDaysAgo);
  }
  return Math.round(score * 10) / 10;
}

export async function insertAssessment(
  db: SQLiteDatabase,
  input: AssessmentInput,
): Promise<number> {
  const now = Date.now();
  const severity = computeSeverity(input);

  let id = -1;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO assessment (
        created_at, fever, fever_temp_c, vomiting, can_keep_fluids_down,
        symptom_onset_days_ago, symptoms,
        red_flag_confused, red_flag_seizures, red_flag_unable_to_walk,
        red_flag_dark_urine, red_flag_yellow_eyes, red_flag_persistent_vomiting,
        severity_score, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        now,
        boolToInt(input.fever),
        input.feverTempC,
        boolToInt(input.vomiting),
        boolToInt(input.canKeepFluidsDown),
        input.symptomOnsetDaysAgo,
        JSON.stringify(input.symptoms ?? []),
        input.redFlags.confused ? 1 : 0,
        input.redFlags.seizures ? 1 : 0,
        input.redFlags.unable_to_walk ? 1 : 0,
        input.redFlags.dark_urine ? 1 : 0,
        input.redFlags.yellow_eyes ? 1 : 0,
        input.redFlags.persistent_vomiting ? 1 : 0,
        severity,
        input.notes,
      ],
    );
    id = res.lastInsertRowId;

    for (const p of input.photos) {
      await db.runAsync(
        `INSERT INTO assessment_photo (assessment_id, symptom_tag, file_uri, created_at)
         VALUES (?, ?, ?, ?)`,
        [id, p.symptomTag, p.fileUri, now],
      );
    }
  });

  return id;
}

export async function markAssessmentEscalated(
  db: SQLiteDatabase,
  assessmentId: number,
  at: number,
): Promise<void> {
  await db.runAsync('UPDATE assessment SET escalated_at = ? WHERE id = ?', [
    at,
    assessmentId,
  ]);
}

export async function getLatestAssessment(
  db: SQLiteDatabase,
): Promise<Assessment | null> {
  const row = await db.getFirstAsync<AssessmentRow>(
    'SELECT * FROM assessment ORDER BY created_at DESC LIMIT 1',
  );
  return row ? rowToAssessment(row) : null;
}

export async function listAssessments(
  db: SQLiteDatabase,
  limit = 90,
): Promise<Assessment[]> {
  const rows = await db.getAllAsync<AssessmentRow>(
    'SELECT * FROM assessment ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToAssessment);
}

export async function getPhotosForAssessment(
  db: SQLiteDatabase,
  assessmentId: number,
): Promise<AssessmentPhoto[]> {
  const rows = await db.getAllAsync<AssessmentPhotoRow>(
    'SELECT * FROM assessment_photo WHERE assessment_id = ? ORDER BY id ASC',
    [assessmentId],
  );
  return rows.map(rowToPhoto);
}

export async function countAssessments(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM assessment',
  );
  return row?.n ?? 0;
}

/** Returns the list of red-flag keys currently true on the given assessment. */
export function activeRedFlags(a: Assessment): RedFlagKey[] {
  return RED_FLAG_KEYS.filter((k) => a.redFlags[k]);
}

function boolToInt(v: boolean | null): number | null {
  if (v === null) return null;
  return v ? 1 : 0;
}
