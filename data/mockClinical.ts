/**
 * Central mock dataset for DiseaseX triage & protocol engine (no real logic).
 */

import { palette } from '../constants/designTokens';

export const MOCK_CHW = {
  greetingName: 'Amina',
  postLabel: 'CHW · Kwango East',
};

export const MOCK_WELCOME_FEATURES = [
  {
    icon: 'zap' as const,
    title: 'Rule-out in seconds',
    desc: 'Mock pattern stack for malaria, pneumonia, and cholera signals — offline-first.',
  },
  {
    icon: 'book-open' as const,
    title: 'WHO-aligned protocols',
    desc: 'Step-by-step treatment bridges with dosage placeholders (mock).',
  },
  {
    icon: 'cpu' as const,
    title: 'Observation assist',
    desc: 'Guided capture for breathing effort, turgor, and pallor (mock review).',
  },
  {
    icon: 'radio' as const,
    title: 'Outbreak watch',
    desc: 'Atypical cases surface as GPS-tagged mock alerts to district desks.',
  },
];

export const MOCK_OUTBREAK_ALERTS = [
  {
    id: 'a1',
    band: 'monitor' as const,
    title: 'RDT positivity elevated',
    detail: 'Sector 4 — 7-day rolling +18% vs seasonal baseline (mock).',
    meta: '2h ago',
  },
  {
    id: 'a2',
    band: 'good' as const,
    title: 'Cholera rule-out quiet',
    detail: 'Dehydration syndromic score below outbreak threshold (mock).',
    meta: 'Yesterday',
  },
];

export const MOCK_DASHBOARD_TASKS = [
  { id: 't1', label: 'RDT follow-up — PT-204 (under-5)', done: true },
  { id: 't2', label: 'Log first-dose artesunate time — PT-198', done: false },
  { id: 't3', label: 'Referral transport arranged — PT-176', done: false },
  { id: 't4', label: 'Sync observation clip to supervisor queue', done: false },
];

export const MOCK_AI_BRIEFING =
  'Mock briefing: two active cases lean severe malaria on fever + pallor + fast breathing. ' +
  'Confirm SpO₂ if available; keep IV/IM artesunate checklist ready before travel.';

export const MOCK_RULE_OUT_CARD = {
  primary: { name: 'Severe malaria', pct: 87 },
  secondary: { name: 'Pneumonia', pct: 12 },
  reasoning: 'Mock match: fever + anemia signs + respiratory distress in under-five.',
  immediateAction: 'Start IV/IM artesunate per WHO severe malaria protocol (mock step 3).',
  referralNote: 'If no improvement in 12h, escalate to Level 2 facility (mock).',
};

export const MOCK_OBSERVATION_STEP = {
  dashedTitle: 'Guided observation',
  dashedHint: 'Film chest 10s — mock RR / indrawing assist (no analysis yet).',
};

export const MOCK_CLINICAL_ANALYSIS = {
  badgeLabel: 'Severe malaria pattern (mock)',
  badgeColor: palette.statusAlert,
  patternBarLabel: 'Pattern confidence (mock)',
  patternBarPct: 76,
  barColor: palette.statusMonitor,
  metrics: [
    { label: 'Hematologic stress', pct: 68, color: palette.statusAlert },
    { label: 'Respiratory effort', pct: 54, color: palette.statusMonitor },
    { label: 'Perfusion / alertness', pct: 41, color: palette.statusGood },
  ],
  description:
    'Child with fever 3d, palmar pallor, RR elevated vs age band; no focal lung signs on still frame (mock).',
  comparison: 'Compared to prior mock log: pallor slightly worse; RR unchanged.',
};

export const MOCK_STEP2 = {
  title: 'Syndromic checklist',
  feverLabel: 'Fever days (0–7)',
  obsLabel: 'Red flags (mock)',
  obsChips: ['Fast breathing', 'Poor feeding', 'Convulsions (history)'],
  intakeLabel: 'Unable to drink / breastfeed today?',
};

export const MOCK_STEP3 = {
  title: 'Supplies & readiness',
  q1: 'Injectable artesunate vials on hand? (mock)',
  q2: 'RDT stock for household contacts? (mock)',
};

export const MOCK_STEP4 = {
  title: 'Field notes',
  placeholder: 'Transport, allergies, last anti-malarial dose… (mock)',
};

export const MOCK_DOSAGE_PREVIEW = {
  weightKg: 11.5,
  route: 'IM artesunate (mock)',
  doseMg: '2.3 mg/kg → 26.5 mg total (mock math)',
};

export const MOCK_REGION_STATS = [
  { icon: 'thermometer' as const, value: '38.1°', label: 'Mean fever (7d)', color: palette.statusAlert },
  { icon: 'wind' as const, value: '44', label: 'Fast breath / wk', color: palette.statusMonitor },
  { icon: 'droplet' as const, value: '12%', label: 'Dehydration flag', color: palette.primary },
  { icon: 'users' as const, value: '23', label: 'Assessments (wk)', color: palette.statusGood },
];

export const MOCK_DONUT_TRILE = [
  { percent: 74, color: palette.statusGood, label: 'Malaria fit' },
  { percent: 19, color: palette.statusMonitor, label: 'Pneumonia fit' },
  { percent: 7, color: palette.inflammation, label: 'Cholera fit' },
];

export const MOCK_WEEKLY_BARS = [
  { label: 'Protocol adherence', pct: 86, color: palette.statusGood },
  { label: 'First-dose <1h', pct: 72, color: palette.primary },
  { label: 'Referral completed', pct: 64, color: palette.primaryLight },
];

export const MOCK_SYNDROMIC_TREND = [
  { id: 'm1', d: 'M', trend: 'monitor' as const, y: 0.62 },
  { id: 't2', d: 'T', trend: 'good' as const, y: 0.55 },
  { id: 'w3', d: 'W', trend: 'good' as const, y: 0.48 },
  { id: 't4', d: 'T', trend: 'alert' as const, y: 0.78 },
  { id: 'f5', d: 'F', trend: 'monitor' as const, y: 0.65 },
  { id: 's6', d: 'S', trend: 'good' as const, y: 0.42 },
  { id: 's7', d: 'Su', trend: 'good' as const, y: 0.38 },
];

export const MOCK_QUEUE_VOLUME = [
  { id: 'v1', day: 'M', level: 4 },
  { id: 'v2', day: 'Tu', level: 6 },
  { id: 'v3', day: 'W', level: 5 },
  { id: 'v4', day: 'Th', level: 7 },
  { id: 'v5', day: 'F', level: 3 },
  { id: 'v6', day: 'Sa', level: 4 },
  { id: 'v7', day: 'Su', level: 2 },
];

export const MOCK_OUTLOOK_DONUTS = [
  { percent: 58, color: palette.statusGood, label: 'Resolved / stable' },
  { percent: 31, color: palette.statusMonitor, label: 'Under observation' },
  { percent: 11, color: palette.statusAlert, label: 'Escalated' },
];

export type CaseTrend = 'good' | 'monitor' | 'alert';

export const MOCK_CASE_TIMELINE = [
  {
    id: 'c1',
    status: 'monitor' as CaseTrend,
    caseId: 'PT-204',
    label: 'Severe malaria — suspected',
    metricA: { label: 'SpO₂ est.', pct: 0.62 },
    metricB: { label: 'Temp trend', pct: 0.71 },
    desc: 'Pallor ++, responsive to voice; mother reports convulsion yesterday (mock).',
    compare: 'Vs. 24h mock log: RR down 6 breaths/min after positioning.',
  },
  {
    id: 'c2',
    status: 'good' as CaseTrend,
    caseId: 'PT-198',
    label: 'Uncomplicated malaria (mock)',
    metricA: { label: 'Hydration', pct: 0.78 },
    metricB: { label: 'Activity', pct: 0.65 },
    desc: 'RDT+; able to drink; no respiratory distress (mock).',
    compare: 'First dose ACT logged — mock timestamp 08:14.',
  },
  {
    id: 'c3',
    status: 'alert' as CaseTrend,
    caseId: 'PT-176',
    label: 'Atypical — outbreak flag (mock)',
    metricA: { label: 'Syndromic spread', pct: 0.88 },
    metricB: { label: 'Confidence gap', pct: 0.22 },
    desc: 'Severe presentation with low fit to local profile — mock district ping sent.',
    compare: 'GPS tag: 2.4 km NE of clinic anchor (mock).',
  },
];

export type ChatMsg = { id: string; from: 'user' | 'assistant' | 'staff'; text: string; time: string };

export const MOCK_CHAT_AI: ChatMsg[] = [
  {
    id: '1',
    from: 'assistant',
    text: 'Mock: child 3y, weight 11.5 kg, fever 3d + fast breathing. Suggest severe malaria protocol checklist while awaiting RDT.',
    time: '07:12',
  },
  {
    id: '2',
    from: 'user',
    text: 'RDT positive, we have artesunate ampoules. What IM volume mock?',
    time: '07:14',
  },
  {
    id: '3',
    from: 'assistant',
    text: 'Mock reply: use dosage calculator tab in Protocols (coming) — placeholder 2.3 mg/kg IM now, repeat per national chart.',
    time: '07:15',
  },
];

export const MOCK_CHAT_HUMAN: ChatMsg[] = [
  {
    id: 'h1',
    from: 'staff',
    text: 'Supervisor desk: saw your atypical flag PT-176. Keep patient NPO for surgery consult only if abdomen rigid — mock script.',
    time: '06:50',
  },
  { id: 'h2', from: 'user', text: 'Copy — abdomen soft, focusing on antimalarial + fluids.', time: '06:52' },
];
