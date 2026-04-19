import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';
import { translate as translateText } from './translator';

const LANG_KEY = 'app.language';

interface LanguageContextValue {
  lang: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  translate: (text: string) => Promise<string>;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (!cancelled && saved) setLang(saved);
      } catch {
        // default stays
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setLang(code);
    try {
      await AsyncStorage.setItem(LANG_KEY, code);
    } catch {
      // ignore — in-memory state still flipped
    }
  }, []);

  const translate = useCallback(
    (text: string) => translateText(text, lang),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLanguage, translate, ready }),
    [lang, setLanguage, translate, ready],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

/**
 * Translate a single English source string. Returns the source immediately
 * (so initial paint is never blank), then swaps in the translated value when
 * it resolves. Subsequent identical strings are cached in-memory and on disk.
 */
export function useT(text: string): string {
  const { lang, translate } = useLanguage();
  const [out, setOut] = useState(text);

  useEffect(() => {
    let cancelled = false;
    if (lang === 'en' || !text) {
      setOut(text);
      return;
    }
    setOut(text);
    translate(text).then((v) => {
      if (!cancelled) setOut(v);
    });
    return () => {
      cancelled = true;
    };
  }, [lang, text, translate]);

  return out;
}
