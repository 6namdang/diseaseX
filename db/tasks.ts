import { getDb, newId } from './index';

export interface Task {
  id: string;
  patientId: string | null;
  label: string;
  done: boolean;
  createdAt: number;
}

interface TaskRow {
  id: string;
  patient_id: string | null;
  label: string;
  done: number;
  created_at: number;
}

function fromRow(r: TaskRow): Task {
  return {
    id: r.id,
    patientId: r.patient_id,
    label: r.label,
    done: r.done === 1,
    createdAt: r.created_at,
  };
}

export async function listTasks(patientId?: string | null): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE patient_id IS ? OR patient_id IS NULL
     ORDER BY done ASC, created_at ASC`,
    patientId ?? null,
  );
  return rows.map(fromRow);
}

export async function addTask(label: string, patientId?: string | null): Promise<Task> {
  const db = await getDb();
  const now = Date.now();
  const id = newId('t');
  await db.runAsync(
    `INSERT INTO tasks(id, patient_id, label, done, created_at)
     VALUES(?, ?, ?, 0, ?)`,
    id,
    patientId ?? null,
    label.trim(),
    now,
  );
  return { id, patientId: patientId ?? null, label: label.trim(), done: false, createdAt: now };
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE tasks SET done = ? WHERE id = ?`, done ? 1 : 0, id);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, id);
}
