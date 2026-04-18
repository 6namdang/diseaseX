Caregiver-Observable Malaria Questionnaire Spec
Section A. General symptoms the observer can notice

These are useful for possible malaria screening, but not for emergency triage by themselves. Fever, chills, weakness, vomiting, headache behavior, and poor intake are commonly reported malaria symptoms in public-health guidance.

1. Fever or feeling hot
field_id: fever_observed
question_text: Does the person feel hot or seem to have a fever?
helper_text: You can answer yes even if no temperature was measured.
response_type: single_select
options: No, A little, A lot, Not sure
severity_weight: 1
triage_rule: contributes to “possible malaria” score
2. Chills or shivering
field_id: chills_shivering
question_text: Is the person shivering, shaking, or having chills?
helper_text: This includes feeling cold while also seeming feverish.
response_type: single_select
options: No, A little, A lot, Not sure
severity_weight: 1
3. Looks very weak or exhausted
field_id: weakness_observed
question_text: Does the person look unusually weak, tired, or drained?
helper_text: For example, slower than normal, lying down most of the time, or struggling to do normal activities.
response_type: single_select
options: No, A little, A lot, Not sure
severity_weight: 1
4. Reduced eating or drinking
field_id: poor_intake
question_text: Is the person eating or drinking much less than normal?
helper_text: For babies, this can mean poor breastfeeding or refusing feeds.
response_type: single_select
options: No, A little, A lot, Not sure
severity_weight: 1
5. Vomiting
field_id: vomiting_observed
question_text: Has the person vomited?
helper_text: Focus on how often and whether they can keep liquids down.
response_type: single_select
options: No, Once or twice, Many times, Cannot keep liquids down, Not sure
severity_weight: 1 for mild, 3 for “cannot keep liquids down”
triage_rule: urgent if Cannot keep liquids down
6. Headache behavior
field_id: headache_behavior
question_text: Does the person seem bothered by head pain?
helper_text: Examples: holding their head, saying their head hurts, avoiding light/noise, crying as if in pain.
response_type: single_select
options: No, A little, A lot, Not sure
severity_weight: 1
7. Body pain or aching
field_id: body_aches_observed
question_text: Does the person seem to have body pain, muscle aches, or general discomfort?
helper_text: Examples: aching, soreness, moving stiffly, complaining that the whole body hurts.
response_type: single_select
options: No, A little, A lot, Not sure
severity_weight: 1
Section B. High-priority danger signs an observer can notice

These should be the most important part of the module. The uploaded figure includes prostration, convulsions, coma, respiratory distress, abnormal bleeding, jaundice, anuria, hemoglobinuria, and repeated vomiting as severe features. WHO/CDC severe-malaria guidance also highlights altered consciousness, seizures, breathing difficulty, and inability to drink or function normally.

8. Hard to wake, confused, or not acting normal
field_id: altered_behavior
question_text: Is the person hard to wake, unusually confused, very sleepy, or not acting like themselves?
helper_text: This includes staring, not responding normally, or seeming mentally “out of it.”
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
9. Unconscious or not responding
field_id: unresponsive
question_text: Is the person unconscious or not responding?
helper_text: For example, does not wake up or does not react when spoken to or touched.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: immediate urgent
10. Seizure or shaking episode
field_id: seizure_observed
question_text: Has the person had a seizure or a shaking episode?
helper_text: Examples: jerking movements, stiffening, eyes rolling, loss of awareness.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
11. Trouble breathing
field_id: breathing_difficulty
question_text: Is the person having trouble breathing?
helper_text: Examples: breathing very fast, struggling for air, noisy breathing, chest pulling in, flaring nostrils.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
12. Too weak to sit, stand, walk, drink, or breastfeed
field_id: too_weak_to_function
question_text: Is the person too weak to sit up, stand, walk, drink, or breastfeed?
helper_text: Choose yes if weakness is stopping normal basic activity.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
13. Repeated vomiting or cannot keep fluids down
field_id: severe_vomiting
question_text: Is the person vomiting again and again, or unable to keep liquids down?
helper_text: This is more serious than vomiting once or twice.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
14. Bleeding
field_id: visible_bleeding
question_text: Is there bleeding from the nose, gums, vomit, stool, or from a wound/needle site?
helper_text: Any unusual bleeding should count.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
15. Yellow eyes or yellow skin
field_id: jaundice_observed
question_text: Do the eyes or skin look yellow?
helper_text: Yellowing is a warning sign, especially if the person also looks very sick.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 2
triage_rule: clinician review or urgent if paired with other danger signs
16. Very little or no urine
field_id: little_no_urine
question_text: Has the person passed very little urine or no urine?
helper_text: For example, much less than usual over the day, or no wet diaper for a concerning length of time.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
17. Dark red or cola-colored urine
field_id: dark_red_urine
question_text: Is the urine dark red, brown, or cola-colored?
helper_text: This is more concerning than just concentrated dark yellow urine.
response_type: single_select
options: No, Yes, Not sure
severity_weight: 3
triage_rule: urgent if Yes
Section C. Context questions an observer may know

These help increase suspicion but should not drive urgent triage as strongly as danger signs.

18. Recent travel or stay in malaria-risk area
field_id: malaria_area_exposure
question_text: Has the person recently stayed in or traveled through an area where malaria is common?
response_type: single_select
options: No, Yes, Not sure
severity_weight: 1
19. Recent mosquito exposure
field_id: mosquito_exposure
question_text: Has the person had many recent mosquito bites or slept without mosquito protection?
response_type: single_select
options: No, Yes, Not sure
severity_weight: 1
20. Prior malaria or recent positive test
field_id: recent_malaria_history
question_text: Has the person had malaria before, or had a recent positive malaria test?
response_type: single_select
options: No, Yes, Not sure
severity_weight: 1
Suggested scoring / triage model
1. Possible malaria

Flag possible malaria if:

fever_observed is A little or A lot
and at least one of these is present:
chills_shivering
weakness_observed
vomiting_observed
headache_behavior
poor_intake
body_aches_observed

This keeps the model simple and symptom-based without pretending it is diagnostic.

2. Urgent danger

Flag urgent medical care needed if any of these are Yes:

unresponsive
seizure_observed
breathing_difficulty
too_weak_to_function
severe_vomiting
visible_bleeding
little_no_urine
dark_red_urine

Also treat altered_behavior as urgent. This mirrors the severe-malaria features in your uploaded figure and standard danger-sign logic.

3. Moderate concern

Flag medical review soon if:

jaundice_observed is Yes
or there is fever plus multiple screening symptoms
or the observer answers Yes to several context questions and symptoms are worsening
Suggested UI grouping

For software, this will feel cleaner if the app shows three cards:

Card 1: “What do you notice right now?”
Fever
Chills
Weakness
Vomiting
Head pain behavior
Body aches
Poor intake
Card 2: “Any warning signs?”
Hard to wake / confused
Unresponsive
Seizure
Trouble breathing
Too weak to sit/drink/breastfeed
Repeated vomiting / cannot keep fluids down
Bleeding
Yellow eyes/skin
Very little urine
Dark red urine
Card 3: “Exposure information”
Malaria-risk area
Mosquito exposure
Past malaria / positive test
Example item object
{
  "field_id": "too_weak_to_function",
  "question_text": "Is the person too weak to sit up, stand, walk, drink, or breastfeed?",
  "helper_text": "Choose yes if weakness is stopping normal basic activity.",
  "response_type": "single_select",
  "options": ["No", "Yes", "Not sure"],
  "severity_weight": 3,
  "triage_rule": "urgent_if_yes"
}