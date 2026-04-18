# Backend integration guide

This is a hand-off doc for an agent / engineer working on the **backend** side
of DiseaseX. It enumerates every pluggable surface the frontend currently
satisfies with a local / demo implementation, the **TypeScript contract** each
one must keep, and exactly which file to swap when wiring up a real service.

The frontend is Expo Router + React Native + a local SQLite store (`expo-sqlite`).
**No screen calls the network directly.** All "external" behaviour goes through
one of the small service modules listed below — that is the integration surface.

---

## 1. Architecture at a glance

```
app/(tabs)/*           ← screens (read/write only via the modules below)
  ├─ index.tsx         (Home dashboard)
  ├─ assessments.tsx   (questionnaire + triage submit)
  ├─ smear.tsx         (blood-smear capture + analysis)
  ├─ logs.tsx          (Queue & signals analytics)
  └─ chat.tsx          (Supervisor / AI desk — still mock)

state/PatientContext.tsx   ← active-patient state, wraps db/patients.ts
i18n/                      ← LanguageContext + <T> wrapper + translator service
services/smearAnalyzer.ts  ← on-device CV "model" facade
db/                        ← SQLite layer (single source of truth on device)
  ├─ index.ts        open + migrate + seed
  ├─ schema.ts       SCHEMA_VERSION + migration SQL
  ├─ patients.ts     CRUD
  ├─ assessments.ts  CRUD
  ├─ smears.ts       CRUD
  ├─ tasks.ts        CRUD
  └─ analytics.ts    rollups for the dashboards
data/questionnaire.ts      ← question structure + computeTriage() rules
data/mockClinical.ts       ← only contains welcome marketing + chat placeholder
```

Anything not in `services/`, `i18n/`, or `db/` is presentation. **Backend
work belongs in those three folders.**

---

## 2. The local SQLite store (`db/`)

Database file: `diseasex.db` opened with `SQLite.openDatabaseAsync`. Migrations
are version-stamped in `schema_meta(key='version')`; bump `SCHEMA_VERSION` and
add an entry to `MIGRATIONS` to evolve. Current `SCHEMA_VERSION = 2`.

### Tables

```sql
patients(
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'monitor',  -- 'good'|'monitor'|'alert'
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

assessments(
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  answers TEXT NOT NULL,            -- JSON: { [questionId]: AnswerId }
  triage_level TEXT NOT NULL,       -- 'urgent'|'review'|'possible'|'low'
  triage_score INTEGER NOT NULL,
  triage_reasons TEXT NOT NULL,     -- JSON: string[]
  notes TEXT,
  photo_uri TEXT,                   -- local file:// URI (NOT uploaded yet)
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_assessments_patient ON assessments(patient_id, created_at DESC);

smears(
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  photo_uri TEXT NOT NULL,
  species TEXT NOT NULL,            -- 'none'|'pf'|'pv'|'po'|'pm'|'mixed'
  parasitemia_pct REAL NOT NULL,
  confidence REAL NOT NULL,         -- 0..1
  band TEXT NOT NULL,               -- 'negative'|'low'|'moderate'|'high'
  recommendation TEXT NOT NULL,
  notes TEXT,
  model_id TEXT NOT NULL,           -- e.g. 'malaria-demo-heuristic-v1'
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_smears_patient ON smears(patient_id, created_at DESC);

tasks(
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,  -- nullable
  label TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,  -- 0|1
  created_at INTEGER NOT NULL
);

schema_meta(key TEXT PRIMARY KEY, value INTEGER NOT NULL)
```

> **All `id` columns are strings** generated client-side via `newId(prefix)`
> in `db/index.ts` (format: `${prefix}_${time36}_${rand36}`). They are stable
> primary keys and safe to use as remote ids if you want to upload as-is.

> **All timestamps are `Date.now()` ms (UTC).** Display formatting happens in
> the UI; storage is timezone-agnostic.

> Seeded on first boot only: 3 demo patients (`PT-204`, `PT-198`, `PT-176`)
> and 4 starter tasks. See `seedIfEmpty()` in `db/index.ts` if you want to
> remove this for production.

### Module surfaces (already typed in TS)

```ts
// db/patients.ts
listPatients(): Promise<Patient[]>
getPatient(id): Promise<Patient | null>
addPatient({ caseId, label, status?, notes? }): Promise<Patient>
updatePatient(id, patch): Promise<void>
deletePatient(id): Promise<void>            // cascades to assessments + smears
countPatients(): Promise<number>

// db/assessments.ts
saveAssessment(input): Promise<Assessment>
listAssessments(patientId?): Promise<Assessment[]>
getLatestAssessment(patientId): Promise<Assessment | null>
deleteAssessment(id): Promise<void>

// db/smears.ts
saveSmear(input): Promise<Smear>
listSmears(patientId): Promise<Smear[]>
getLatestSmear(patientId): Promise<Smear | null>
deleteSmear(id): Promise<void>

// db/tasks.ts
listTasks(patientId?): Promise<Task[]>      // patientId=null returns global tasks
addTask(label, patientId?): Promise<Task>
setTaskDone(id, done): Promise<void>
deleteTask(id): Promise<void>

// db/analytics.ts
loadDashboardStats(): Promise<DashboardStats>   // single read pass for logs.tsx
```

Backend work should **wrap, not replace** these modules — keep the local DB as
the source of truth and add background sync. See §6 below.

---

## 3. Pluggable services to swap with real backends

These are the three places where the app currently uses a demo / on-device
implementation. Each one has a stable interface, so a backend dev can swap the
guts of these files without touching any screen.

### 3a. Translation — `i18n/translator.ts`

**Current implementation:** calls the public MyMemory endpoint
(`https://api.mymemory.translated.net/get`) and caches every result in
`AsyncStorage` under `translation_cache_v1`.

**Contract** (only function callers use):

```ts
translate(text: string, target: LanguageCode): Promise<string>
```

- `text` is always source English, never translated input.
- `target` is a code from `i18n/languages.ts` (`'en' | 'fr' | 'sw' | …`). Add
  new ones there to expose them in the language picker.
- Must be **idempotent** and **safe to call concurrently** for the same input.
- Should fall back to returning `text` unchanged on network failure (the UI
  expects no exceptions).

**Backend swap options:**

- Drop-in: replace the fetch URL with your own translation gateway that accepts
  `{ q, source: 'en', target }` and returns a string.
- Pre-translation: build a server-rendered JSON dictionary
  `{ [text]: translated }` per language, ship it with the app, and reduce
  `translate()` to a Map lookup. Cleanest for production; the `<T>` component
  on every screen needs no change.
- Cache key in AsyncStorage is `${target}::${text}` — clear it after deploys
  if the dictionary changes meaningfully.

### 3b. Blood-smear classifier — `services/smearAnalyzer.ts`

**Current implementation:** deterministic local heuristic (FNV-1a hash of
photo URI → Mulberry32 PRNG → species + parasitemia + confidence). Runs
fully offline. `MODEL_ID = 'malaria-demo-heuristic-v1'` is stamped on every
saved row so demo data is distinguishable later.

**Contract** (the only function the page calls):

```ts
analyzeSmear(photoUri: string, opts?: AnalyzeOptions): Promise<SmearAnalysis>

interface SmearAnalysis {
  species: 'none' | 'pf' | 'pv' | 'po' | 'pm' | 'mixed';
  parasitemiaPct: number;     // 0..100
  confidence: number;         // 0..1
  band: 'negative' | 'low' | 'moderate' | 'high';
  recommendation: string;     // human-readable next step (English source; <T> wraps it)
  modelId: string;            // bump when you change the model
  durationMs: number;         // wall clock; UI shows "Inference time"
}
```

The page (`app/(tabs)/smear.tsx`) handles its own loading state, error toast,
and persistence; **all the backend has to do is honour this signature.**

**Backend swap options (in increasing complexity):**

1. **Remote inference endpoint** — change `analyzeSmear` to POST the image
   bytes to your model server and translate the response into `SmearAnalysis`.
   Easy and ships in Expo Go. Caveat: needs network at the point of capture,
   which contradicts the offline-first stance — consider queueing.

2. **Bundled TFLite model** — install `react-native-fast-tflite`, run
   `expo prebuild` to switch to a custom dev client, drop the `.tflite`
   into `assets/models/`, load with `loadTensorflowModel(require(...))`,
   run inference inside `analyzeSmear`. Requires native build pipeline.

3. **ONNX Runtime / MediaPipe** — same shape, different runtime.

In all three cases keep `MODEL_ID` versioned (`malaria-tflite-v1`,
`malaria-cloud-v2`, etc.) so saved rows in `smears.model_id` tell you which
classifier produced them.

### 3c. Chat / supervisor desk — `app/(tabs)/chat.tsx`

**Current implementation:** static arrays in `data/mockClinical.ts`
(`MOCK_CHAT_AI`, `MOCK_CHAT_HUMAN`, `ChatMsg`). No persistence yet.

This is the **least built-out** surface and the cleanest greenfield work. A
sensible approach:

```ts
// db/chat.ts (new)
interface ChatMessage {
  id: string;
  patientId: string | null;        // null = unscoped supervisor channel
  channel: 'ai' | 'human';
  from: 'user' | 'assistant' | 'staff';
  text: string;
  createdAt: number;
  /** Set once a remote backend has acknowledged the message. */
  remoteId?: string | null;
}

listMessages(patientId | null, channel): Promise<ChatMessage[]>
appendMessage(input): Promise<ChatMessage>
```

Add a `chat_messages` table mirroring this shape, then wire the `chat.tsx`
screen to use it. After that, a backend can simply provide:

- `POST /chat/{channel}/messages` → returns `remoteId`
- `GET /chat/{channel}/messages?since=ts` → server-sent updates

…and a small sync loop in `db/chat.ts` ties them together.

---

## 4. Data shapes (the canonical types)

These are exported and stable. If you're designing API payloads, mirror them.

```ts
// state/PatientContext.tsx (re-export from db/patients.ts)
type PatientStatus = 'good' | 'monitor' | 'alert';
interface Patient {
  id: string;
  caseId: string;            // human-facing label, e.g. 'PT-204'
  label: string;             // short clinical description
  status: PatientStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

// data/questionnaire.ts
type AnswerId =
  | 'no' | 'a_little' | 'a_lot' | 'not_sure'
  | 'yes' | 'once_twice' | 'many' | 'cannot_keep';

type Answers = Record<string, AnswerId>;          // keyed by Question.id

type TriageLevel = 'urgent' | 'review' | 'possible' | 'low';

interface TriageResult {
  level: TriageLevel;
  score: number;
  reasons: string[];                              // English source; <T> translates
}

// db/assessments.ts
interface Assessment {
  id: string;
  patientId: string;
  answers: Answers;
  triageLevel: TriageLevel;
  triageScore: number;
  triageReasons: string[];
  notes: string | null;
  photoUri: string | null;                        // device-local, NOT uploaded
  createdAt: number;
}

// db/smears.ts
type SmearSpecies = 'none' | 'pf' | 'pv' | 'po' | 'pm' | 'mixed';
type SmearBand    = 'negative' | 'low' | 'moderate' | 'high';

interface Smear {
  id: string;
  patientId: string;
  photoUri: string;          // device-local
  species: SmearSpecies;
  parasitemiaPct: number;
  confidence: number;        // 0..1
  band: SmearBand;
  recommendation: string;
  notes: string | null;
  modelId: string;
  createdAt: number;
}

// db/tasks.ts
interface Task {
  id: string;
  patientId: string | null;  // null = global / unscoped
  label: string;
  done: boolean;
  createdAt: number;
}

// db/analytics.ts (read-only rollup; computed from the above)
interface DashboardStats {
  totalPatients: number;
  assessments7d: number;
  urgentOrReview7d: number;
  tasksDone: number;
  tasksTotal: number;
  triageMix: { level: TriageLevel; count: number }[];      // latest-per-patient
  dispositionMix: { kind: 'stable'|'observe'|'escalated'; count: number }[];
  perDay: DayBucket[];                                     // last 7 days
  patientLatest: { patient: Patient; assessment: Assessment|null; smear: Smear|null }[];
}
```

`computeTriage(answers)` (in `data/questionnaire.ts`) is deterministic and
self-contained — if you want to compute triage server-side, port that
function or call it on input from the API.

---

## 5. Triage scoring rules (so the backend matches the client)

For full reasoning copy see `data/questionnaire.ts` and `md/Questionaire.md`.
At a glance:

- Each question has a `severityWeight` (0–3) and an optional list of
  `urgentIfAnswers` / `reviewIfAnswers` answer ids that act as hard triggers.
- The questionnaire is grouped into 3 cards: **General symptoms**,
  **Warning signs (danger)**, **Exposure information**.
- `computeTriage(answers)` returns:
  - `'urgent'` if any `urgentIfAnswers` matched, OR score ≥ 7
  - `'review'` if any `reviewIfAnswers` matched, OR score ≥ 4
  - `'possible'` if at least one supporting symptom in Section A is positive
    AND fever (`fever_observed`) is `'a_little'` or `'a_lot'`
  - `'low'` otherwise

> Removed in the latest pass: `severe_vomiting` (Section B) — it was
> redundant with Section A's `vomiting_observed` whose `'cannot_keep'` answer
> already triggers urgent. Don't reintroduce it without aligning both sides.

---

## 6. Recommended sync strategy

The frontend is **offline-first**: every screen reads/writes the local DB.
A backend should sit beside, not in front of, that DB.

Suggested pattern (not yet implemented):

1. Add a nullable `remote_id TEXT` column and a `synced_at INTEGER` column to
   each table that needs to round-trip (`patients`, `assessments`, `smears`,
   `tasks`, `chat_messages`). Bump `SCHEMA_VERSION` to 3 and add a migration.
2. Add a `services/sync.ts` with a single `pushPending()` / `pullChanges()`
   pair that runs when the app comes online (use `@react-native-community/netinfo`
   or just a periodic check). Resolve conflicts by `updated_at` last-writer-wins
   per row — that's enough for clinical-notes scope.
3. The CRUD modules in `db/` already look up by id; the sync layer can call
   them directly to apply remote changes.

Don't try to make the screens talk to the API — keep them ignorant. Their
contract with the data layer is the modules in §2; that's the only thing they
should know.

---

## 7. What still has no real data behind it

| Surface | Status | Ownership |
|---|---|---|
| Patients | ✅ Local SQLite | `db/patients.ts` |
| Assessments | ✅ Local SQLite | `db/assessments.ts` |
| Smears | ✅ Local SQLite + demo classifier | `db/smears.ts` + `services/smearAnalyzer.ts` |
| Tasks | ✅ Local SQLite | `db/tasks.ts` |
| Dashboard analytics | ✅ Derived from above | `db/analytics.ts` |
| Translation | ⚠️ MyMemory public API + cache | `i18n/translator.ts` |
| Smear CV model | ⚠️ Deterministic on-device heuristic | `services/smearAnalyzer.ts` |
| Chat (AI + supervisor) | ❌ Static arrays, no persistence | `app/(tabs)/chat.tsx`, `data/mockClinical.ts` |
| Protocol library | ❌ Alert placeholder | `app/(tabs)/index.tsx` quick action |
| Outbreak / district feed | ❌ Removed from UI | n/a |
| User accounts / auth | ❌ Not built | n/a (`ONBOARDING_KEY` in AsyncStorage is a stand-in) |

The four `❌` rows are open backend work. The two `⚠️` rows have working
demo backends today and clear swap-in paths described above.

---

## 8. Adding a new backend-backed feature — checklist

1. Define the wire types in a new `db/<thing>.ts` mirroring the patterns above
   (raw row interface, snake → camel mapper, typed CRUD).
2. Add the SQL migration to `db/schema.ts` and bump `SCHEMA_VERSION`.
3. If the feature has a remote service, wrap calls in a `services/<thing>.ts`
   so screens never import `fetch` directly.
4. Wire the screen to read/write through (1) and (3) only. Use
   `useFocusEffect(useCallback(() => { void reload() }, [...]))` for re-loads,
   following the pattern in `app/(tabs)/index.tsx` and `logs.tsx`.
5. Wrap every visible English string with `<T>...</T>` (or `useT(...)`) so the
   language picker still works.
6. Run `npx tsc --noEmit` — there is no production build step beyond Expo.

---

## 9. Quick file map for new contributors

```
i18n/translator.ts            ← swap to your translation gateway
services/smearAnalyzer.ts     ← swap to TFLite / ONNX / remote inference
db/schema.ts                  ← add tables here (bump SCHEMA_VERSION)
db/index.ts                   ← seed data + getDb() singleton
db/patients|assessments|smears|tasks.ts   ← typed CRUD per entity
db/analytics.ts               ← single-pass dashboard rollup
data/questionnaire.ts         ← clinical question + triage rules
state/PatientContext.tsx      ← active-patient + add/remove
i18n/LanguageContext.tsx      ← active-language + translate()
i18n/T.tsx                    ← <T>English source</T> wrapper
components/ui/SettingsSheet   ← language + patient management UI
```

Anything else under `app/`, `components/`, `constants/`, `hooks/` is purely
presentation — backend work doesn't need to touch it.
