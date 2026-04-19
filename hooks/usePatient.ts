import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { getPatient } from '../db/patientRepo';
import type { Patient } from '../db/types';

/**
 * Reactive subscription to the single-patient row. Re-read is manual via
 * the returned `refresh` fn — screens call it on focus or after mutations.
 */
export function usePatient() {
  const db = useSQLiteContext();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getPatient(db);
    setPatient(next);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { patient, loading, refresh };
}
