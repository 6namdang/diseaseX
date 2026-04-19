import type { SQLiteDatabase } from 'expo-sqlite';
import type { Escalation, EscalationRow, EscalationStatus, RedFlagKey } from './types';

function rowToEscalation(r: EscalationRow): Escalation {
  let flags: RedFlagKey[] = [];
  try {
    const parsed = JSON.parse(r.red_flags);
    if (Array.isArray(parsed)) flags = parsed as RedFlagKey[];
  } catch {}
  return {
    id: r.id,
    assessmentId: r.assessment_id,
    createdAt: r.created_at,
    redFlags: flags,
    smsBody: r.sms_body,
    clinicianPhone: r.clinician_phone,
    twilioSid: r.twilio_sid,
    status: r.status,
    errorMessage: r.error_message,
  };
}

export type EscalationInsert = {
  assessmentId: number;
  redFlags: RedFlagKey[];
  smsBody: string;
  clinicianPhone: string;
  status: EscalationStatus;
  twilioSid: string | null;
  errorMessage: string | null;
};

export async function insertEscalation(
  db: SQLiteDatabase,
  e: EscalationInsert,
): Promise<number> {
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO escalation (
      assessment_id, created_at, red_flags, sms_body, clinician_phone,
      twilio_sid, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.assessmentId,
      now,
      JSON.stringify(e.redFlags),
      e.smsBody,
      e.clinicianPhone,
      e.twilioSid,
      e.status,
      e.errorMessage,
    ],
  );
  return res.lastInsertRowId;
}

/**
 * Returns the most recent SUCCESSFUL (status='sent') escalation, regardless
 * of which red flags fired. Used by the cooldown check.
 */
export async function getLastSentEscalation(
  db: SQLiteDatabase,
): Promise<Escalation | null> {
  const row = await db.getFirstAsync<EscalationRow>(
    `SELECT * FROM escalation WHERE status = 'sent' ORDER BY created_at DESC LIMIT 1`,
  );
  return row ? rowToEscalation(row) : null;
}

export async function listEscalations(
  db: SQLiteDatabase,
  limit = 50,
): Promise<Escalation[]> {
  const rows = await db.getAllAsync<EscalationRow>(
    'SELECT * FROM escalation ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToEscalation);
}
