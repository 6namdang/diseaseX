/**
 * Escalation pipeline: called immediately after an assessment is saved.
 *
 *   1. Detect red flags on the new assessment.
 *   2. If none → no-op.
 *   3. If last SENT escalation is <6h ago AND no NEW red flag vs that
 *      escalation → record a 'skipped_cooldown' row, no SMS.
 *   4. Build a ≤160-char SMS and fire Twilio.
 *   5. Persist the escalation row with outcome (sent | failed | disabled).
 *   6. If sent, stamp the assessment's `escalated_at`.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getLastSentEscalation,
  insertEscalation,
} from '../db/escalationRepo';
import { markAssessmentEscalated, activeRedFlags } from '../db/assessmentRepo';
import type { Assessment, Escalation, Patient, RedFlagKey } from '../db/types';
import { normalizePhone, sendSms, isConfigured } from './twilioClient';

const COOLDOWN_MS = 6 * 60 * 60 * 1000;

const RED_FLAG_LABEL: Record<RedFlagKey, string> = {
  confused: 'confused',
  seizures: 'seizures',
  unable_to_walk: 'unable to walk',
  dark_urine: 'dark urine',
  yellow_eyes: 'yellow eyes',
  persistent_vomiting: 'vomiting+dehydration',
};

export type EscalationOutcome =
  | { kind: 'no_red_flags' }
  | { kind: 'no_clinician' }
  | { kind: 'cooldown'; escalationId: number }
  | { kind: 'sent'; escalationId: number; twilioSid: string }
  | { kind: 'failed'; escalationId: number; error: string }
  | { kind: 'disabled'; escalationId: number; reason: string };

export async function runEscalation(
  db: SQLiteDatabase,
  patient: Patient,
  assessment: Assessment,
): Promise<EscalationOutcome> {
  const flags = activeRedFlags(assessment);
  if (flags.length === 0) return { kind: 'no_red_flags' };

  if (!patient.clinicianPhone) {
    return { kind: 'no_clinician' };
  }

  const last = await getLastSentEscalation(db);
  if (last && shouldCooldown(last, assessment.createdAt, flags)) {
    const escalationId = await insertEscalation(db, {
      assessmentId: assessment.id,
      redFlags: flags,
      smsBody: '',
      clinicianPhone: patient.clinicianPhone,
      twilioSid: null,
      status: 'skipped_cooldown',
      errorMessage: null,
    });
    return { kind: 'cooldown', escalationId };
  }

  const smsBody = buildSms(patient, assessment, flags);
  const to = normalizePhone(patient.clinicianPhone);

  if (!isConfigured()) {
    const escalationId = await insertEscalation(db, {
      assessmentId: assessment.id,
      redFlags: flags,
      smsBody,
      clinicianPhone: to,
      twilioSid: null,
      status: 'disabled',
      errorMessage: 'Twilio credentials not configured',
    });
    return { kind: 'disabled', escalationId, reason: 'Twilio credentials not configured' };
  }

  const result = await sendSms({ to, body: smsBody });
  if (result.kind === 'sent') {
    const escalationId = await insertEscalation(db, {
      assessmentId: assessment.id,
      redFlags: flags,
      smsBody,
      clinicianPhone: to,
      twilioSid: result.sid,
      status: 'sent',
      errorMessage: null,
    });
    await markAssessmentEscalated(db, assessment.id, assessment.createdAt);
    return { kind: 'sent', escalationId, twilioSid: result.sid };
  }

  if (result.kind === 'disabled') {
    const escalationId = await insertEscalation(db, {
      assessmentId: assessment.id,
      redFlags: flags,
      smsBody,
      clinicianPhone: to,
      twilioSid: null,
      status: 'disabled',
      errorMessage: result.reason,
    });
    return { kind: 'disabled', escalationId, reason: result.reason };
  }

  const escalationId = await insertEscalation(db, {
    assessmentId: assessment.id,
    redFlags: flags,
    smsBody,
    clinicianPhone: to,
    twilioSid: null,
    status: 'failed',
    errorMessage: result.error,
  });
  return { kind: 'failed', escalationId, error: result.error };
}

function shouldCooldown(
  last: Escalation,
  now: number,
  currFlags: RedFlagKey[],
): boolean {
  if (now - last.createdAt >= COOLDOWN_MS) return false;
  const newFlag = currFlags.some((f) => !last.redFlags.includes(f));
  return !newFlag;
}

/**
 * Build the ≤160-character SMS. Clinicians get: app tag, patient name +
 * age + weight, red-flag list, patient callback phone.
 *
 * Example (84 chars):
 *   DiseaseX URGENT: Amina 6y 12kg. Flags: confused,dark urine. Call +254700123456
 */
export function buildSms(
  patient: Patient,
  assessment: Assessment,
  flags: RedFlagKey[],
): string {
  const name = patient.name ?? 'Patient';
  const age = patient.age != null ? `${patient.age}y` : '';
  const weight = patient.weightKg != null ? `${patient.weightKg}kg` : '';
  const descriptor = [name, age, weight].filter(Boolean).join(' ');

  const flagWords = flags
    .map((f) => RED_FLAG_LABEL[f])
    .join(',');

  const callback = patient.patientPhone
    ? ` Call ${patient.patientPhone}`
    : '';

  let body = `DiseaseX URGENT: ${descriptor}. Flags: ${flagWords}.${callback}`;
  if (body.length > 160) {
    // Truncate flag list to fit; clinician can open the app for detail.
    const headroom =
      160 - `DiseaseX URGENT: ${descriptor}. Flags: .${callback}`.length - 1;
    const truncated = flagWords.slice(0, Math.max(0, headroom));
    body = `DiseaseX URGENT: ${descriptor}. Flags: ${truncated}.${callback}`;
    if (body.length > 160) body = body.slice(0, 160);
  }
  return body;
}
