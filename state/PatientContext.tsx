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
import {
  addPatient as dbAddPatient,
  deletePatient as dbDeletePatient,
  listPatients as dbListPatients,
  type Patient,
  type PatientStatus,
} from '../db/patients';

export type { Patient, PatientStatus } from '../db/patients';

const ACTIVE_PATIENT_KEY = 'app.activePatientId';

interface PatientContextValue {
  patients: Patient[];
  active: Patient | null;
  ready: boolean;
  setActive: (id: string) => Promise<void>;
  addPatient: (input: { caseId: string; label: string; status?: PatientStatus }) => Promise<Patient>;
  removePatient: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const list = await dbListPatients();
    setPatients(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await reload();
        const saved = await AsyncStorage.getItem(ACTIVE_PATIENT_KEY);
        if (cancelled) return;
        const fallback = list[0]?.id ?? null;
        const next = saved && list.some((p) => p.id === saved) ? saved : fallback;
        setActiveId(next);
      } catch (e) {
        console.warn('[PatientContext] init failed', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const setActive = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      await AsyncStorage.setItem(ACTIVE_PATIENT_KEY, id);
    } catch {
      // ignore storage failure
    }
  }, []);

  const addPatient = useCallback(
    async (input: { caseId: string; label: string; status?: PatientStatus }) => {
      const created = await dbAddPatient(input);
      const list = await reload();
      // Auto-select the new patient if there was none active
      if (!activeId) {
        await setActive(created.id);
      } else if (!list.some((p) => p.id === activeId)) {
        await setActive(created.id);
      }
      return created;
    },
    [activeId, reload, setActive],
  );

  const removePatient = useCallback(
    async (id: string) => {
      await dbDeletePatient(id);
      const list = await reload();
      if (activeId === id) {
        const next = list[0]?.id ?? null;
        setActiveId(next);
        try {
          if (next) await AsyncStorage.setItem(ACTIVE_PATIENT_KEY, next);
          else await AsyncStorage.removeItem(ACTIVE_PATIENT_KEY);
        } catch {
          // ignore
        }
      }
    },
    [activeId, reload],
  );

  const refresh = useCallback(async () => {
    await reload();
  }, [reload]);

  const active = useMemo(
    () => patients.find((p) => p.id === activeId) ?? null,
    [patients, activeId],
  );

  const value = useMemo(
    () => ({ patients, active, ready, setActive, addPatient, removePatient, refresh }),
    [patients, active, ready, setActive, addPatient, removePatient, refresh],
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be used inside PatientProvider');
  return ctx;
}
