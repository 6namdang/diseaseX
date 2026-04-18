import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hackathon-grade auto translator.
 *
 * Uses MyMemory's free public endpoint (no API key required, ~5k chars/day per
 * IP — plenty for a demo). Each successful translation is persisted in
 * AsyncStorage under the `i18n.cache.` prefix so subsequent app launches and
 * subsequent renders of the same string are instant and offline-safe.
 *
 * NOTE: This is intentionally simple. For production you would:
 *   - Switch to a paid endpoint (Google / DeepL / Azure) for accuracy & SLA
 *   - Pre-translate static strings at build time
 *   - Have a clinician review medical terminology
 */

const STORAGE_PREFIX = 'i18n.cache.';
const MEM_CACHE = new Map<string, string>();
const PENDING = new Map<string, Promise<string>>();

function key(lang: string, text: string) {
  return `${STORAGE_PREFIX}${lang}::${text}`;
}

export async function translate(text: string, target: string): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed || target === 'en') return text;

  const k = key(target, text);
  const cachedMem = MEM_CACHE.get(k);
  if (cachedMem) return cachedMem;

  try {
    const cached = await AsyncStorage.getItem(k);
    if (cached != null) {
      MEM_CACHE.set(k, cached);
      return cached;
    }
  } catch {
    // ignore storage failures and fall through to network
  }

  const inflight = PENDING.get(k);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const url =
        'https://api.mymemory.translated.net/get?q=' +
        encodeURIComponent(text) +
        '&langpair=' +
        encodeURIComponent(`en|${target}`);
      const res = await fetch(url);
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const out = data?.responseData?.translatedText?.trim() || text;
      MEM_CACHE.set(k, out);
      AsyncStorage.setItem(k, out).catch(() => {});
      return out;
    } catch {
      return text;
    } finally {
      PENDING.delete(k);
    }
  })();

  PENDING.set(k, request);
  return request;
}

export async function clearTranslationCache() {
  MEM_CACHE.clear();
  PENDING.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // best-effort
  }
}
