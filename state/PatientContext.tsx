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
import { MOCK_CASE_TIMELINE, type CaseTrend } from '../data/mockClinical';

const PATIENT_KEY = 'app.activePatientId';

export interface Patient {
  id: string;
  caseId: string;
  label: string;
  status: CaseTrend;
  desc: string;
}

const PATIENTS: Patient[] = MOCK_CASE_TIMELINE.map((c) => ({
  id: c.id,
  caseId: c.caseId,
  label: c.label,
  status: c.status,
  desc: c.desc,
}));

interface PatientContextValue {
  patients: Patient[];
  active: Patient;
  setActive: (id: string) => Promise<void>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string>(PATIENTS[0]?.id ?? 'c1');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PATIENT_KEY);
        if (!cancelled && saved && PATIENTS.some((p) => p.id === saved)) {
          setActiveId(saved);
        }
      } catch {
        // fall through to default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActive = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      await AsyncStorage.setItem(PATIENT_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const active = useMemo(
    () => PATIENTS.find((p) => p.id === activeId) ?? PATIENTS[0],
    [activeId],
  );

  const value = useMemo(
    () => ({ patients: PATIENTS, active, setActive }),
    [active, setActive],
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used inside PatientProvider');
  return ctx;
}
