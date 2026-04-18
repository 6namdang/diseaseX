import type { TriageLevel } from '../data/questionnaire';
import type { Assessment } from './assessments';
import { getDb } from './index';
import type { Patient, PatientStatus } from './patients';
import type { Smear, SmearBand, SmearSpecies } from './smears';

export interface DayBucket {
  /** ISO date `YYYY-MM-DD` (local) */
  date: string;
  /** Single-letter weekday for compact charts (M/T/W…) */
  dayLabel: string;
  count: number;
  avgScore: number;
  /** Highest triage level seen that day (used to colour bars). */
  worst: TriageLevel | null;
}

export interface PatientLatest {
  patient: Patient;
  assessment: Assessment | null;
  smear: Smear | null;
}

export interface DashboardStats {
  totalPatients: number;
  assessments7d: number;
  urgentOrReview7d: number;
  tasksDone: number;
  tasksTotal: number;
  /** Latest-per-patient triage level distribution. */
  triageMix: { level: TriageLevel; count: number }[];
  /** Distribution by patient disposition (rolled up from triage levels). */
  dispositionMix: { kind: 'stable' | 'observe' | 'escalated'; count: number }[];
  /** Last 7 days of assessment activity. */
  perDay: DayBucket[];
  /** Per-patient latest assessment, ordered by patient.created_at ASC. */
  patientLatest: PatientLatest[];
}

interface PatientRow {
  id: string;
  case_id: string;
  label: string;
  status: PatientStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
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

interface SmearRow {
  id: string;
  patient_id: string;
  photo_uri: string;
  species: SmearSpecies;
  parasitemia_pct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  notes: string | null;
  model_id: string;
  created_at: number;
}

const TRIAGE_RANK: Record<TriageLevel, number> = {
  low: 0,
  possible: 1,
  review: 2,
  urgent: 3,
};

const DAY_LETTERS = ['Su', 'M', 'T', 'W', 'T', 'F', 'S'];

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function patientFromRow(r: PatientRow): Patient {
  return {
    id: r.id,
    caseId: r.case_id,
    label: r.label,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function assessmentFromRow(r: AssessmentRow): Assessment {
  return {
    id: r.id,
    patientId: r.patient_id,
    answers: safeParse(r.answers, {}),
    triageLevel: r.triage_level,
    triageScore: r.triage_score,
    triageReasons: safeParse<string[]>(r.triage_reasons, []),
    notes: r.notes,
    photoUri: r.photo_uri,
    createdAt: r.created_at,
  };
}

function smearFromRow(r: SmearRow): Smear {
  return {
    id: r.id,
    patientId: r.patient_id,
    photoUri: r.photo_uri,
    species: r.species,
    parasitemiaPct: r.parasitemia_pct,
    confidence: r.confidence,
    band: r.band,
    recommendation: r.recommendation,
    notes: r.notes,
    modelId: r.model_id,
    createdAt: r.created_at,
  };
}

/** YYYY-MM-DD in the device's local timezone. */
function localISODate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dispositionOf(level: TriageLevel): 'stable' | 'observe' | 'escalated' {
  if (level === 'urgent') return 'escalated';
  if (level === 'review') return 'observe';
  return 'stable';
}

/**
 * Build the dashboard rollups from a single read pass over the SQLite store.
 * Cheap enough to run on every focus — all queries are indexed and bounded.
 */
export async function loadDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const patientRows = await db.getAllAsync<PatientRow>(
    `SELECT * FROM patients ORDER BY created_at ASC`,
  );
  const patients = patientRows.map(patientFromRow);
  const totalPatients = patients.length;

  // Latest assessment per patient (window-emulating self-join on max created_at).
  const latestRows = await db.getAllAsync<AssessmentRow>(
    `SELECT a.* FROM assessments a
     INNER JOIN (
       SELECT patient_id, MAX(created_at) AS max_t
       FROM assessments
       GROUP BY patient_id
     ) latest
       ON latest.patient_id = a.patient_id AND latest.max_t = a.created_at`,
  );
  const latestByPatient = new Map<string, Assessment>();
  for (const r of latestRows) {
    latestByPatient.set(r.patient_id, assessmentFromRow(r));
  }

  // Latest smear per patient (same self-join pattern as assessments above).
  const latestSmearRows = await db.getAllAsync<SmearRow>(
    `SELECT s.* FROM smears s
     INNER JOIN (
       SELECT patient_id, MAX(created_at) AS max_t
       FROM smears
       GROUP BY patient_id
     ) latest
       ON latest.patient_id = s.patient_id AND latest.max_t = s.created_at`,
  );
  const latestSmearByPatient = new Map<string, Smear>();
  for (const r of latestSmearRows) {
    latestSmearByPatient.set(r.patient_id, smearFromRow(r));
  }

  const patientLatest: PatientLatest[] = patients.map((p) => ({
    patient: p,
    assessment: latestByPatient.get(p.id) ?? null,
    smear: latestSmearByPatient.get(p.id) ?? null,
  }));

  // Triage mix from the latest assessment of every patient that has one.
  const mixCounts: Record<TriageLevel, number> = { urgent: 0, review: 0, possible: 0, low: 0 };
  for (const a of latestByPatient.values()) {
    mixCounts[a.triageLevel] += 1;
  }
  const triageMix = (Object.keys(mixCounts) as TriageLevel[]).map((level) => ({
    level,
    count: mixCounts[level],
  }));

  const dispCounts: Record<'stable' | 'observe' | 'escalated', number> = {
    stable: 0,
    observe: 0,
    escalated: 0,
  };
  for (const a of latestByPatient.values()) {
    dispCounts[dispositionOf(a.triageLevel)] += 1;
  }
  const dispositionMix = (
    ['stable', 'observe', 'escalated'] as const
  ).map((kind) => ({ kind, count: dispCounts[kind] }));

  // 7-day activity window — pull every assessment in range, bucket in JS.
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRows = await db.getAllAsync<AssessmentRow>(
    `SELECT * FROM assessments WHERE created_at >= ? ORDER BY created_at ASC`,
    sevenDaysAgo,
  );
  const recent = recentRows.map(assessmentFromRow);
  const assessments7d = recent.length;
  const urgentOrReview7d = recent.filter(
    (a) => a.triageLevel === 'urgent' || a.triageLevel === 'review',
  ).length;

  // Build the seven daily buckets, oldest → newest, including empty days.
  const perDay: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const ts = Date.now() - i * 24 * 60 * 60 * 1000;
    const date = localISODate(ts);
    const dayLabel = DAY_LETTERS[new Date(ts).getDay()];
    perDay.push({ date, dayLabel, count: 0, avgScore: 0, worst: null });
  }
  const byDate = new Map(perDay.map((b) => [b.date, b]));
  for (const a of recent) {
    const bucket = byDate.get(localISODate(a.createdAt));
    if (!bucket) continue;
    bucket.count += 1;
    bucket.avgScore += a.triageScore;
    if (!bucket.worst || TRIAGE_RANK[a.triageLevel] > TRIAGE_RANK[bucket.worst]) {
      bucket.worst = a.triageLevel;
    }
  }
  for (const b of perDay) {
    if (b.count > 0) b.avgScore = b.avgScore / b.count;
  }

  const taskCounts = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) AS total, SUM(done) AS done FROM tasks`,
  );

  return {
    totalPatients,
    assessments7d,
    urgentOrReview7d,
    tasksDone: taskCounts?.done ?? 0,
    tasksTotal: taskCounts?.total ?? 0,
    triageMix,
    dispositionMix,
    perDay,
    patientLatest,
  };
}
