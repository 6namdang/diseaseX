import type { Answers, TriageLevel } from '../data/questionnaire';
import { getDb, newId } from './index';

export interface Assessment {
  id: string;
  patientId: string;
  answers: Answers;
  triageLevel: TriageLevel;
  triageScore: number;
  triageReasons: string[];
  notes: string | null;
  photoUri: string | null;
  createdAt: number;
}

interface AssessmentRow {
  id: string;
  patient_id: string;
  answers: string;
  triage_level: TriageLevel;
  triage_score: number;
  triage_reasons: string;
  notes: string | null;
  photo_uri: string | null;
  created_at: number;
}

function fromRow(r: AssessmentRow): Assessment {
  return {
    id: r.id,
    patientId: r.patient_id,
    answers: safeParse<Answers>(r.answers, {} as Answers),
    triageLevel: r.triage_level,
    triageScore: r.triage_score,
    triageReasons: safeParse<string[]>(r.triage_reasons, []),
    notes: r.notes,
    photoUri: r.photo_uri,
    createdAt: r.created_at,
  };
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function saveAssessment(input: {
  patientId: string;
  answers: Answers;
  triageLevel: TriageLevel;
  triageScore: number;
  triageReasons: string[];
  notes?: string | null;
  photoUri?: string | null;
}): Promise<Assessment> {
  const db = await getDb();
  const now = Date.now();
  const id = newId('a');
  await db.runAsync(
    `INSERT INTO assessments(
        id, patient_id, answers, triage_level, triage_score, triage_reasons,
        notes, photo_uri, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.patientId,
    JSON.stringify(input.answers),
    input.triageLevel,
    input.triageScore,
    JSON.stringify(input.triageReasons),
    input.notes ?? null,
    input.photoUri ?? null,
    now,
  );
  return {
    id,
    patientId: input.patientId,
    answers: input.answers,
    triageLevel: input.triageLevel,
    triageScore: input.triageScore,
    triageReasons: input.triageReasons,
    notes: input.notes ?? null,
    photoUri: input.photoUri ?? null,
    createdAt: now,
  };
}

export async function listAssessments(patientId?: string): Promise<Assessment[]> {
  const db = await getDb();
  const rows = patientId
    ? await db.getAllAsync<AssessmentRow>(
        `SELECT * FROM assessments WHERE patient_id = ? ORDER BY created_at DESC`,
        patientId,
      )
    : await db.getAllAsync<AssessmentRow>(
        `SELECT * FROM assessments ORDER BY created_at DESC`,
      );
  return rows.map(fromRow);
}

export async function getLatestAssessment(patientId: string): Promise<Assessment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AssessmentRow>(
    `SELECT * FROM assessments WHERE patient_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    patientId,
  );
  return row ? fromRow(row) : null;
}

export async function deleteAssessment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM assessments WHERE id = ?`, id);
}
