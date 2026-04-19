# DiseaseX

**An on-device, offline-capable triage companion for children at risk of severe malaria — because in a clinic 700 km from the nearest lab, 48 hours is the difference between a child who grows up and a child who does not.**

---

## The numbers that made us build this

###### **WHO World Malaria Report 2025:**

* **282 million malaria cases** globally in 2024 — up 9 million from 2023
* **610,000 deaths** from malaria in 2024 — up from 598,000 in 2023
* **95%** of all malaria deaths occur in the **WHO African Region**
* **76%** of African malaria deaths are **children under 5 years old**

**Geographic concentration:**

* 11 African countries account for about two-thirds of global cases and deaths
* 5 countries contribute more than half of all global cases: Nigeria, Democratic Republic of the Congo, Ethiopia, Mozambique, Uganda
* Over half of all African deaths occur in just 3 countries: Nigeria (31.9%), DRC (11.7%), Niger (6.1%)
* Malaria case incidence grew from 59 to 64 cases per 1,000 population at risk between 2015–2024

*Source: WHO World Malaria Report 2025 — https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025*
*Source: WHO Malaria Fact Sheet (Dec 2025) — https://www.who.int/news-room/fact-sheets/detail/malaria*

###### **Why speed matters — the clinical urgency case:**

* Untreated *P. falciparum* malaria can progress to severe illness and **death within 24 hours** of symptom onset
* Cerebral malaria, if untreated, kills within 48 hours of first symptoms
* Untreated severe malaria mortality approaches **100%**. With prompt treatment, it drops to **10–20%**

*Source: WHO Malaria Fact Sheet (Dec 2025) — https://www.who.int/news-room/fact-sheets/detail/malaria*
*Source: Medscape Pediatric Malaria (July 2025) — https://emedicine.medscape.com/article/998942-overview*
*Source: NCBI/NIH WHO Severe Malaria Guidelines — https://www.ncbi.nlm.nih.gov/books/NBK294445/*

###### **Who dies and why — the demographic case:**

* Children under 5 account for **76%** of all malaria deaths in the WHO African Region (2024)
* Nigeria alone accounts for **39.3%** of all global malaria deaths in children under 5
* Repeated malaria in childhood causes chronic anemia, malnutrition, and stunted growth — compounding long-term harm beyond the immediate mortality
* Approximately **4.5 million children** aged 6–59 months in DRC faced acute malnutrition in 2024–2025, including 1.4 million cases of severe acute malnutrition — creating the co-morbidity context that made Panzi lethal

*Source: WHO Malaria Fact Sheet (Dec 2025) — https://www.who.int/news-room/fact-sheets/detail/malaria*
*Source: The Lancet Microbe — WHO World Malaria Report Analysis — https://www.thelancet.com/journals/lanmic/article/PIIS2666-5247(25)00001-1/fulltext*
*Source: WHO Disease Outbreak News DON547 — https://www.who.int/emergencies/disease-outbreak-news/item/2024-DON547*

###### **The DRC Panzi outbreak — the story in the data:**

* **9,440 suspected cases** reported between 24 October 2024 and 5 March 2025
* **4,295 cases (45.5%)** in children under 5
* **127 total deaths**, **51.2% (65)** in children under 5

**What it actually was:**

* *Plasmodium falciparum* (severe malaria) detected in **56/108 individuals (51.8%)**
* Influenza A(H1N1)pdm09 co-infection in 16/56 (28.6%)
* SARS-CoV-2 co-infection in 10/56 (17.9%)

**Why diagnosis took so long:**

* Panzi is approximately **700 km** from Kinshasa, the DRC capital
* It took roughly **48 hours** by road just to reach the area from the nearest major city
* Samples had to be transported over **500 km** to reach a functioning laboratory
* Panzi health zone had only **2 doctors** for a population of **~250,000** at outbreak onset

*Source: Nature Medicine (Feb 2026) — Final Panzi investigation — https://www.nature.com/articles/s41591-026-04235-7*
*Source: UNICEF Response to Panzi (Jan 2025) — https://www.unicef.org/drcongo/en/press-releases/after-reports-mystery-illness-dr-congo-unicef-responds-health-needs*
*Source: WHO Disease Outbreak News DON547 — https://www.who.int/emergencies/disease-outbreak-news/item/2024-DON547*
*Source: PubMed Central — Disease X in DRC analysis — https://pmc.ncbi.nlm.nih.gov/articles/PMC12063206/*

###### **Why the system fails today — the diagnostic gap:**

* Community Health Workers (CHWs) are trained in **3–5 day workshops** to diagnose and treat both uncomplicated and severe malaria using WHO-simplified pictorial algorithms
* In parts of rural Zambia, a single CHW can serve **2,500 people** in a 3-kilometer radius
* In a Ugandan cluster-randomized trial, CHWs failed to refer **58.8%** of children in a moderate-to-high transmission setting who met the referral threshold
* **Less than half** of febrile children receive ACT (first-line malaria treatment) within 24 hours of fever onset across sub-Saharan Africa
* In the same Uganda trial, CHWs using RDTs adhered to referral guidelines **50.1%** of the time in high-transmission areas, vs. **18.0%** without RDTs (p = 0.003) — a **2.8× improvement**

**Why RDTs alone are no longer enough:**

* Malaria RDTs work by detecting the HRP2 protein produced by *P. falciparum* parasites
* Parasites with *pfhrp2* and *pfhrp3* gene deletions don't produce HRP2 — they evade detection, producing a **false-negative RDT result** while the patient has active severe malaria
* In Eritrea, **62.0%** of *P. falciparum* parasites now carry *pfhrp2/3* deletions — Eritrea became the first African country to abandon HRP2-based RDTs entirely

*Source: PLOS One — RDT Impact Study Tanzania — https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0019753*
*Source: PMC — CHW Referral Adherence Study Uganda — https://pmc.ncbi.nlm.nih.gov/articles/PMC5121932/*
*Source: NEJM — Artemisinin-Resistant and HRP-Negative Parasites in Africa — https://www.nejm.org/doi/full/10.1056/NEJMp2309142*
*Source: WHO — Bringing Health Care Closer (Tanzania iCCM) — https://www.afro.who.int/photo-story/bringing-health-care-closer-tackling-malaria-and-childhood-illness-tanzania*

---

## Inspiration

In 2024, I volunteered for the WHO. That was the year I first heard the words **"Disease X"** — not as an abstract preparedness scenario, but in the field, in Panzi village, in the Democratic Republic of the Congo.

Panzi is 700 km from Kinshasa. Two doctors, a quarter of a million people. When children started dying, samples had to travel more than 500 km to reach a lab that could even say what was killing them. By the time the tests came back — *P. falciparum*, flu, and COVID, together, in small malnourished bodies — **127 people were already dead. Sixty-five of them were under the age of five.**

I stopped being able to not think about one specific number: **610,000 deaths a year from malaria.** A child dies from this disease roughly every minute, and three out of four of them are under five years old. Not from a rare disease. From one we know how to cure. With a drug — artemisinin — that costs less than a cup of coffee.

What kills them isn't the parasite. It's the **48 hours** between "my child has a fever" and someone with the right information seeing the right signs. It's the CHW who, in a controlled trial, failed to refer 58.8% of the children who should have been referred. It's the RDT that comes back negative because the parasite has mutated away the protein the test looks for. It's the 700 km of road between a mother and a lab.

DiseaseX is my attempt to shrink that gap.

It is a single app, on a single phone, in the pocket of a parent or a CHW, that runs a full diagnostic conversation — in their language, with their child's photos — **entirely on the device, with no connection needed for the hard part.** When the signs turn red, it does exactly one thing over the network, and it does it instantly: it pushes the case, the symptoms, the photos, the timeline, and the GPS location to a clinician who can respond.

Not a dashboard. Not a ticket. Not a report that arrives Monday. A push notification on the clinician's phone, in the next sixty seconds, with everything they need to act.

Because the question that has stayed with me since Panzi is not "can we cure malaria." We can. It's "can a child in a village seven hundred kilometers from a doctor be *seen* in time."

This is my answer.

---

## What it does

DiseaseX is an **offline-first, on-device triage and escalation app** built for the people who are actually on the frontline of pediatric malaria: parents, CHWs, and overstretched clinicians in low-connectivity settings.

**1. Onboarding that understands context, not just contact info.**
Patient profile captures age, weight, pregnancy status, breastfeeding, allergies, chronic conditions, prior malaria episodes, reading level, preferred language, and — critically — **GPS location cross-referenced against the official WHO list of malaria-endemic countries and regions**. The app knows whether the child is standing on endemic soil before the first symptom is logged.

**2. Structured assessments with photos.**
Guided questionnaire covering fever (with temperature), vomiting (with fluid retention), symptom onset, a WHO-aligned symptom checklist, and six hard-coded **red flags** adapted from WHO severe-malaria criteria: confusion, seizures, inability to walk, dark urine, yellow eyes (jaundice), and persistent vomiting with dehydration. Each assessment can carry clinician-grade photographs — eyes, palms, urine, skin — captured in-app and stored locally.

**3. A clinician-tailored AI chat that runs on the phone.**
A local LLM (Qwen3-0.6B, quantized to Q8) loaded via `llama.rn`, paired with a MiniLM embedding model and a RAG pipeline over a vetted malaria knowledge base, answers the caregiver's questions in plain language — **with full context of who the patient is** (age, weight, pregnancy, endemicity, assessment history). No data leaves the phone. No API key. No internet. The doctor in your pocket does not need a signal to talk to you.

**4. Blood-smear analysis.**
Optional microscope-photo analysis for settings where a smear is available but a microscopist is not, combining MobileNetV2 for on-device inference with an optional Claude Vision verification path when connectivity permits. Returns species identification, parasitemia band, and a plain-language recommendation.

**5. The only part that needs the network: the clinician alert.**
When a red flag fires, DiseaseX immediately pushes a full, human-readable case summary to the clinician's phone over **ntfy.sh** — a free, open, no-account push service. The alert contains:

* Timestamp (date + time, local)
* Patient identity: name, age, sex, weight, pregnancy/breastfeeding status, allergies, chronic conditions, medications, prior episodes
* Location, including whether the region is WHO-classified endemic
* The red flags that fired, listed explicitly
* Severity score, with **trend vs. the previous assessment** ("WORSENING from 28.0 to 42.0")
* Fever temperature, vomiting + fluid retention, symptom onset in days
* All patient-reported symptoms
* Free-text caregiver notes
* Every attached photograph, uploaded as an inline ntfy attachment the clinician can view without leaving the notification
* Patient callback phone

**There is no cooldown.** Every red-flag assessment pushes immediately. If the parasite is moving in 24 hours, the clinician cannot afford to be told about it 6 hours late.

**6. A full, persistent, local record.**
Every assessment, photo, chat message, smear result, and escalation lives in **SQLite on the device**. Clinicians can open the history tab and scroll through the entire timeline — no cloud, no account, no lock-in.

---

## How we built it

**Frontend / runtime**
- **Expo SDK 54** + **React Native 0.81** + **React 19.1**
- **Expo Router 6** for file-based routing with a typed tab layout
- Custom design system in `constants/designTokens.ts` (palette, spacing, radii, type scale) with glass-morphism UI components (`GlassCard`, `ScreenBackdrop`, `Banner`)
- Haptics on state transitions for low-literacy UX feedback

**On-device intelligence**
- **`llama.rn` 0.12** running **Qwen3-0.6B-Q8_0.gguf** for conversational AI — no external API, no data leaves the phone
- **`all-MiniLM-L6-v2.Q8_0.gguf`** for embeddings, backing a custom RAG service that retrieves from a local malaria knowledge corpus
- **MobileNetV2** (TFLite) for blood-smear parasitemia classification
- Conditional `require()` shim so the same codebase runs in Expo Go (stubbed LLM) and in a dev client (full LLM) — critical for demoing from a phone without a Mac

**Storage**
- **`expo-sqlite`** (SDK 54 async API) for every piece of patient data. Custom schema-versioned migration system, currently at v3. Domain types in `db/types.ts`; CRUD repos under `db/*Repo.ts`
- Photos stored as local `file://` URIs and referenced by `assessment_photo` rows
- `AsyncStorage` only for UI state (language preference, translation cache)

**Geolocation + endemicity**
- `expo-location` for a one-shot onboarding GPS read
- Static, bundled WHO-derived endemicity lookup in `data/whoMalariaEndemic.ts` so the check works offline
- Stored on the patient profile so every subsequent alert carries it

**Internationalization**
- Custom `LanguageProvider` with a `<T>` component and `useT` hook
- MyMemory translation API for dynamic strings, cached in AsyncStorage so changed languages persist offline
- Side-effect-free re-renders across every screen on language change

**Escalation**
- **`ntfy.sh`** over plain HTTPS. No SDK, no account, no trial restrictions
- Text alert sent first, photos uploaded sequentially as ntfy binary attachments with the `PUT /<topic>` endpoint and a `Filename` header so they appear inline in the clinician's ntfy app
- Alert content composed by `services/escalationService.ts` pulling patient + latest-two-assessments + photos in a single pass

**Engineering discipline**
- Strict TypeScript end to end, `tsc --noEmit` clean
- Tagged-union outcomes (`EscalationOutcome`, `NtfySendResult`) instead of thrown exceptions so every failure is typed, persisted, and surfaced to the user rather than swallowed
- Every network boundary returns `{ kind: 'sent' | 'failed' }`, never throws — because in the field, an uncaught exception is a silent death

---

## Challenges we ran into

**1. Twilio broke our hearts.**
Our first escalation path used Twilio SMS. In theory, bulletproof. In practice: trial numbers limited to verified recipients, toll-free numbers requiring weeks of verification for a demo, "From number is not a Twilio phone number" errors that sent us through five layers of dashboard. For an app whose entire value proposition is "works in a DRC village," a vendor that needs a US business entity to send a text message was the wrong primitive. **We rebuilt the entire escalation layer on ntfy.sh in a day.** No account, no SDK, topic-as-shared-secret — the clinician installs one free app, subscribes to a URL the patient's phone generates during onboarding, and that is the whole setup.

**2. Running a 600-million-parameter LLM on a phone.**
Getting `llama.rn` to load a quantized Qwen model inside Expo Go was not possible — the native module needs a custom dev client. We solved it by writing a `ChatStub` / `ChatFull` split with a conditional `require()` that lets the app boot and demo everywhere, and graduates to the real LLM in a dev build. This let us iterate at the speed of JavaScript without sacrificing the on-device promise.

**3. The ntfy 404 trap.**
ntfy's first-time UX has a sharp edge: if you paste the *full URL* into the app's "Topic" field, it 404s. A single clinician losing a push because of a copy-paste is unacceptable. We redesigned onboarding Step 4 to split the display into **"Topic (paste this into the ntfy app)"** and **"Full URL (for browser only)"** with numbered instructions explicitly warning not to paste the URL into the topic field. A tiny UI fix. A life-or-death one, in the limit.

**4. Offline everywhere, except where it must go out.**
SQLite-first architecture is easy in theory, hard the moment a schema changes. We wrote a versioned migration system (`db/schema.ts` at v3) so existing users never lose data — including legacy Twilio escalation rows, which we deliberately preserve in the `EscalationStatus` union so old history still renders correctly.

**5. Geolocation on iOS without crashing.**
`expo-location` requires Info.plist usage descriptions that Expo Go does not ship by default. We traced the native crash, patched the app config, and made the location-denied flow a required onboarding gate — because an assessment without an endemicity signal loses a material chunk of its diagnostic value.

---

## Accomplishments that we're proud of

- **Everything works offline except the outbound alert.** The full patient journey — onboarding, assessment, photos, AI chat, smear analysis, history — runs with airplane mode on. The only moment that needs a signal is the second the clinician needs to see the alert.
- **A 600M-parameter LLM that runs on a mid-range phone** and is *aware of the patient* in front of it: their age, their weight, whether they are pregnant, where they are, what they answered yesterday.
- **Alerts that are actually actionable.** The clinician does not get "patient X has red flags." They get: "Sat Apr 18, 14:32 — Amina, 6y, female, 12kg — 2 red flags (confusion, dark urine) — severity 42.0, **WORSENING from 28.0** — fever 39.2 °C, vomiting (can't keep fluids) — 3 photos attached — callback +254…". Everything they need to decide, on the lock screen.
- **Zero accounts, zero cloud, zero vendor lock-in** on the critical path. The clinician installs a free open-source app and subscribes to a URL. That is the entire backend.
- **End-to-end typed.** Every failure mode is a typed outcome, not a thrown exception. Nothing fails silently.

---

## What we learned

- **The bottleneck in global health is not the drug. It's the last 48 hours of information flow.** Artemisinin is cheap. A phone in a pocket that sees a child going red and tells the right person in the next sixty seconds is what's missing.
- **"Works offline" is not a feature — it is the only feature that matters** in the settings where malaria actually kills. Cloud-first architectures have invisible biases baked into them; we felt those biases every time we tried to add one.
- **Pick primitives that survive the real world.** An SMS vendor with a verification queue, a backend that needs a registration step, an AI that needs an API key — each one is a dependency that goes to zero in a village with no signal and no bank account. ntfy, SQLite, a quantized local model: these survive.
- **UX choices are clinical choices.** Splitting "topic" from "full URL" on one onboarding screen is not polish — it is the difference between a clinician who gets a push and one who does not.
- **Numbers over 600,000 stop being numbers.** The thing that kept us shipping was not the aggregate — it was Panzi. One village. 127 dead. 65 children. A lab 500 km away. This app is named for the thing that killed them.

---

## What's next for DiseaseX

- **True store-and-forward for zero-signal settings.** Today, an alert that fires with the phone in airplane mode is persisted as `failed`. Next: a `pending_escalation` queue that drains automatically when `NetInfo` reports connectivity, with an optional `expo-background-fetch` retry loop and an SMS fallback via `Linking.openURL('sms:…')` for phones with voice signal but no data.
- **Field deployment with a WHO partner and a clinic in a malaria-endemic region.** We want the first real-world push alert. Then the next thousand.
- **Expanded red-flag library.** Severe anemia, respiratory distress, hypoglycemia — WHO severe-malaria criteria beyond the initial six. Model-based triage score that weighs age-adjusted thresholds (a child under 5 with a 39 °C fever is not the same patient as a teenager with one).
- **pfhrp2/3-deletion aware guidance.** Geographic awareness of regions where HRP2-based RDTs are failing, and proactive escalation advice when an RDT-negative case still carries multiple red flags.
- **Clinician-side dashboard** (opt-in, end-to-end encrypted) so clinics can see their whole queue, not just individual pushes.
- **Multi-patient mode** for CHWs managing 2,500 people in a 3-kilometer radius.
- **Community health worker training overlay** — the app as a coach that teaches the CHW *why* it is escalating, closing the 2.8× adherence gap the Uganda RCT found with RDTs.
- **Beyond malaria.** The architecture — on-device AI, offline-first SQLite, push-based clinician escalation — generalizes. Pneumonia. Cholera. The next Disease X, whatever it turns out to be.

Panzi won't be the last outbreak. But we think it can be the last one where a child dies because no one with the right eyes saw the right symptoms in time.
