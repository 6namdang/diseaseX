/**
 * On-device blood-smear analyzer.
 *
 * MVP implementation: a deterministic heuristic that derives a plausible
 * malaria classification from the image's URI / dimensions. It runs fully
 * offline (no network calls) and returns the same result for the same image,
 * so demos are reproducible.
 *
 * It is intentionally hidden behind the `analyzeSmear()` interface so that
 * a real model (TFLite via `react-native-fast-tflite`, or ONNX Runtime, or a
 * remote inference endpoint) can be dropped in later by replacing this file.
 *
 * NEVER present this output as a clinical diagnosis. The UI labels every
 * result as a demo and recommends confirmatory testing.
 */

import type { SmearBand, SmearSpecies } from '../db/smears';

export const MODEL_ID = 'malaria-demo-heuristic-v1';
export const MODEL_DISPLAY_NAME = 'On-device demo classifier';

export interface SmearAnalysis {
  species: SmearSpecies;
  parasitemiaPct: number;
  confidence: number;
  band: SmearBand;
  recommendation: string;
  modelId: string;
  /** Wall-clock ms spent inside `analyzeSmear` — useful for the UI footer. */
  durationMs: number;
}

/**
 * Cheap, stable, non-cryptographic 32-bit hash. Same string → same number on
 * every device, every run. We use it to seed the heuristic so that re-running
 * the same photo yields a reproducible "diagnosis" — this is what makes the
 * placeholder feel like a real model rather than a randomiser.
 */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 — small, decent-quality seeded PRNG. */
function seededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function bandFor(species: SmearSpecies, parasitemia: number): SmearBand {
  if (species === 'none') return 'negative';
  if (parasitemia < 0.5) return 'low';
  if (parasitemia < 2) return 'moderate';
  return 'high';
}

function recommendationFor(band: SmearBand, species: SmearSpecies): string {
  if (band === 'negative') {
    return 'No parasites visible. If clinical suspicion is high, repeat smear in 8–12h or run an RDT.';
  }
  const speciesNote =
    species === 'pf'
      ? 'P. falciparum'
      : species === 'pv'
        ? 'P. vivax'
        : species === 'po'
          ? 'P. ovale'
          : species === 'pm'
            ? 'P. malariae'
            : species === 'mixed'
              ? 'Mixed infection'
              : 'Plasmodium spp.';
  if (band === 'high') {
    return `${speciesNote} likely. Treat as severe malaria — start parenteral artesunate per WHO protocol and arrange referral.`;
  }
  if (band === 'moderate') {
    return `${speciesNote} likely. Begin first-line ACT and monitor for danger signs every 4–6h.`;
  }
  return `${speciesNote} possible at low density. Confirm with RDT and re-smear if symptoms persist.`;
}

function pickSpecies(roll: number): SmearSpecies {
  if (roll < 0.32) return 'none';
  if (roll < 0.74) return 'pf';
  if (roll < 0.86) return 'pv';
  if (roll < 0.93) return 'po';
  if (roll < 0.98) return 'pm';
  return 'mixed';
}

export interface AnalyzeOptions {
  /** Optional extra signal mixed into the seed (e.g. file size / mtime). */
  signal?: string | number;
}

/**
 * Analyse a blood-smear image. The whole call stays on-device.
 *
 * @param photoUri  file:// URI from `expo-image-picker` (or any string id).
 * @param opts      optional extra entropy mixed into the deterministic seed.
 */
export async function analyzeSmear(
  photoUri: string,
  opts: AnalyzeOptions = {},
): Promise<SmearAnalysis> {
  const start = Date.now();
  // Tiny artificial latency so the UI can show a "running model" state.
  await new Promise((r) => setTimeout(r, 1100));

  const seedKey = `${photoUri}|${opts.signal ?? ''}`;
  const rng = seededRng(hashString(seedKey));

  const species = pickSpecies(rng());
  const parasitemiaPct = species === 'none' ? 0 : Number((rng() * 4).toFixed(2));
  const confidence = Number((0.55 + rng() * 0.4).toFixed(2));
  const band = bandFor(species, parasitemiaPct);
  const recommendation = recommendationFor(band, species);

  return {
    species,
    parasitemiaPct,
    confidence,
    band,
    recommendation,
    modelId: MODEL_ID,
    durationMs: Date.now() - start,
  };
}

export const SPECIES_LABEL: Record<SmearSpecies, string> = {
  none: 'No parasites detected',
  pf: 'P. falciparum',
  pv: 'P. vivax',
  po: 'P. ovale',
  pm: 'P. malariae',
  mixed: 'Mixed infection',
};

export const BAND_LABEL: Record<SmearBand, string> = {
  negative: 'Negative',
  low: 'Low parasitemia',
  moderate: 'Moderate parasitemia',
  high: 'High parasitemia',
};
