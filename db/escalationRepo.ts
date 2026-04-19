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
    messageBody: r.sms_body,
    // clinician_phone holds the ntfy topic for v3+ rows and a phone number
    // for legacy Twilio rows — same semantic (where the alert was addressed).
    clinicianAlertTopic: r.clinician_phone,
    // Prefer the new ntfy id; fall back to the Twilio SID for legacy rows.
    providerMessageId: r.provider_message_id ?? r.twilio_sid,
    status: r.status,
    errorMessage: r.error_message,
  };
}

export type EscalationInsert = {
  assessmentId: number;
  redFlags: RedFlagKey[];
  messageBody: string;
  clinicianAlertTopic: string;
  providerMessageId: string | null;
  status: EscalationStatus;
  errorMessage: string | null;
};

export async function insertEscalation(
  db: SQLiteDatabase,
  e: EscalationInsert,
): Promise<number> {
  const now = Date.now();
  // The legacy clinician_phone column is NOT NULL; we reuse it as the
  // "where sent" string column for ntfy (the topic). twilio_sid stays
  // NULL on v3+ rows, provider_message_id holds the ntfy id.
  const res = await db.runAsync(
    `INSERT INTO escalation (
      assessment_id, created_at, red_flags, sms_body, clinician_phone,
      twilio_sid, provider_message_id, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.assessmentId,
      now,
      JSON.stringify(e.redFlags),
      e.messageBody,
      e.clinicianAlertTopic,
      null,
      e.providerMessageId,
      e.status,
      e.errorMessage,
    ],
  );
  return res.lastInsertRowId;
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
