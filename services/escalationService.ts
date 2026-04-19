/**
 * Escalation pipeline: called immediately after an assessment is saved.
 *
 *   1. Detect red flags on the new assessment.
 *   2. If none → no-op.
 *   3. If patient has no ntfy alert topic configured → no_clinician.
 *   4. Otherwise send IMMEDIATELY. There is no cooldown: every red-flag
 *      assessment triggers a push so the clinician sees every data point.
 *   5. Build a full, human-readable message (date/time, patient context,
 *      vitals, symptoms, red flags, trend vs. previous check, notes).
 *   6. Publish the text alert to ntfy.sh.
 *   7. Upload each attached photo to the same topic as a ntfy attachment
 *      so it lands in the clinician's ntfy app next to the text alert.
 *   8. Persist the escalation row and stamp the assessment's `escalated_at`.
 *
 * This module is the only consumer of {@link ../services/ntfyClient}; UI
 * code reacts to the returned {@link EscalationOutcome} instead of making
 * provider calls directly.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import {
  activeRedFlags,
  getPhotosForAssessment,
  listAssessments,
  markAssessmentEscalated,
} from '../db/assessmentRepo';
import { insertEscalation } from '../db/escalationRepo';
import type {
  Assessment,
  AssessmentPhoto,
  Patient,
  RedFlagKey,
  SymptomPhotoTag,
} from '../db/types';
import { publishNtfy, publishNtfyAttachment } from './ntfyClient';

const RED_FLAG_LABEL: Record<RedFlagKey, string> = {
  confused: 'confusion',
  seizures: 'seizures',
  unable_to_walk: 'unable to walk',
  dark_urine: 'dark urine',
  yellow_eyes: 'yellow eyes (jaundice)',
  persistent_vomiting: 'persistent vomiting + dehydration',
};

const PHOTO_TAG_LABEL: Record<SymptomPhotoTag, string> = {
  eyes: 'Eyes',
  urine: 'Urine',
  palm: 'Palm',
  skin: 'Skin',
  other: 'Other',
};

export type EscalationOutcome =
  | { kind: 'no_red_flags' }
  | { kind: 'no_clinician' }
  | {
      kind: 'sent';
      escalationId: number;
      messageId: string;
      photosAttached: number;
      photosFailed: number;
    }
  | { kind: 'failed'; escalationId: number; error: string };

export async function runEscalation(
  db: SQLiteDatabase,
  patient: Patient,
  assessment: Assessment,
): Promise<EscalationOutcome> {
  const flags = activeRedFlags(assessment);
  if (flags.length === 0) return { kind: 'no_red_flags' };

  const topic = patient.clinicianAlertTopic?.trim();
  if (!topic) {
    return { kind: 'no_clinician' };
  }

  // Load context in parallel: the previous assessment (for trend) and the
  // photos attached to the new one. Neither failure is fatal — we still
  // want the text alert out the door.
  const [photos, previous] = await Promise.all([
    getPhotosForAssessment(db, assessment.id).catch(() => [] as AssessmentPhoto[]),
    loadPreviousAssessment(db, assessment.id),
  ]);

  const trend = computeTrend(assessment, previous);
  const messageBody = buildAlertMessage(patient, assessment, flags, {
    previous,
    trend,
    photoCount: photos.length,
  });
  const title = buildAlertTitle(patient, flags);

  const result = await publishNtfy({
    topic,
    message: messageBody,
    title,
    priority: 5,
    tags: ['rotating_light', 'warning'],
  });

  if (result.kind !== 'sent') {
    const escalationId = await insertEscalation(db, {
      assessmentId: assessment.id,
      redFlags: flags,
      messageBody,
      clinicianAlertTopic: topic,
      providerMessageId: null,
      status: 'failed',
      errorMessage: result.error,
    });
    return { kind: 'failed', escalationId, error: result.error };
  }

  // Text alert delivered. Now attach photos one by one. Each attachment is
  // its own ntfy message on the same topic, so the clinician gets the
  // summary first, then the images stack under it.
  const { attached, failed } = await uploadPhotos(topic, patient, assessment, photos);

  const escalationId = await insertEscalation(db, {
    assessmentId: assessment.id,
    redFlags: flags,
    messageBody,
    clinicianAlertTopic: topic,
    providerMessageId: result.messageId,
    status: 'sent',
    errorMessage: null,
  });
  await markAssessmentEscalated(db, assessment.id, assessment.createdAt);

  return {
    kind: 'sent',
    escalationId,
    messageId: result.messageId,
    photosAttached: attached,
    photosFailed: failed,
  };
}

/**
 * Pull the assessment immediately preceding the current one. Used to
 * annotate the alert with a trend line ("worsening vs. last check").
 */
async function loadPreviousAssessment(
  db: SQLiteDatabase,
  currentId: number,
): Promise<Assessment | null> {
  try {
    const recent = await listAssessments(db, 2);
    const prev = recent.find((a) => a.id !== currentId);
    return prev ?? null;
  } catch {
    return null;
  }
}

type Trend = 'better' | 'worse' | 'same' | null;

function computeTrend(current: Assessment, previous: Assessment | null): Trend {
  if (!previous) return null;
  if (current.severityScore < previous.severityScore) return 'better';
  if (current.severityScore > previous.severityScore) return 'worse';
  return 'same';
}

async function uploadPhotos(
  topic: string,
  patient: Patient,
  assessment: Assessment,
  photos: AssessmentPhoto[],
): Promise<{ attached: number; failed: number }> {
  if (photos.length === 0) return { attached: 0, failed: 0 };

  const patientLabel = shortPatientLabel(patient);
  let attached = 0;
  let failed = 0;

  // Upload sequentially. Public ntfy.sh rate-limits attachment uploads, so
  // parallelising would only burn the budget faster for little latency win.
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const tagLabel = PHOTO_TAG_LABEL[p.symptomTag] ?? p.symptomTag;
    const filename = buildFilename(p, i, assessment.createdAt);
    const caption = `${tagLabel} photo (${i + 1}/${photos.length}) - ${patientLabel}`;

    const res = await publishNtfyAttachment({
      topic,
      fileUri: p.fileUri,
      filename,
      title: `${tagLabel} - ${patientLabel}`,
      message: caption,
      priority: 4,
      tags: ['camera'],
    });
    if (res.kind === 'sent') attached += 1;
    else failed += 1;
  }

  return { attached, failed };
}

function buildFilename(
  photo: AssessmentPhoto,
  index: number,
  createdAt: number,
): string {
  const ts = new Date(createdAt);
  const yyyy = ts.getFullYear();
  const mm = String(ts.getMonth() + 1).padStart(2, '0');
  const dd = String(ts.getDate()).padStart(2, '0');
  const hh = String(ts.getHours()).padStart(2, '0');
  const min = String(ts.getMinutes()).padStart(2, '0');
  const ext = inferExtension(photo.fileUri);
  return `${yyyy}${mm}${dd}-${hh}${min}-${photo.symptomTag}-${index + 1}.${ext}`;
}

function inferExtension(uri: string): string {
  const match = uri.toLowerCase().match(/\.(jpe?g|png|heic|webp|gif)(?:\?|#|$)/);
  if (match) return match[1] === 'jpeg' ? 'jpg' : match[1];
  return 'jpg';
}

function shortPatientLabel(patient: Patient): string {
  const name = patient.name?.trim() || 'Patient';
  const age = patient.age != null ? `${patient.age}y` : '';
  return [name, age].filter(Boolean).join(' ');
}

/**
 * Build the push notification title. ntfy shows the Title as the push
 * headline, so keep it short and ASCII-safe (non-ASCII headers are
 * stripped by {@link ./ntfyClient}).
 */
export function buildAlertTitle(patient: Patient, flags: RedFlagKey[]): string {
  const name = patient.name?.trim() || 'Patient';
  const flagCount = flags.length;
  const flagWord = flagCount === 1 ? 'red flag' : 'red flags';
  return `DiseaseX URGENT: ${name} - ${flagCount} ${flagWord}`;
}

export type AlertContext = {
  previous: Assessment | null;
  trend: Trend;
  photoCount: number;
};

/**
 * Build the push body. Unlike the SMS era this is UTF-8 and has no 160-char
 * limit, so we include everything the clinician needs to decide without
 * opening the app:
 *
 *   DiseaseX urgent alert
 *   Time: Sat Apr 18, 2026 - 14:32
 *
 *   Patient: Amina, 6y, female, 12kg
 *   Location: Kenya, Nairobi (endemic)
 *   History: 2 prior malaria episodes
 *
 *   RED FLAGS:
 *     - confusion
 *     - dark urine
 *
 *   Current assessment:
 *     Severity: 42.0 (worsening from 28.0)
 *     Fever: yes (39.2 C)
 *     Vomiting: yes (cannot keep fluids down)
 *     Symptom onset: 3 days ago
 *     Symptoms: headache, chills, muscle pain
 *     Notes: "stopped eating this morning"
 *
 *   3 photo(s) attached in follow-up messages (eyes, palm, urine).
 *
 *   Patient callback: +254 700 123 456
 */
export function buildAlertMessage(
  patient: Patient,
  assessment: Assessment,
  flags: RedFlagKey[],
  ctx: AlertContext,
): string {
  const lines: string[] = [];

  lines.push('DiseaseX URGENT ALERT');
  lines.push(`Time: ${formatDateTime(assessment.createdAt)}`);
  lines.push('');

  // Patient identity block
  lines.push(`Patient: ${describePatient(patient)}`);
  const locLine = describeLocation(patient);
  if (locLine) lines.push(`Location: ${locLine}`);
  const historyLine = describeHistory(patient);
  if (historyLine) lines.push(`History: ${historyLine}`);
  lines.push('');

  // Red flags — the reason this alert exists
  lines.push(`RED FLAGS (${flags.length}):`);
  for (const f of flags) lines.push(`  - ${RED_FLAG_LABEL[f]}`);
  lines.push('');

  // Current assessment details
  lines.push('Current assessment:');
  lines.push(`  Severity: ${assessment.severityScore.toFixed(1)}${formatTrend(ctx)}`);
  lines.push(`  Fever: ${formatFever(assessment)}`);
  lines.push(`  Vomiting: ${formatVomiting(assessment)}`);
  if (assessment.symptomOnsetDaysAgo != null) {
    const d = assessment.symptomOnsetDaysAgo;
    lines.push(`  Symptom onset: ${d} day${d === 1 ? '' : 's'} ago`);
  }
  if (assessment.symptoms.length > 0) {
    const pretty = assessment.symptoms.map((s) => s.replace(/_/g, ' ')).join(', ');
    lines.push(`  Symptoms: ${pretty}`);
  }
  if (assessment.notes && assessment.notes.trim().length > 0) {
    lines.push(`  Notes: "${assessment.notes.trim()}"`);
  }

  if (ctx.photoCount > 0) {
    lines.push('');
    lines.push(
      `${ctx.photoCount} photo${ctx.photoCount === 1 ? '' : 's'} attached in follow-up messages.`,
    );
  }

  if (patient.patientPhone) {
    lines.push('');
    lines.push(`Patient callback: ${patient.patientPhone}`);
  }

  return lines.join('\n');
}

function describePatient(p: Patient): string {
  const parts: string[] = [];
  parts.push(p.name?.trim() || 'Unknown');
  if (p.age != null) parts.push(`${p.age}y`);
  if (p.sex) parts.push(p.sex);
  if (p.weightKg != null) parts.push(`${p.weightKg}kg`);
  const base = parts.join(', ');

  const extras: string[] = [];
  if (p.isPregnant) {
    const tri = p.pregnancyTrimester ? `, trimester ${p.pregnancyTrimester}` : '';
    extras.push(`pregnant${tri}`);
  }
  if (p.isBreastfeeding) extras.push('breastfeeding');
  if (p.allergies.length > 0) extras.push(`allergies: ${p.allergies.join(', ')}`);
  if (p.currentMedications.length > 0) {
    extras.push(`on: ${p.currentMedications.join(', ')}`);
  }
  if (p.chronicConditions.length > 0) {
    extras.push(`chronic: ${p.chronicConditions.join(', ')}`);
  }
  return extras.length > 0 ? `${base} (${extras.join('; ')})` : base;
}

function describeLocation(p: Patient): string | null {
  if (!p.countryName && !p.region) return null;
  const geo = p.region
    ? `${p.countryName ?? ''}, ${p.region}`.replace(/^,\s*/, '')
    : (p.countryName ?? '');
  const endemic = p.endemicity ? ` (${p.endemicity})` : '';
  return `${geo}${endemic}`;
}

function describeHistory(p: Patient): string | null {
  const bits: string[] = [];
  if (p.priorMalariaEpisodes != null && p.priorMalariaEpisodes > 0) {
    bits.push(
      `${p.priorMalariaEpisodes} prior malaria episode${p.priorMalariaEpisodes === 1 ? '' : 's'}`,
    );
  }
  return bits.length > 0 ? bits.join('; ') : null;
}

function formatFever(a: Assessment): string {
  if (a.fever === null) return 'unknown';
  if (!a.fever) return 'no';
  return a.feverTempC != null ? `yes (${a.feverTempC} C)` : 'yes';
}

function formatVomiting(a: Assessment): string {
  if (a.vomiting === null) return 'unknown';
  if (!a.vomiting) return 'no';
  if (a.canKeepFluidsDown === false) return 'yes (cannot keep fluids down)';
  if (a.canKeepFluidsDown === true) return 'yes (keeping fluids down)';
  return 'yes';
}

function formatTrend(ctx: AlertContext): string {
  if (!ctx.previous || !ctx.trend) return '';
  const prev = ctx.previous.severityScore.toFixed(1);
  switch (ctx.trend) {
    case 'worse':
      return ` (WORSENING from ${prev})`;
    case 'better':
      return ` (improving from ${prev})`;
    case 'same':
      return ` (unchanged from ${prev})`;
  }
}

/**
 * Produce an ASCII-only, human-readable timestamp. Clinicians read these
 * on lock-screen; no weekday jargon, no abbreviations they have to parse.
 * Example: "Sat Apr 18, 2026 - 14:32"
 */
function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const wd = weekdays[d.getDay()];
  const mo = months[d.getMonth()];
  const day = d.getDate();
  const yr = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${wd} ${mo} ${day}, ${yr} - ${hh}:${mm}`;
}
