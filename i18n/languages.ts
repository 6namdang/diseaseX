/**
 * Curated language list. English-source strings are translated on the fly via
 * `translator.ts` using MyMemory's free public API and cached locally so each
 * unique string only hits the network once per language.
 *
 * Codes follow ISO 639-1 / 2-letter where MyMemory accepts them.
 */
export type LanguageCode = string;

export interface Language {
  code: LanguageCode;
  name: string;
  native: string;
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', native: 'Igbo' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
  { code: 'so', name: 'Somali', native: 'Soomaali' },
  { code: 'rw', name: 'Kinyarwanda', native: 'Kinyarwanda' },
  { code: 'mg', name: 'Malagasy', native: 'Malagasy' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function findLanguage(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
