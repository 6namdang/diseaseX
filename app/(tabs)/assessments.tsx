import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { SettingsSheet } from '../../components/ui/SettingsSheet';
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import {
  computeTriage,
  QUESTIONNAIRE,
  type AnswerId,
  type Answers,
  type Question,
  type TriageLevel,
} from '../../data/questionnaire';
import { useContentInsets } from '../../hooks/useContentInsets';
import { useT } from '../../i18n/LanguageContext';
import { T } from '../../i18n/T';
import { usePatient } from '../../state/PatientContext';

type Step = 0 | 1 | 2 | 3;

const TRIAGE_META: Record<
  TriageLevel,
  { color: string; label: string; sub: string }
> = {
  urgent: {
    color: palette.statusAlert,
    label: 'Urgent — refer immediately',
    sub: 'One or more danger signs. Start protocol and arrange transport per local SOP.',
  },
  review: {
    color: palette.statusMonitor,
    label: 'Clinician review soon',
    sub: 'Pattern suggests escalation. Re-check vitals and contact supervisor.',
  },
  possible: {
    color: palette.primary,
    label: 'Possible malaria — test & monitor',
    sub: 'Fever with at least one supporting symptom. Consider RDT and continue observation.',
  },
  low: {
    color: palette.statusGood,
    label: 'Low immediate risk',
    sub: 'No danger signs reported. Re-assess if symptoms change.',
  },
};

export default function AssessmentsScreen() {
  const insets = useContentInsets();
  const { active: patient } = usePatient();

  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState<TriageLevel | null>(null);

  const setAnswer = (qid: string, aid: AnswerId) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [qid]: aid }));
  };

  const cards = QUESTIONNAIRE;
  const totalSteps = cards.length + 1;
  const isFinalReviewStep = step === cards.length;
  const currentCard = cards[step];

  const cardComplete = (cardIdx: number): boolean => {
    return cards[cardIdx].questions.every((q) => answers[q.id] != null);
  };

  const triage = useMemo(() => computeTriage(answers), [answers]);

  const submit = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitted(triage.level);
  };

  const reset = () => {
    setAnswers({});
    setPhotoUri(null);
    setNotes('');
    setSubmitted(null);
    setStep(0);
  };

  const goNext = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFinalReviewStep) {
      submit();
      return;
    }
    if (!cardComplete(step)) {
      Alert.alert(
        'Incomplete',
        'Please answer all questions on this card before continuing.',
      );
      return;
    }
    setStep((s) => ((s + 1) as Step));
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((s) => ((s - 1) as Step));
  };

  const pickImage = async () => {
    const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!r.granted) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) setPhotoUri(res.assets[0].uri);
  };

  const pressFx = Platform.OS !== 'web';

  if (submitted) {
    return (
      <TriageResultView
        triage={triage}
        patientLine={`${patient.caseId} · ${patient.label}`}
        onReset={reset}
        insets={insets}
      />
    );
  }

  return (
    <ScreenBackdrop>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerMicro}>
              <T>Assessment for</T>
            </Text>
            <Text style={styles.headerTitle}>
              {patient.caseId} · <T>{patient.label}</T>
            </Text>
          </View>
          <SettingsSheet />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: space.padH,
            paddingBottom: insets.bottom + 140,
            gap: space.gap,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepMeta}>
            <T>Step</T> {step + 1} <T>of</T> {totalSteps}
          </Text>
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressPill, i <= step ? styles.progressOn : styles.progressOff]}
              />
            ))}
          </View>

          {!isFinalReviewStep && currentCard && (
            <GlassCard intensity={36}>
              <Text style={styles.cardTitle}>
                <T>{currentCard.title}</T>
              </Text>
              <Text style={styles.cardSub}>
                <T>{currentCard.description}</T>
              </Text>
              <View style={{ gap: 18, marginTop: 14 }}>
                {currentCard.questions.map((q) => (
                  <QuestionItem
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(aid) => setAnswer(q.id, aid)}
                  />
                ))}
              </View>
            </GlassCard>
          )}

          {isFinalReviewStep && (
            <>
              <GlassCard intensity={36}>
                <Text style={styles.cardTitle}>
                  <T>Photo & notes (optional)</T>
                </Text>
                <Text style={styles.cardSub}>
                  <T>
                    Add a blood-smear or topical-symptom photo and any extra context for the
                    clinician.
                  </T>
                </Text>
                {!photoUri ? (
                  <Pressable onPress={pickImage} style={styles.dashed}>
                    <Feather name="camera" size={26} color={palette.primary} />
                    <Text style={styles.dashedTitle}>
                      <T>Attach photo</T>
                    </Text>
                    <Text style={styles.dashedHint}>
                      <T>Blood smear or visible symptom (mock — no analysis yet).</T>
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.previewImg} />
                    <Pressable
                      onPress={() => setPhotoUri(null)}
                      style={styles.clearPhoto}
                      accessibilityLabel="Remove photo"
                    >
                      <Feather name="x" size={18} color={palette.white} />
                    </Pressable>
                  </View>
                )}
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                  <T>Field notes</T>
                </Text>
                <NotesInput value={notes} onChangeText={setNotes} />
              </GlassCard>

              <GlassCard intensity={34}>
                <Text style={styles.cardTitle}>
                  <T>Review & submit</T>
                </Text>
                <Text style={styles.cardSub}>
                  <T>Confirm answers below. The triage result is computed locally.</T>
                </Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  {cards.map((c, idx) => {
                    const answered = c.questions.filter((q) => answers[q.id] != null).length;
                    const total = c.questions.length;
                    const complete = answered === total;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setStep(idx as Step)}
                        style={({ pressed }) => [
                          styles.reviewRow,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Feather
                          name={complete ? 'check-circle' : 'circle'}
                          size={18}
                          color={complete ? palette.statusGood : palette.textTertiary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewTitle}>
                            <T>{c.title}</T>
                          </Text>
                          <Text style={styles.reviewMeta}>
                            {answered}/{total} <T>answered</T>
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={palette.textTertiary} />
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {step > 0 && (
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                styles.footerBack,
                pressFx && pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="arrow-left" size={20} color={palette.primary} />
              <Text style={styles.footerBackText}>
                <T>Back</T>
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.footerBtn,
              pressFx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.footerBtnText}>
              <T>{isFinalReviewStep ? 'Submit & triage' : 'Continue'}</T>
            </Text>
            <Feather name="arrow-right" size={20} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </ScreenBackdrop>
  );
}

function QuestionItem({
  question,
  value,
  onChange,
}: {
  question: Question;
  value?: AnswerId;
  onChange: (a: AnswerId) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.questionText}>
        <T>{question.text}</T>
      </Text>
      {question.helper && (
        <Text style={styles.helperText}>
          <T>{question.helper}</T>
        </Text>
      )}
      <View style={styles.optionsRow}>
        {question.options.map((opt) => {
          const active = value === opt.id;
          const isUrgent = question.urgentIfAnswers?.includes(opt.id);
          const isReview = question.reviewIfAnswers?.includes(opt.id);
          const tint = isUrgent
            ? palette.statusAlert
            : isReview
              ? palette.statusMonitor
              : palette.primary;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[
                styles.option,
                active && { backgroundColor: `${tint}18`, borderColor: tint },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  active && { color: tint, fontFamily: fonts.semibold },
                ]}
              >
                <T>{opt.label}</T>
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NotesInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (s: string) => void;
}) {
  const placeholder = useT('Transport, allergies, last anti-malarial dose…');
  return (
    <TextInput
      style={styles.notesInput}
      multiline
      placeholder={placeholder}
      placeholderTextColor={palette.textTertiary}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function TriageResultView({
  triage,
  patientLine,
  onReset,
  insets,
}: {
  triage: ReturnType<typeof computeTriage>;
  patientLine: string;
  onReset: () => void;
  insets: { top: number; bottom: number };
}) {
  const meta = TRIAGE_META[triage.level];
  return (
    <ScreenBackdrop>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerMicro}>
              <T>Triage result for</T>
            </Text>
            <Text style={styles.headerTitle}>{patientLine}</Text>
          </View>
          <SettingsSheet />
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.padH,
            paddingBottom: insets.bottom + 140,
            gap: space.gap,
            paddingTop: space.gap,
          }}
        >
          <GlassCard intensity={36} contentStyle={{ backgroundColor: `${meta.color}14` }}>
            <View style={styles.resultHead}>
              <View style={[styles.resultDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.resultLabel, { color: meta.color }]}>
                <T>{meta.label}</T>
              </Text>
            </View>
            <Text style={styles.resultSub}>
              <T>{meta.sub}</T>
            </Text>
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>
                <T>Severity score</T>: {triage.score}
              </Text>
            </View>
          </GlassCard>

          {triage.reasons.length > 0 && (
            <GlassCard intensity={34}>
              <Text style={styles.cardTitle}>
                <T>Why this result</T>
              </Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {triage.reasons.map((r, i) => (
                  <View key={i} style={styles.reasonRow}>
                    <Feather name="alert-circle" size={16} color={meta.color} />
                    <Text style={styles.reasonText}>
                      <T>{r}</T>
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          <GlassCard intensity={32}>
            <Text style={styles.cardTitle}>
              <T>Recommended next steps</T>
            </Text>
            <Text style={styles.cardSub}>
              <T>
                Mock guidance — replace with WHO/IMCI bridge logic. Always defer to local protocol.
              </T>
            </Text>
          </GlassCard>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              styles.footerBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.footerBtnText}>
              <T>Start a new assessment</T>
            </Text>
            <Feather name="refresh-ccw" size={18} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.padH,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerMicro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: palette.secondary,
    marginTop: 2,
  },
  stepMeta: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  progressRow: { flexDirection: 'row', gap: 8 },
  progressPill: { flex: 1, height: 6, borderRadius: 3 },
  progressOn: { backgroundColor: palette.primary },
  progressOff: { backgroundColor: palette.borderLight },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: palette.secondary },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  questionText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.secondary,
    lineHeight: 21,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    lineHeight: 17,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  optionText: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  dashed: {
    height: 180,
    marginTop: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: glass.stroke,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: glass.fill,
    paddingHorizontal: 24,
  },
  dashedTitle: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },
  dashedHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    textAlign: 'center',
  },
  previewWrap: {
    marginTop: 12,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: glass.stroke,
  },
  previewImg: { width: '100%', height: 200, backgroundColor: palette.borderLight },
  clearPhoto: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${palette.secondary}99`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    minHeight: 100,
    marginTop: 6,
    borderWidth: 1,
    borderColor: glass.stroke,
    borderRadius: radii.md,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.text,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  reviewTitle: { fontFamily: fonts.semibold, fontSize: 14, color: palette.secondary },
  reviewMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.padH,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: glass.strokeSoft,
    backgroundColor: 'rgba(248,250,252,0.92)',
    flexDirection: 'row',
    gap: 10,
  },
  footerBack: {
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: glass.stroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: glass.fill,
  },
  footerBackText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.primary },
  footerBtn: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  footerBtnText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultDot: { width: 14, height: 14, borderRadius: 7 },
  resultLabel: { fontFamily: fonts.bold, fontSize: 18 },
  resultSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  scorePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: glass.stroke,
  },
  scoreText: { fontFamily: fonts.semibold, fontSize: 12, color: palette.secondary },
  reasonRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reasonText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
  },
});
