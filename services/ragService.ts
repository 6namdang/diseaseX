/**
 * On-device RAG pipeline: embeds the user's question with a MiniLM GGUF
 * model, retrieves from a bundled embeddings index, then runs a Qwen3
 * completion with a patient-tailored system prompt.
 *
 * This module is stateless w.r.t. the patient / chat history: the caller
 * passes both via {@link setContext} before each query. Persistence lives
 * entirely in SQLite (see db/chatRepo, db/patientRepo).
 */

import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import embeddingsDataRaw from '../assets/embeddings.json';
import type { ChatMessage, Patient, RedFlagKey } from '../db/types';

type EmbeddingsData = {
  dim: number;
  count: number;
  chunks: string[];
  embeddings: number[][];
};

const embeddingsData = embeddingsDataRaw as EmbeddingsData;

const LLM_URL =
  'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf';
const LLM_PATH = `${RNFS.DocumentDirectoryPath}/qwen3-0.6b.gguf`;

const EMBED_URL =
  'https://huggingface.co/leliuga/all-MiniLM-L6-v2-GGUF/resolve/main/all-MiniLM-L6-v2.Q8_0.gguf';
const EMBED_PATH = `${RNFS.DocumentDirectoryPath}/minilm.gguf`;

const MAX_HISTORY_TURNS = 8;

const log = (msg: string, ...args: any[]) => console.log(`[RAG] ${msg}`, ...args);

function dequantize(int8Vec: number[]): number[] {
  const out = new Array(int8Vec.length);
  for (let i = 0; i < int8Vec.length; i++) out[i] = int8Vec[i] / 127;
  return out;
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function normalize(v: number[]): number[] {
  let mag = 0;
  for (const x of v) mag += x * x;
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  return v.map((x) => x / mag);
}

type Context = {
  patient: Patient | null;
  history: ChatMessage[];
};

class RAGService {
  private llmCtx: LlamaContext | null = null;
  private embedCtx: LlamaContext | null = null;
  private embeddings: number[][] = [];
  private chunks: string[] = [];
  private initialized = false;
  private ctx: Context = { patient: null, history: [] };

  /**
   * Provide the current patient record + recent chat history for the next
   * query. Caller owns SQLite persistence.
   */
  setContext(patient: Patient | null, history: ChatMessage[]): void {
    this.ctx = { patient, history: history.slice(-MAX_HISTORY_TURNS * 2) };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async downloadModels(onProgress: (p: number, label: string) => void): Promise<void> {
    log('===== downloadModels() START =====');
    await this.downloadOne(
      EMBED_URL,
      EMBED_PATH,
      20e6,
      (p) => onProgress(p * 0.1, 'Embedding model'),
      'MiniLM',
    );
    await this.downloadOne(
      LLM_URL,
      LLM_PATH,
      500e6,
      (p) => onProgress(0.1 + p * 0.9, 'Language model'),
      'Qwen',
    );
    log('===== downloadModels() COMPLETE =====');
  }

  private async downloadOne(
    url: string,
    path: string,
    minSize: number,
    onProgress: (p: number) => void,
    label: string,
  ): Promise<void> {
    const exists = await RNFS.exists(path);
    if (exists) {
      const stat = await RNFS.stat(path);
      if (stat.size > minSize) {
        log(`[${label}] cached (${(stat.size / 1024 / 1024).toFixed(0)}MB)`);
        onProgress(1);
        return;
      }
      await RNFS.unlink(path);
    }
    log(`[${label}] downloading from ${url}`);
    const { promise } = RNFS.downloadFile({
      fromUrl: url,
      toFile: path,
      progress: ({ bytesWritten, contentLength }) =>
        contentLength > 0 && onProgress(bytesWritten / contentLength),
      progressDivider: 5,
    });
    const result = await promise;
    if (result.statusCode !== 200) {
      throw new Error(`[${label}] HTTP ${result.statusCode}`);
    }
    log(`[${label}] downloaded`);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    log('===== init() START =====');

    this.embedCtx = await initLlama({
      model: EMBED_PATH,
      n_ctx: 512,
      embedding: true,
      pooling_type: 'mean',
    });
    log('embedding model loaded');

    this.llmCtx = await initLlama({
      model: LLM_PATH,
      n_ctx: 4096,
      n_gpu_layers: 99,
    });
    log('LLM loaded');

    this.chunks = embeddingsData.chunks;
    this.embeddings = embeddingsData.embeddings.map(dequantize);
    log(`loaded ${this.chunks.length} chunks`);

    this.initialized = true;
    log('===== init() COMPLETE =====');
  }

  async release(): Promise<void> {
    await this.llmCtx?.release();
    await this.embedCtx?.release();
    this.llmCtx = null;
    this.embedCtx = null;
    this.initialized = false;
  }

  /**
   * Stream a single query through the model. The caller is responsible
   * for persisting the resulting assistant turn (and the user turn) to
   * SQLite.
   */
  async query(
    question: string,
    onThinking?: (t: string) => void,
    onAnswer?: (t: string) => void,
  ): Promise<{ thinking: string; answer: string }> {
    if (!this.llmCtx || !this.embedCtx) throw new Error('RAG not initialized');

    const { embedding } = await this.embedCtx.embedding(question);
    const qVec = normalize(embedding);
    const scores = this.embeddings.map((e, i) => ({ i, score: dot(qVec, e) }));
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 7).filter((s) => s.score > 0.2);

    if (top.length === 0) {
      const fallback =
        "I don't have clear information on that. Please contact a health worker right away.";
      onAnswer?.(fallback);
      return { thinking: '', answer: fallback };
    }

    const context = top
      .map((s, i) => `[Source ${i + 1}]\n${this.chunks[s.i]}`)
      .join('\n\n');

    const messages = [
      { role: 'system' as const, content: this.buildSystemPrompt() },
      ...this.ctx.history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      {
        role: 'user' as const,
        content: `Medical reference material:\n${context}\n\nPatient question: ${question}`,
      },
    ];

    let thinking = '';
    let answer = '';
    let inThinkTag = false;
    let buffer = '';

    await this.llmCtx.completion(
      {
        messages,
        n_predict: 768,
        temperature: 0.3,
        top_p: 0.9,
      },
      (data) => {
        buffer += data.token;
        while (true) {
          if (!inThinkTag) {
            const thinkStart = buffer.indexOf('<think>');
            if (thinkStart !== -1) {
              const before = buffer.slice(0, thinkStart);
              if (before) {
                answer += before;
                onAnswer?.(before);
              }
              buffer = buffer.slice(thinkStart + 7);
              inThinkTag = true;
              continue;
            }
            if (buffer.length > 0 && !'<think>'.startsWith(buffer)) {
              answer += buffer;
              onAnswer?.(buffer);
              buffer = '';
            }
            break;
          } else {
            const thinkEnd = buffer.indexOf('</think>');
            if (thinkEnd !== -1) {
              const thinkPart = buffer.slice(0, thinkEnd);
              thinking += thinkPart;
              onThinking?.(thinkPart);
              buffer = buffer.slice(thinkEnd + 8);
              inThinkTag = false;
              continue;
            }
            if (buffer.length > 0 && !'</think>'.startsWith(buffer)) {
              thinking += buffer;
              onThinking?.(buffer);
              buffer = '';
            }
            break;
          }
        }
      },
    );

    if (buffer) {
      if (inThinkTag) {
        thinking += buffer;
        onThinking?.(buffer);
      } else {
        answer += buffer;
        onAnswer?.(buffer);
      }
    }

    return { thinking: thinking.trim(), answer: answer.trim() };
  }

  /** Builds a system prompt stitched together from the patient record. */
  private buildSystemPrompt(): string {
    const p = this.ctx.patient;
    if (!p) return this.defaultPrompt();

    const ageGroup =
      p.age != null
        ? p.age < 5
          ? 'young child'
          : p.age < 13
            ? 'child'
            : p.age < 18
              ? 'adolescent'
              : p.age >= 65
                ? 'elderly'
                : 'adult'
        : 'unknown age';

    const bmi =
      p.weightKg && p.heightCm
        ? ` (BMI ${(p.weightKg / Math.pow(p.heightCm / 100, 2)).toFixed(1)})`
        : '';

    const profileParts: string[] = [];
    if (p.name) profileParts.push(`Name: ${p.name}`);
    if (p.age != null) profileParts.push(`Age: ${p.age} (${ageGroup})`);
    if (p.sex) profileParts.push(`Sex: ${p.sex}`);
    if (p.weightKg) profileParts.push(`Weight: ${p.weightKg}kg`);
    if (p.heightCm) profileParts.push(`Height: ${p.heightCm}cm${bmi}`);
    if (p.isPregnant) {
      profileParts.push(
        `PREGNANT${p.pregnancyTrimester ? ` (trimester ${p.pregnancyTrimester})` : ''}`,
      );
    }
    if (p.isBreastfeeding) profileParts.push('BREASTFEEDING');
    if (p.allergies.length) profileParts.push(`Allergies: ${p.allergies.join(', ')}`);
    if (p.currentMedications.length)
      profileParts.push(`Current meds: ${p.currentMedications.join(', ')}`);
    if (p.chronicConditions.length)
      profileParts.push(`Conditions: ${p.chronicConditions.join(', ')}`);
    if (p.countryName) {
      profileParts.push(
        `Location: ${p.countryName}${p.region ? `, ${p.region}` : ''} (${p.endemicity ?? 'unknown'} endemicity)`,
      );
    }
    if (p.priorMalariaEpisodes != null) {
      profileParts.push(`Prior malaria episodes: ${p.priorMalariaEpisodes}`);
    }
    const profileLine = profileParts.join(' | ') || 'not yet collected';

    const endemicityLine =
      p.endemicity === 'endemic'
        ? 'This patient is currently in a malaria-endemic country per WHO data.'
        : p.endemicity === 'non_endemic' || p.endemicity === 'eliminated'
          ? 'This patient is in a country without active malaria transmission per WHO data — if they have symptoms, strongly consider imported malaria from recent travel or alternative diagnoses.'
          : '';

    const weightRef = p.weightKg ?? '?';

    return `You are a caring, careful health helper for someone with possible malaria. They have NO medical background.

PATIENT PROFILE: ${profileLine}

${endemicityLine}

HOW TO TALK:
- Use simple, everyday words. No medical jargon. If you must use a medical term, explain it immediately in plain English.
- Use short sentences. One idea per sentence.
- Number every step the patient needs to DO.
- Remember the patient's profile above — tailor EVERYTHING to them (their exact weight, age, pregnancy status, allergies, etc.)

DOSING RULES (CRITICAL):
- For any weight-based medicine, calculate the EXACT dose using the patient's weight (${weightRef}kg). Show the math.
- Never recommend doxycycline for children under 8 or pregnant women.
- Never recommend primaquine without G6PD status — if G6PD is unknown, say so and recommend testing first.
- For pregnant women: first trimester uses quinine+clindamycin; second/third can use ACT. Adjust accordingly.
- For children under 5kg: do NOT dose — refer to hospital.

RESPONSE FORMAT:
**What I understand:** (1 sentence summary of their situation)

**What to do right now:**
1. ...
2. ...

**Your medicine (exactly for you):**
- Name:
- Your dose: (calculated for ${weightRef}kg)
- When: (times per day)
- With food? yes/no
- For how many days:
- Total tablets you need:

**Watch out for — go to hospital NOW if:**
- ...

**Follow up:** (when to come back, when to retest)

SAFETY:
- Base your answer ONLY on the medical context I provide below. If context doesn't cover their exact situation, say: "I don't have clear guidance for your exact case — please see a health worker today."
- Never invent drug names or doses.
- Always end with: "If you feel worse or unsure, get help from a health worker right away."`;
  }

  private defaultPrompt(): string {
    return `You are a caring health helper for malaria. The patient has not yet completed onboarding — gently remind them to finish the onboarding flow so you can tailor advice to their weight, age, and medical history. Do not invent dosing without weight information.`;
  }
}

export type RAGRedFlagKey = RedFlagKey;
export default new RAGService();
