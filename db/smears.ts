import { getDb, newId } from './index';

export type SmearSpecies = 'none' | 'pf' | 'pv' | 'po' | 'pm' | 'mixed';
export type SmearBand = 'negative' | 'low' | 'moderate' | 'high';

export interface Smear {
  id: string;
  patientId: string;
  photoUri: string;
  species: SmearSpecies;
  parasitemiaPct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  notes: string | null;
  modelId: string;
  createdAt: number;
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

function fromRow(r: SmearRow): Smear {
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

export async function saveSmear(input: {
  patientId: string;
  photoUri: string;
  species: SmearSpecies;
  parasitemiaPct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  notes?: string | null;
  modelId: string;
}): Promise<Smear> {
  const db = await getDb();
  const id = newId('s');
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO smears(
       id, patient_id, photo_uri, species, parasitemia_pct, confidence,
       band, recommendation, notes, model_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.patientId,
    input.photoUri,
    input.species,
    input.parasitemiaPct,
    input.confidence,
    input.band,
    input.recommendation,
    input.notes ?? null,
    input.modelId,
    now,
  );
  return {
    id,
    patientId: input.patientId,
    photoUri: input.photoUri,
    species: input.species,
    parasitemiaPct: input.parasitemiaPct,
    confidence: input.confidence,
    band: input.band,
    recommendation: input.recommendation,
    notes: input.notes ?? null,
    modelId: input.modelId,
    createdAt: now,
  };
}

export async function listSmears(patientId: string): Promise<Smear[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SmearRow>(
    `SELECT * FROM smears WHERE patient_id = ? ORDER BY created_at DESC`,
    patientId,
  );
  return rows.map(fromRow);
}

export async function getLatestSmear(patientId: string): Promise<Smear | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SmearRow>(
    `SELECT * FROM smears WHERE patient_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    patientId,
  );
  return row ? fromRow(row) : null;
}

export async function deleteSmear(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM smears WHERE id = ?`, id);
}
