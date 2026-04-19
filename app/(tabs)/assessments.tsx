import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Banner } from '../../components/ui/Banner';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { fonts, palette, radii, space } from '../../constants/designTokens';
import {
  AssessmentInput,
  RED_FLAG_KEYS,
  computeSeverity,
  getLatestAssessment,
  insertAssessment,
} from '../../db/assessmentRepo';
import type { RedFlagKey, SymptomPhotoTag } from '../../db/types';
import { useContentInsets } from '../../hooks/useContentInsets';
import { usePatient } from '../../hooks/usePatient';
import { T } from '../../i18n/T';
import { useT } from '../../i18n/LanguageContext';
import {
  runEscalation,
  type EscalationOutcome,
} from '../../services/escalationService';

const SYMPTOM_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  fever: 'thermometer',
  chills: 'wind',
  headache: 'zap',
  muscle_pain: 'activity',
  fatigue: 'battery-charging',
  nausea: 'alert-circle',
  diarrhea: 'droplet',
  cough: 'mic-off',
};
const SYMPTOM_KEYS = [
  'fever',
  'chills',
  'headache',
  'muscle_pain',
  'fatigue',
  'nausea',
  'diarrhea',
  'cough',
] as const;

type Photo = { tag: SymptomPhotoTag; uri: string };

type FormState = {
  fever: boolean | null;
  feverTemp: string;
  vomiting: boolean | null;
  canKeepFluidsDown: boolean | null;
  symptomOnsetDays: string;
  selectedSymptoms: Set<string>;
  redFlags: Record<RedFlagKey, boolean>;
  photos: Photo[];
  notes: string;
};

const initialState: FormState = {
  fever: null,
  feverTemp: '',
  vomiting: null,
  canKeepFluidsDown: null,
  symptomOnsetDays: '',
  selectedSymptoms: new Set(),
  redFlags: {
    confused: false,
    seizures: false,
    unable_to_walk: false,
    dark_urine: false,
    yellow_eyes: false,
    persistent_vomiting: false,
  },
  photos: [],
  notes: '',
};

export default function AssessmentsScreen() {
  const insets = useContentInsets();
  const router = useRouter();
  const db = useSQLiteContext();
  const { patient } = usePatient();

  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    severity: number;
    outcome: EscalationOutcome;
    trend: 'better' | 'worse' | 'same' | null;
  } | null>(null);

  const symptomLabels: Record<string, string> = {
    fever: useT('Fever'),
    chills: useT('Chills / shivering'),
    headache: useT('Headache'),
    muscle_pain: useT('Muscle/joint pain'),
    fatigue: useT('Fatigue'),
    nausea: useT('Nausea'),
    diarrhea: useT('Diarrhea'),
    cough: useT('Cough'),
  };
  const redFlagQuestions: Record<RedFlagKey, string> = {
    confused: useT('Feeling confused or unusually drowsy?'),
    seizures: useT('Any seizures?'),
    unable_to_walk: useT('Unable to sit up or walk without help?'),
    dark_urine: useT('Is your urine dark brown or black?'),
    yellow_eyes: useT('Are your eyes or skin yellow?'),
    persistent_vomiting: useT('Vomiting and cannot keep fluids down?'),
  };
  const photoSlotLabels: Record<SymptomPhotoTag, string> = {
    eyes: useT('Eyes (check for yellow)'),
    urine: useT('Urine colour'),
    palm: useT('Palms (pallor check)'),
    skin: useT('Skin / rash'),
    other: useT('Other'),
  };
  const photoSlotTags: SymptomPhotoTag[] = ['eyes', 'urine', 'palm', 'skin'];

  const tFinishOnboardingTitle = useT('Finish onboarding first');
  const tFinishOnboardingMsg = useT(
    'Please complete the welcome steps so the app can tailor dosing and escalations to you.',
  );
  const tFeverTempPlaceholder = useT('e.g. 38.7');
  const tDaysPlaceholder = useT('e.g. 2');
  const tNotesPlaceholder = useT('Anything else the clinician should know?');
  const tCamPermTitle = useT('Camera permission required');
  const tCamPermMsg = useT('Enable camera access in Settings.');
  const tLibPermTitle = useT('Photo library permission required');
  const tPhotoErrTitle = useT('Photo error');
  const tSaveErrTitle = useT('Could not save assessment');
  const tUnknownErr = useT('Unknown error');
  const tYes = useT('Yes');
  const tNo = useT('No');
  const tQFever = useT('Do you have a fever?');
  const tQFeverTemp = useT('Temperature (°C) — if you measured it');
  const tQVomit = useT('Are you vomiting?');
  const tQFluids = useT('Can you keep water down?');
  const tQOnset = useT('How many days ago did symptoms start?');

  if (!patient || !patient.onboardingCompletedAt) {
    return (
      <ScreenBackdrop>
        <View
          style={[
            styles.empty,
            { paddingTop: insets.top + 80, paddingHorizontal: space.padH },
          ]}
        >
          <Banner
            tone="warning"
            title={tFinishOnboardingTitle}
            message={tFinishOnboardingMsg}
          />
        </View>
      </ScreenBackdrop>
    );
  }
  const currentPatient = patient;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSymptom(key: string) {
    setForm((prev) => {
      const next = new Set(prev.selectedSymptoms);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, selectedSymptoms: next };
    });
  }

  function toggleRedFlag(key: RedFlagKey) {
    setForm((prev) => ({
      ...prev,
      redFlags: { ...prev.redFlags, [key]: !prev.redFlags[key] },
    }));
  }

  async function addPhoto(tag: SymptomPhotoTag, source: 'camera' | 'library') {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(tCamPermTitle, tCamPermMsg);
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          quality: 0.6,
          allowsEditing: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(tLibPermTitle);
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.6,
          allowsEditing: false,
        });
      }
      if (res.canceled || !res.assets?.[0]) return;
      const uri = res.assets[0].uri;
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos.filter((p) => p.tag !== tag), { tag, uri }],
      }));
    } catch (e: any) {
      Alert.alert(tPhotoErrTitle, e?.message ?? tUnknownErr);
    }
  }

  function removePhoto(tag: SymptomPhotoTag) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.tag !== tag) }));
  }

  async function submit() {
    if (saving) return;
    try {
      setSaving(true);

      const prev = await getLatestAssessment(db);

      const input: AssessmentInput = {
        fever: form.fever,
        feverTempC: toFloat(form.feverTemp),
        vomiting: form.vomiting,
        canKeepFluidsDown: form.canKeepFluidsDown,
        symptomOnsetDaysAgo: toInt(form.symptomOnsetDays),
        symptoms: Array.from(form.selectedSymptoms),
        redFlags: form.redFlags,
        notes: form.notes.trim() || null,
        photos: form.photos.map((p) => ({ symptomTag: p.tag, fileUri: p.uri })),
      };

      const severity = computeSeverity(input);
      const assessmentId = await insertAssessment(db, input);

      // Reload the fully-persisted assessment for escalation (so id + timestamps match).
      const saved = await getLatestAssessment(db);
      if (!saved || saved.id !== assessmentId) {
        throw new Error('Failed to persist assessment');
      }

      const outcome = await runEscalation(db, currentPatient, saved);

      const trend: 'better' | 'worse' | 'same' | null = prev
        ? severity < prev.severityScore
          ? 'better'
          : severity > prev.severityScore
            ? 'worse'
            : 'same'
        : null;

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(
          outcome.kind === 'sent'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success,
        );
      }

      setResult({ severity, outcome, trend });
      setForm(initialState);
    } catch (e: any) {
      Alert.alert(tSaveErrTitle, e?.message ?? tUnknownErr);
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <ResultScreen
        result={result}
        onDone={() => {
          setResult(null);
          router.replace('/(tabs)');
        }}
        onAnother={() => setResult(null)}
      />
    );
  }

  const canSubmit =
    form.fever !== null && form.vomiting !== null && form.canKeepFluidsDown !== null;

  return (
    <ScreenBackdrop>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 14,
              paddingBottom: insets.bottom + 120,
              paddingHorizontal: space.padH,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerBlock}>
            <Text style={styles.h1}><T>How are you feeling today?</T></Text>
            <Text style={styles.sub}>
              <T>
                Takes about a minute. Be honest — this drives the advice and whether
                your clinician is alerted.
              </T>
            </Text>
          </View>

          <GlassCard>
            <Text style={styles.cardH}><T>Key vitals</T></Text>
            <Question label={tQFever}>
              <YesNo
                value={form.fever}
                onChange={(v) => update('fever', v)}
                yesLabel={tYes}
                noLabel={tNo}
              />
            </Question>
            {form.fever && (
              <Question label={tQFeverTemp}>
                <TextInput
                  value={form.feverTemp}
                  onChangeText={(t) => update('feverTemp', sanitizeDecimal(t))}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder={tFeverTempPlaceholder}
                  placeholderTextColor={palette.textTertiary}
                />
              </Question>
            )}
            <Question label={tQVomit}>
              <YesNo
                value={form.vomiting}
                onChange={(v) => update('vomiting', v)}
                yesLabel={tYes}
                noLabel={tNo}
              />
            </Question>
            <Question label={tQFluids}>
              <YesNo
                value={form.canKeepFluidsDown}
                onChange={(v) => update('canKeepFluidsDown', v)}
                yesLabel={tYes}
                noLabel={tNo}
              />
            </Question>
            <Question label={tQOnset}>
              <TextInput
                value={form.symptomOnsetDays}
                onChangeText={(t) => update('symptomOnsetDays', t.replace(/[^0-9]/g, ''))}
                style={styles.input}
                keyboardType="number-pad"
                placeholder={tDaysPlaceholder}
                placeholderTextColor={palette.textTertiary}
              />
            </Question>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}><T>Symptoms — tap all that apply</T></Text>
            <View style={styles.symptomGrid}>
              {SYMPTOM_KEYS.map((key) => {
                const active = form.selectedSymptoms.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggleSymptom(key)}
                    style={[styles.symptomChip, active && styles.symptomChipActive]}
                  >
                    <Feather
                      name={SYMPTOM_ICONS[key]}
                      size={14}
                      color={active ? palette.white : palette.primary}
                    />
                    <Text
                      style={[
                        styles.symptomChipText,
                        active && styles.symptomChipTextActive,
                      ]}
                    >
                      {symptomLabels[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}><T>Red flags — safety check</T></Text>
            <Text style={styles.sub}>
              <T>Any "Yes" below will immediately push an urgent alert to your clinician.</T>
            </Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {RED_FLAG_KEYS.map((k) => (
                <View key={k} style={styles.rfRow}>
                  <Text style={styles.rfQ}>{redFlagQuestions[k]}</Text>
                  <YesNo
                    value={form.redFlags[k]}
                    onChange={(v) => {
                      if (v === null) return;
                      setForm((prev) => ({
                        ...prev,
                        redFlags: { ...prev.redFlags, [k]: v },
                      }));
                    }}
                    yesLabel={tYes}
                    noLabel={tNo}
                  />
                </View>
              ))}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}><T>Photos (optional)</T></Text>
            <Text style={styles.sub}>
              <T>Photos stay on your device. They are not attached to the push alert (text only).</T>
            </Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {photoSlotTags.map((tag) => {
                const existing = form.photos.find((p) => p.tag === tag);
                return (
                  <View key={tag} style={styles.photoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.photoLabel}>{photoSlotLabels[tag]}</Text>
                      {existing ? (
                        <Image source={{ uri: existing.uri }} style={styles.thumb} />
                      ) : null}
                    </View>
                    <View style={{ gap: 6 }}>
                      <Pressable
                        onPress={() => addPhoto(tag, 'camera')}
                        style={styles.iconBtn}
                      >
                        <Feather name="camera" size={16} color={palette.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => addPhoto(tag, 'library')}
                        style={styles.iconBtn}
                      >
                        <Feather name="image" size={16} color={palette.primary} />
                      </Pressable>
                      {existing ? (
                        <Pressable
                          onPress={() => removePhoto(tag)}
                          style={styles.iconBtn}
                        >
                          <Feather name="trash-2" size={16} color={palette.statusAlert} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}><T>Notes (optional)</T></Text>
            <TextInput
              value={form.notes}
              onChangeText={(t) => update('notes', t)}
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              multiline
              placeholder={tNotesPlaceholder}
              placeholderTextColor={palette.textTertiary}
            />
          </GlassCard>
        </ScrollView>

        <View
          style={[
            styles.submitBar,
            {
              paddingBottom: insets.bottom + 16,
              paddingHorizontal: space.padH,
            },
          ]}
        >
          <Pressable
            onPress={submit}
            disabled={!canSubmit || saving}
            style={({ pressed }) => [
              styles.submitBtn,
              (!canSubmit || saving) && { opacity: 0.4 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <>
                <Text style={styles.submitText}><T>Save assessment</T></Text>
                <Feather name="check-circle" size={18} color={palette.white} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackdrop>
  );
}

function ResultScreen({
  result,
  onDone,
  onAnother,
}: {
  result: { severity: number; outcome: EscalationOutcome; trend: 'better' | 'worse' | 'same' | null };
  onDone: () => void;
  onAnother: () => void;
}) {
  const insets = useContentInsets();
  const { outcome, severity, trend } = result;

  const tAssessmentSaved = useT('Assessment saved');
  const tNoRedFlags = useT('No red flags — no alert was sent.');
  const tNoClinician = useT(
    'Red flags detected but no clinician alert topic is configured. Open Settings → Edit profile to add one.',
  );
  const tClinicianAlerted = useT('Clinician alerted');
  const tAlertSentPrefix = useT('An urgent push was sent to your clinician');
  const tPhotosAttached = useT('photos attached');
  const tPhotoAttached = useT('photo attached');
  const tPhotosFailedSuffix = useT('failed to upload');
  const tAlertFailedTitle = useT('Alert FAILED');
  const tAlertFailedPrefix = useT('Could not reach your clinician');
  const tAlertCallDirectly = useT('Please contact them another way.');
  const tSeverityScore = useT('Severity score:');
  const tImproving = useT('improving');
  const tWorsening = useT('worsening');
  const tUnchanged = useT('unchanged');
  const tBackToDashboard = useT('Back to dashboard');
  const tLogAnother = useT('Log another');

  let tone: 'success' | 'warning' | 'danger' = 'success';
  let title = tAssessmentSaved;
  let message = '';
  switch (outcome.kind) {
    case 'no_red_flags':
      tone = 'success';
      message = tNoRedFlags;
      break;
    case 'no_clinician':
      tone = 'warning';
      message = tNoClinician;
      break;
    case 'sent': {
      tone = 'danger';
      title = tClinicianAlerted;
      const idSuffix = `(ntfy id ${outcome.messageId.slice(0, 10)}…)`;
      const parts: string[] = [`${tAlertSentPrefix} ${idSuffix}.`];
      if (outcome.photosAttached > 0) {
        const word = outcome.photosAttached === 1 ? tPhotoAttached : tPhotosAttached;
        parts.push(`${outcome.photosAttached} ${word}.`);
      }
      if (outcome.photosFailed > 0) {
        parts.push(`${outcome.photosFailed} ${tPhotosFailedSuffix}.`);
      }
      message = parts.join(' ');
      break;
    }
    case 'failed':
      tone = 'danger';
      title = tAlertFailedTitle;
      message = `${tAlertFailedPrefix}: ${outcome.error}. ${tAlertCallDirectly}`;
      break;
  }

  return (
    <ScreenBackdrop>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: space.padH,
          gap: 16,
        }}
      >
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Feather
            name={
              outcome.kind === 'sent' || outcome.kind === 'failed'
                ? 'alert-octagon'
                : outcome.kind === 'no_clinician'
                  ? 'alert-triangle'
                  : 'check-circle'
            }
            size={56}
            color={
              tone === 'danger'
                ? palette.statusAlert
                : tone === 'warning'
                  ? palette.statusMonitor
                  : palette.statusGood
            }
          />
          <Text style={styles.resTitle}>{title}</Text>
          <Text style={styles.resSeverity}>
            {tSeverityScore} <Text style={{ fontFamily: fonts.bold }}>{severity.toFixed(1)}</Text>
            {trend ? (
              <Text
                style={{
                  color:
                    trend === 'better'
                      ? palette.statusGood
                      : trend === 'worse'
                        ? palette.statusAlert
                        : palette.textTertiary,
                  fontFamily: fonts.medium,
                }}
              >
                {' '}
                · {trend === 'better' ? tImproving : trend === 'worse' ? tWorsening : tUnchanged}
              </Text>
            ) : null}
          </Text>
        </View>

        <Banner tone={tone} title={title} message={message} />

        <View style={{ gap: 10 }}>
          <Pressable onPress={onDone} style={styles.submitBtn}>
            <Text style={styles.submitText}>{tBackToDashboard}</Text>
          </Pressable>
          <Pressable
            onPress={onAnother}
            style={[styles.submitBtn, { backgroundColor: 'transparent' }]}
          >
            <Text style={[styles.submitText, { color: palette.primary }]}>
              {tLogAnother}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function Question({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6, marginTop: 12 }}>
      <Text style={styles.qLabel}>{label}</Text>
      {children}
    </View>
  );
}

function YesNo({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.yn, value === true && styles.ynYes]}
      >
        <Text style={[styles.ynText, value === true && styles.ynTextActive]}>{yesLabel}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.yn, value === false && styles.ynNo]}
      >
        <Text style={[styles.ynText, value === false && styles.ynTextActive]}>{noLabel}</Text>
      </Pressable>
    </View>
  );
}

function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toFloat(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function sanitizeDecimal(t: string): string {
  return t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

const styles = StyleSheet.create({
  empty: { gap: 14 },
  content: { gap: 14 },
  headerBlock: { gap: 6, marginBottom: 2 },
  h1: { fontFamily: fonts.bold, fontSize: 22, color: palette.text },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  cardH: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.text,
    marginBottom: 4,
  },
  qLabel: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  input: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: palette.text,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  yn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ynYes: { backgroundColor: palette.statusAlert, borderColor: palette.statusAlert },
  ynNo: { backgroundColor: palette.primary, borderColor: palette.primary },
  ynText: { fontFamily: fonts.medium, fontSize: 14, color: palette.text },
  ynTextActive: { color: palette.white },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  symptomChip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  symptomChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  symptomChipText: { fontFamily: fonts.medium, fontSize: 13, color: palette.text },
  symptomChipTextActive: { color: palette.white },
  rfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rfQ: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: palette.text },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: palette.text,
    marginBottom: 6,
  },
  thumb: {
    width: 120,
    height: 90,
    borderRadius: radii.sm,
    backgroundColor: palette.background,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: 'rgba(10,14,26,0.92)',
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: radii.md,
  },
  submitText: { fontFamily: fonts.semibold, fontSize: 16, color: '#062A1B' },

  resTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: palette.text,
    textAlign: 'center',
  },
  resSeverity: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
  },
});
