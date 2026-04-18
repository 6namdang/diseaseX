const API_BASE = 'http://localhost:8000';

export interface TriagePayload {
  age: number;
  weight_kg: number;
  location: string;
  symptoms: Record<string, boolean>;
}

export interface TriageResponse {
  severity: 'RED' | 'YELLOW' | 'GREEN';
  action: string;
  matched_protocol: string;
  clinical_steps: string;
  dosing: string;
  case_id: string;
}

// Offline fallback — runs when no internet
function offlineFallback(payload: TriagePayload): TriageResponse {
  const danger = ['convulsions', 'unconscious', 'unable_to_drink'];
  const dangerCount = danger.filter(s => payload.symptoms[s]).length;

  let severity: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
  if (dangerCount >= 2) severity = 'RED';
  else if (dangerCount === 1) severity = 'YELLOW';

  return {
    severity,
    action: severity === 'RED'
      ? 'EVACUATE IMMEDIATELY'
      : severity === 'YELLOW'
      ? 'CALL SUPERVISOR NOW'
      : 'TREAT AND MONITOR',
    matched_protocol: 'Severe Malaria (offline mode)',
    clinical_steps:   '⚠️ OFFLINE — Connect to internet for full WHO protocol guidance.',
    dosing:           '⚠️ OFFLINE — Dosing unavailable. Call supervisor.',
    case_id:          `OFFLINE-${Date.now()}`,
  };
}

export async function submitTriage(payload: TriagePayload): Promise<TriageResponse> {
  try {
    const res = await fetch(`${API_BASE}/triage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return offlineFallback(payload);
  }
}