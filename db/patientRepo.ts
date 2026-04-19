/**
 * CRUD for the single-patient row. The row always has id=1 (CHECK
 * constraint in the schema). `getPatient` returns null until the first
 * upsert from the welcome onboarding flow.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Patient, PatientRow } from './types';

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function toBool(v: number | null): boolean | null {
  if (v === null) return null;
  return v === 1;
}

function rowToPatient(r: PatientRow): Patient {
  return {
    name: r.name,
    age: r.age,
    sex: r.sex,
    weightKg: r.weight_kg,
    heightCm: r.height_cm,
    isPregnant: toBool(r.is_pregnant),
    pregnancyTrimester: (r.pregnancy_trimester as 1 | 2 | 3 | null) ?? null,
    isBreastfeeding: toBool(r.is_breastfeeding),
    allergies: parseList(r.allergies),
    currentMedications: parseList(r.current_medications),
    chronicConditions: parseList(r.chronic_conditions),
    priorMalariaEpisodes: r.prior_malaria_episodes,
    countryCode: r.country_code,
    countryName: r.country_name,
    region: r.region,
    latitude: r.latitude,
    longitude: r.longitude,
    endemicity: r.endemicity,
    preferredLanguage: r.preferred_language,
    readingLevel: r.reading_level,
    patientPhone: r.patient_phone,
    clinicianName: r.clinician_name,
    clinicianPhone: r.clinician_phone,
    clinicianEmail: r.clinician_email,
    onboardingCompletedAt: r.onboarding_completed_at,
    updatedAt: r.updated_at,
  };
}

export async function getPatient(db: SQLiteDatabase): Promise<Patient | null> {
  const row = await db.getFirstAsync<PatientRow>('SELECT * FROM patient WHERE id = 1');
  return row ? rowToPatient(row) : null;
}

export async function isOnboarded(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ onboarding_completed_at: number | null }>(
    'SELECT onboarding_completed_at FROM patient WHERE id = 1',
  );
  return !!row?.onboarding_completed_at;
}

export type PatientUpsert = Partial<Omit<Patient, 'updatedAt'>>;

/**
 * Upsert patient row. Merges with existing values so partial updates from
 * individual onboarding steps don't wipe previously-saved fields.
 */
export async function upsertPatient(
  db: SQLiteDatabase,
  patch: PatientUpsert,
): Promise<void> {
  const now = Date.now();
  const current = await getPatient(db);
  const merged = { ...(current ?? emptyPatient()), ...patch, updatedAt: now };

  await db.runAsync(
    `INSERT INTO patient (
      id, name, age, sex, weight_kg, height_cm,
      is_pregnant, pregnancy_trimester, is_breastfeeding,
      allergies, current_medications, chronic_conditions, prior_malaria_episodes,
      country_code, country_name, region, latitude, longitude, endemicity,
      preferred_language, reading_level,
      patient_phone, clinician_name, clinician_phone, clinician_email,
      onboarding_completed_at, updated_at
    ) VALUES (
      1, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, age=excluded.age, sex=excluded.sex,
      weight_kg=excluded.weight_kg, height_cm=excluded.height_cm,
      is_pregnant=excluded.is_pregnant, pregnancy_trimester=excluded.pregnancy_trimester,
      is_breastfeeding=excluded.is_breastfeeding,
      allergies=excluded.allergies, current_medications=excluded.current_medications,
      chronic_conditions=excluded.chronic_conditions,
      prior_malaria_episodes=excluded.prior_malaria_episodes,
      country_code=excluded.country_code, country_name=excluded.country_name,
      region=excluded.region, latitude=excluded.latitude, longitude=excluded.longitude,
      endemicity=excluded.endemicity,
      preferred_language=excluded.preferred_language, reading_level=excluded.reading_level,
      patient_phone=excluded.patient_phone,
      clinician_name=excluded.clinician_name, clinician_phone=excluded.clinician_phone,
      clinician_email=excluded.clinician_email,
      onboarding_completed_at=excluded.onboarding_completed_at,
      updated_at=excluded.updated_at`,
    [
      merged.name,
      merged.age,
      merged.sex,
      merged.weightKg,
      merged.heightCm,
      boolToInt(merged.isPregnant),
      merged.pregnancyTrimester,
      boolToInt(merged.isBreastfeeding),
      JSON.stringify(merged.allergies ?? []),
      JSON.stringify(merged.currentMedications ?? []),
      JSON.stringify(merged.chronicConditions ?? []),
      merged.priorMalariaEpisodes,
      merged.countryCode,
      merged.countryName,
      merged.region,
      merged.latitude,
      merged.longitude,
      merged.endemicity,
      merged.preferredLanguage,
      merged.readingLevel,
      merged.patientPhone,
      merged.clinicianName,
      merged.clinicianPhone,
      merged.clinicianEmail,
      merged.onboardingCompletedAt,
      merged.updatedAt,
    ],
  );
}

export async function markOnboarded(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `UPDATE patient SET onboarding_completed_at = ?, updated_at = ? WHERE id = 1`,
    [now, now],
  );
}

export async function clearPatient(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM patient WHERE id = 1');
}

function boolToInt(v: boolean | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return v ? 1 : 0;
}

function emptyPatient(): Patient {
  return {
    name: null,
    age: null,
    sex: null,
    weightKg: null,
    heightCm: null,
    isPregnant: null,
    pregnancyTrimester: null,
    isBreastfeeding: null,
    allergies: [],
    currentMedications: [],
    chronicConditions: [],
    priorMalariaEpisodes: null,
    countryCode: null,
    countryName: null,
    region: null,
    latitude: null,
    longitude: null,
    endemicity: null,
    preferredLanguage: null,
    readingLevel: null,
    patientPhone: null,
    clinicianName: null,
    clinicianPhone: null,
    clinicianEmail: null,
    onboardingCompletedAt: null,
    updatedAt: 0,
  };
}
