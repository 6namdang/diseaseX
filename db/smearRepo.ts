/**
 * CRUD for blood-smear analyses. Single-patient-per-device, so no patient FK —
 * rows are owned implicitly by the one patient row (id=1).
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Smear, SmearBand, SmearRow, SmearSpecies } from './types';

export type SmearInput = {
  photoUri: string;
  species: SmearSpecies;
  parasitemiaPct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  modelId: string;
  durationMs: number | null;
  notes?: string | null;
};

function rowToSmear(r: SmearRow): Smear {
  return {
    id: r.id,
    createdAt: r.created_at,
    photoUri: r.photo_uri,
    species: r.species,
    parasitemiaPct: r.parasitemia_pct,
    confidence: r.confidence,
    band: r.band,
    recommendation: r.recommendation,
    modelId: r.model_id,
    durationMs: r.duration_ms,
    notes: r.notes,
  };
}

export async function insertSmear(
  db: SQLiteDatabase,
  input: SmearInput,
): Promise<number> {
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO smear (
      created_at, photo_uri, species, parasitemia_pct, confidence,
      band, recommendation, model_id, duration_ms, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      now,
      input.photoUri,
      input.species,
      input.parasitemiaPct,
      input.confidence,
      input.band,
      input.recommendation,
      input.modelId,
      input.durationMs,
      input.notes ?? null,
    ],
  );
  return res.lastInsertRowId;
}

export async function listSmears(
  db: SQLiteDatabase,
  limit = 90,
): Promise<Smear[]> {
  const rows = await db.getAllAsync<SmearRow>(
    'SELECT * FROM smear ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToSmear);
}

export async function getLatestSmear(
  db: SQLiteDatabase,
): Promise<Smear | null> {
  const row = await db.getFirstAsync<SmearRow>(
    'SELECT * FROM smear ORDER BY created_at DESC LIMIT 1',
  );
  return row ? rowToSmear(row) : null;
}

export async function deleteSmear(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM smear WHERE id = ?', [id]);
}

export async function countSmears(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM smear',
  );
  return row?.n ?? 0;
}
