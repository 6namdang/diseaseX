import React, { createContext, useContext, useState, ReactNode } from 'react';

// One cycle log entry (Cold → Hot → Sweating)
export interface CycleEntry {
  timestamp: string;
  cold_stage: boolean;
  hot_stage: boolean;
  sweating_stage: boolean;
  temperature?: number;
  notes?: string;
}

export interface PatientData {
  id: string;
  age: number;
  weight_kg: number;
  location: string;
  village?: string;
  high_prevalence_zone: boolean;
}

export interface SevereFlags {
  jaundice: boolean;
  dark_urine: boolean;
  mental_confusion: boolean;
  convulsions: boolean;
  unable_to_drink: boolean;
  unconscious: boolean;
}

export interface TriageResult {
  severity: 'RED' | 'YELLOW' | 'GREEN';
  action: string;
  probable_malaria: boolean;
  reasoning: string;
  who_guidance: string;
  next_check_hours: number;
  case_id: string;
  referral_required: boolean;
}

interface AppState {
  patient:     PatientData | null;
  severeFlags: SevereFlags | null;
  cycles:      CycleEntry[];
  result:      TriageResult | null;

  setPatient:     (p: PatientData) => void;
  setSevereFlags: (f: SevereFlags) => void;
  addCycle:       (c: CycleEntry) => void;
  setResult:      (r: TriageResult) => void;
  reset:          () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [patient,     setPatient]     = useState<PatientData | null>(null);
  const [severeFlags, setSevereFlags] = useState<SevereFlags | null>(null);
  const [cycles,      setCycles]      = useState<CycleEntry[]>([]);
  const [result,      setResult]      = useState<TriageResult | null>(null);

  const addCycle = (c: CycleEntry) =>
    setCycles(prev => [...prev, c]);

  const reset = () => {
    setPatient(null);
    setSevereFlags(null);
    setCycles([]);
    setResult(null);
  };

  return (
    <AppContext.Provider value={{
      patient, severeFlags, cycles, result,
      setPatient, setSevereFlags, addCycle, setResult, reset,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}