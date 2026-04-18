const API_BASE = 'http://localhost:8000';

export interface TriagePayload {
  patient: {
    age: number;
    weight_kg: number;
    location: string;
    high_prevalence_zone: boolean;
  };
  severe_flags: Record<string, boolean>;
  cycles: {
    timestamp: string;
    cold_stage: boolean;
    hot_stage: boolean;
    sweating_stage: boolean;
    temperature?: number;
  }[];
}

export interface TriageResponse {
  severity:           'RED' | 'YELLOW' | 'GREEN';
  action:             string;
  probable_malaria:   boolean;
  reasoning:          string;
  who_guidance:       string;
  next_check_hours:   number;
  case_id:            string;
  referral_required:  boolean;
}

function offlineFallback(payload: TriagePayload): TriageResponse {
  const f = payload.severe_flags;
  const isRed = f.jaundice || f.mental_confusion || f.convulsions || f.unconscious;
  const isYellow = f.unable_to_drink || f.dark_urine;
  const hasCycles = payload.cycles.length >= 2;

  return {
    severity:          isRed ? 'RED' : isYellow ? 'YELLOW' : 'GREEN',
    action:            isRed ? 'REFER TO HOSPITAL IMMEDIATELY' : isYellow ? 'CALL SUPERVISOR' : 'CONTINUE MONITORING',
    probable_malaria:  hasCycles || isRed,
    reasoning:         '⚠️ Offline mode — based on local logic only.',
    who_guidance:      '⚠️ Connect to internet for full WHO CDS guidance.',
    next_check_hours:  isRed ? 0 : 12,
    case_id:           `OFFLINE-${Date.now()}`,
    referral_required: isRed,
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