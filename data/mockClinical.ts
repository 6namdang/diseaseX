/**
 * Remaining static UI copy:
 *  - welcome screen marketing cards
 *  - chat thread placeholders (until the supervisor / AI desk has a real backend)
 *
 * Patients, assessments, tasks, and dashboard rollups all live in SQLite
 * under `db/`. Add new live data sources there, not here.
 */

export const MOCK_WELCOME_FEATURES = [
  {
    icon: 'zap' as const,
    title: 'Rule-out in seconds',
    desc: 'Pattern stack for malaria, pneumonia, and cholera signals — offline-first.',
  },
  {
    icon: 'book-open' as const,
    title: 'WHO-aligned protocols',
    desc: 'Step-by-step treatment bridges with dosage placeholders.',
  },
  {
    icon: 'cpu' as const,
    title: 'Observation assist',
    desc: 'Guided capture for breathing effort, turgor, and pallor.',
  },
  {
    icon: 'radio' as const,
    title: 'Outbreak watch',
    desc: 'Atypical cases surface as GPS-tagged alerts to district desks.',
  },
];

export type ChatMsg = {
  id: string;
  from: 'user' | 'assistant' | 'staff';
  text: string;
  time: string;
};

export const MOCK_CHAT_AI: ChatMsg[] = [
  {
    id: '1',
    from: 'assistant',
    text: 'Child 3y, weight 11.5 kg, fever 3d + fast breathing. Suggest severe malaria protocol checklist while awaiting RDT.',
    time: '07:12',
  },
  {
    id: '2',
    from: 'user',
    text: 'RDT positive, we have artesunate ampoules. What IM volume?',
    time: '07:14',
  },
  {
    id: '3',
    from: 'assistant',
    text: 'Use dosage calculator in Protocols — 2.3 mg/kg IM now, repeat per national chart.',
    time: '07:15',
  },
];

export const MOCK_CHAT_HUMAN: ChatMsg[] = [
  {
    id: 'h1',
    from: 'staff',
    text: 'Supervisor desk: saw your atypical flag PT-176. Keep patient NPO for surgery consult only if abdomen rigid.',
    time: '06:50',
  },
  {
    id: 'h2',
    from: 'user',
    text: 'Copy — abdomen soft, focusing on antimalarial + fluids.',
    time: '06:52',
  },
];
