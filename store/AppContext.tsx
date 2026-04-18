import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface PatientData {
  age: number;
  weight_kg: number;
  location: string;
  symptoms: Record<string, boolean>;
}

export interface TriageResult {
  severity: 'RED' | 'YELLOW' | 'GREEN';
  action: string;
  matched_protocol: string;
  clinical_steps: string;
  dosing: string;
  case_id: string;
}

interface AppState {
  patient: PatientData | null;
  result: TriageResult | null;
  setPatient: (p: PatientData) => void;
  setResult: (r: TriageResult) => void;
  reset: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [result, setResult]   = useState<TriageResult | null>(null);

  const reset = () => {
    setPatient(null);
    setResult(null);
  };

  return (
    <AppContext.Provider value={{ patient, result, setPatient, setResult, reset }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}