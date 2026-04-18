import { getDb, newId } from './index';

export type PatientStatus = 'good' | 'monitor' | 'alert';

export interface Patient {
  id: string;
  caseId: string;
  label: string;
  status: PatientStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
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

function fromRow(r: PatientRow): Patient {
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

export async function listPatients(): Promise<Patient[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PatientRow>(
    `SELECT * FROM patients ORDER BY created_at ASC`,
  );
  return rows.map(fromRow);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PatientRow>(
    `SELECT * FROM patients WHERE id = ?`,
    id,
  );
  return row ? fromRow(row) : null;
}

export async function addPatient(input: {
  caseId: string;
  label: string;
  status?: PatientStatus;
  notes?: string | null;
}): Promise<Patient> {
  const db = await getDb();
  const now = Date.now();
  const id = newId('p');
  await db.runAsync(
    `INSERT INTO patients(id, case_id, label, status, notes, created_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.caseId.trim(),
    input.label.trim(),
    input.status ?? 'monitor',
    input.notes ?? null,
    now,
    now,
  );
  return {
    id,
    caseId: input.caseId.trim(),
    label: input.label.trim(),
    status: input.status ?? 'monitor',
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updatePatient(
  id: string,
  patch: Partial<Pick<Patient, 'caseId' | 'label' | 'status' | 'notes'>>,
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.caseId !== undefined) {
    sets.push('case_id = ?');
    args.push(patch.caseId);
  }
  if (patch.label !== undefined) {
    sets.push('label = ?');
    args.push(patch.label);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    args.push(patch.status);
  }
  if (patch.notes !== undefined) {
    sets.push('notes = ?');
    args.push(patch.notes);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(Date.now());
  args.push(id);
  await db.runAsync(
    `UPDATE patients SET ${sets.join(', ')} WHERE id = ?`,
    ...args,
  );
}

export async function deletePatient(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM patients WHERE id = ?`, id);
}

export async function countPatients(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM patients`,
  );
  return row?.n ?? 0;
}
