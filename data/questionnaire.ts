/**
 * Caregiver-observable malaria questionnaire — distilled from
 * `md/Questionaire.md`. Each card is a step in the assessment flow.
 *
 * All `text`/`helper`/`option.label` strings are English source — the UI wraps
 * them with `<T>` so they auto-translate to the active language.
 */

export type AnswerId =
  | 'no'
  | 'a_little'
  | 'a_lot'
  | 'not_sure'
  | 'yes'
  | 'once_twice'
  | 'many'
  | 'cannot_keep';

export interface QuestionOption {
  id: AnswerId;
  label: string;
  /** Optional weight override for this specific answer (otherwise uses base weight when "positive"). */
  weight?: number;
}

export interface Question {
  id: string;
  text: string;
  helper?: string;
  options: QuestionOption[];
  /** Base severity weight per the spec. */
  severityWeight: number;
  /** Answers (by id) that should immediately flag urgent. */
  urgentIfAnswers?: AnswerId[];
  /** Answers (by id) that flag a moderate / clinician review. */
  reviewIfAnswers?: AnswerId[];
}

export interface QuestionCard {
  id: 'symptoms' | 'warnings' | 'exposure';
  title: string;
  description: string;
  questions: Question[];
}

const SCALE_FOUR: QuestionOption[] = [
  { id: 'no', label: 'No' },
  { id: 'a_little', label: 'A little' },
  { id: 'a_lot', label: 'A lot' },
  { id: 'not_sure', label: 'Not sure' },
];

const YES_NO_UNSURE: QuestionOption[] = [
  { id: 'no', label: 'No' },
  { id: 'yes', label: 'Yes' },
  { id: 'not_sure', label: 'Not sure' },
];

export const QUESTIONNAIRE: QuestionCard[] = [
  {
    id: 'symptoms',
    title: 'What do you notice right now?',
    description: 'General symptoms an observer can notice.',
    questions: [
      {
        id: 'fever_observed',
        text: 'Does the person feel hot or seem to have a fever?',
        helper: 'You can answer yes even if no temperature was measured.',
        options: SCALE_FOUR,
        severityWeight: 1,
      },
      {
        id: 'chills_shivering',
        text: 'Is the person shivering, shaking, or having chills?',
        helper: 'This includes feeling cold while also seeming feverish.',
        options: SCALE_FOUR,
        severityWeight: 1,
      },
      {
        id: 'weakness_observed',
        text: 'Does the person look unusually weak, tired, or drained?',
        helper: 'For example, slower than normal or lying down most of the time.',
        options: SCALE_FOUR,
        severityWeight: 1,
      },
      {
        id: 'poor_intake',
        text: 'Is the person eating or drinking much less than normal?',
        helper: 'For babies, this can mean poor breastfeeding or refusing feeds.',
        options: SCALE_FOUR,
        severityWeight: 1,
      },
      {
        id: 'vomiting_observed',
        text: 'Has the person vomited?',
        helper: 'Focus on how often and whether they can keep liquids down.',
        options: [
          { id: 'no', label: 'No' },
          { id: 'once_twice', label: 'Once or twice' },
          { id: 'many', label: 'Many times', weight: 2 },
          { id: 'cannot_keep', label: 'Cannot keep liquids down', weight: 3 },
          { id: 'not_sure', label: 'Not sure' },
        ],
        severityWeight: 1,
        urgentIfAnswers: ['cannot_keep'],
      },
      {
        id: 'headache_behavior',
        text: 'Does the person seem bothered by head pain?',
        helper: 'Examples: holding their head, avoiding light/noise, crying as if in pain.',
        options: SCALE_FOUR,
        severityWeight: 1,
      },
      {
        id: 'body_aches_observed',
        text: 'Does the person seem to have body pain or muscle aches?',
        helper: 'Examples: aching, soreness, moving stiffly.',
        options: SCALE_FOUR,
        severityWeight: 1,
      },
    ],
  },
  {
    id: 'warnings',
    title: 'Any warning signs?',
    description: 'Danger signs an observer can notice — these drive urgent triage.',
    questions: [
      {
        id: 'altered_behavior',
        text: 'Is the person hard to wake, unusually confused, or not acting like themselves?',
        helper: 'Includes staring, not responding normally, or seeming mentally out of it.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'unresponsive',
        text: 'Is the person unconscious or not responding?',
        helper: 'For example, does not wake up or react when spoken to or touched.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'seizure_observed',
        text: 'Has the person had a seizure or shaking episode?',
        helper: 'Examples: jerking, stiffening, eyes rolling, loss of awareness.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'breathing_difficulty',
        text: 'Is the person having trouble breathing?',
        helper: 'Examples: very fast breathing, struggling for air, chest pulling in, flaring nostrils.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'too_weak_to_function',
        text: 'Is the person too weak to sit, stand, walk, drink, or breastfeed?',
        helper: 'Choose yes if weakness is stopping normal basic activity.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'severe_vomiting',
        text: 'Is the person vomiting again and again, or unable to keep liquids down?',
        helper: 'This is more serious than vomiting once or twice.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'visible_bleeding',
        text: 'Is there bleeding from nose, gums, vomit, stool, or a wound?',
        helper: 'Any unusual bleeding should count.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'jaundice_observed',
        text: 'Do the eyes or skin look yellow?',
        helper: 'Yellowing is a warning sign, especially with other symptoms.',
        options: YES_NO_UNSURE,
        severityWeight: 2,
        reviewIfAnswers: ['yes'],
      },
      {
        id: 'little_no_urine',
        text: 'Has the person passed very little urine or no urine?',
        helper: 'For example, much less than usual over the day.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
      {
        id: 'dark_red_urine',
        text: 'Is the urine dark red, brown, or cola-colored?',
        helper: 'More concerning than just dark yellow urine.',
        options: YES_NO_UNSURE,
        severityWeight: 3,
        urgentIfAnswers: ['yes'],
      },
    ],
  },
  {
    id: 'exposure',
    title: 'Exposure information',
    description: 'Context that increases suspicion of malaria.',
    questions: [
      {
        id: 'malaria_area_exposure',
        text: 'Has the person recently stayed in or traveled through an area where malaria is common?',
        options: YES_NO_UNSURE,
        severityWeight: 1,
      },
      {
        id: 'mosquito_exposure',
        text: 'Many recent mosquito bites, or sleeping without mosquito protection?',
        options: YES_NO_UNSURE,
        severityWeight: 1,
      },
      {
        id: 'recent_malaria_history',
        text: 'Has the person had malaria before, or had a recent positive test?',
        options: YES_NO_UNSURE,
        severityWeight: 1,
      },
    ],
  },
];

export type Answers = Record<string, AnswerId>;

export type TriageLevel = 'urgent' | 'review' | 'possible' | 'low';

export interface TriageResult {
  level: TriageLevel;
  score: number;
  reasons: string[];
}

const SYMPTOM_FIELDS = [
  'chills_shivering',
  'weakness_observed',
  'vomiting_observed',
  'headache_behavior',
  'poor_intake',
  'body_aches_observed',
];

function isPositive(opt: AnswerId | undefined): boolean {
  return opt === 'a_little' || opt === 'a_lot' || opt === 'yes' ||
    opt === 'once_twice' || opt === 'many' || opt === 'cannot_keep';
}

/**
 * Triage scoring per `md/Questionaire.md`:
 *   - Urgent if any danger-sign answer matches its `urgentIfAnswers`.
 *   - Review if any review trigger is hit, OR fever + ≥2 contributing symptoms.
 *   - Possible malaria if fever is observed + at least one supporting symptom.
 *   - Low otherwise.
 */
export function computeTriage(answers: Answers): TriageResult {
  const reasons: string[] = [];
  let score = 0;

  for (const card of QUESTIONNAIRE) {
    for (const q of card.questions) {
      const a = answers[q.id];
      if (!a || a === 'not_sure' || a === 'no') continue;
      const opt = q.options.find((o) => o.id === a);
      const w = opt?.weight ?? q.severityWeight;
      score += w;
      if (q.urgentIfAnswers?.includes(a)) {
        reasons.push(q.text);
      } else if (q.reviewIfAnswers?.includes(a)) {
        reasons.push(q.text);
      }
    }
  }

  const urgentTriggered = QUESTIONNAIRE.some((c) =>
    c.questions.some(
      (q) => q.urgentIfAnswers && q.urgentIfAnswers.includes(answers[q.id]),
    ),
  );
  if (urgentTriggered) {
    return { level: 'urgent', score, reasons };
  }

  const reviewTriggered = QUESTIONNAIRE.some((c) =>
    c.questions.some(
      (q) => q.reviewIfAnswers && q.reviewIfAnswers.includes(answers[q.id]),
    ),
  );

  const fever = answers['fever_observed'];
  const feverPositive = isPositive(fever);
  const supportingPositive = SYMPTOM_FIELDS.filter((id) => isPositive(answers[id])).length;

  if (feverPositive && supportingPositive >= 2) {
    return {
      level: reviewTriggered ? 'review' : 'review',
      score,
      reasons: [...reasons, 'Fever plus multiple symptoms'],
    };
  }

  if (reviewTriggered) {
    return { level: 'review', score, reasons };
  }

  if (feverPositive && supportingPositive >= 1) {
    return {
      level: 'possible',
      score,
      reasons: [...reasons, 'Fever with at least one supporting symptom'],
    };
  }

  return { level: 'low', score, reasons };
}
