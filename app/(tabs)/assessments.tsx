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
import {
  runEscalation,
  type EscalationOutcome,
} from '../../services/escalationService';

const SYMPTOM_OPTIONS: { key: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'fever', label: 'Fever', icon: 'thermometer' },
  { key: 'chills', label: 'Chills / shivering', icon: 'wind' },
  { key: 'headache', label: 'Headache', icon: 'zap' },
  { key: 'muscle_pain', label: 'Muscle/joint pain', icon: 'activity' },
  { key: 'fatigue', label: 'Fatigue', icon: 'battery-charging' },
  { key: 'nausea', label: 'Nausea', icon: 'alert-circle' },
  { key: 'diarrhea', label: 'Diarrhea', icon: 'droplet' },
  { key: 'cough', label: 'Cough', icon: 'mic-off' },
];

const RED_FLAG_DEFS: {
  key: RedFlagKey;
  question: string;
}[] = [
  { key: 'confused', question: 'Feeling confused or unusually drowsy?' },
  { key: 'seizures', question: 'Any seizures?' },
  { key: 'unable_to_walk', question: 'Unable to sit up or walk without help?' },
  { key: 'dark_urine', question: 'Is your urine dark brown or black?' },
  { key: 'yellow_eyes', question: 'Are your eyes or skin yellow?' },
  { key: 'persistent_vomiting', question: 'Vomiting and cannot keep fluids down?' },
];

const PHOTO_SLOTS: { tag: SymptomPhotoTag; label: string }[] = [
  { tag: 'eyes', label: 'Eyes (check for yellow)' },
  { tag: 'urine', label: 'Urine colour' },
  { tag: 'palm', label: 'Palms (pallor check)' },
  { tag: 'skin', label: 'Skin / rash' },
];

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
            title="Finish onboarding first"
            message="Please complete the welcome steps so the app can tailor dosing and escalations to you."
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
          Alert.alert('Camera permission required', 'Enable camera access in Settings.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          quality: 0.6,
          allowsEditing: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photo library permission required');
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
      Alert.alert('Photo error', e?.message ?? 'Unknown error');
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
      Alert.alert('Could not save assessment', e?.message ?? 'Unknown error');
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
            <Text style={styles.h1}>How are you feeling today?</Text>
            <Text style={styles.sub}>
              Takes about a minute. Be honest — this drives the advice and whether your
              clinician is alerted.
            </Text>
          </View>

          <GlassCard>
            <Text style={styles.cardH}>Key vitals</Text>
            <Question label="Do you have a fever?">
              <YesNo
                value={form.fever}
                onChange={(v) => update('fever', v)}
              />
            </Question>
            {form.fever && (
              <Question label="Temperature (°C) — if you measured it">
                <TextInput
                  value={form.feverTemp}
                  onChangeText={(t) => update('feverTemp', sanitizeDecimal(t))}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 38.7"
                  placeholderTextColor={palette.textTertiary}
                />
              </Question>
            )}
            <Question label="Are you vomiting?">
              <YesNo
                value={form.vomiting}
                onChange={(v) => update('vomiting', v)}
              />
            </Question>
            <Question label="Can you keep water down?">
              <YesNo
                value={form.canKeepFluidsDown}
                onChange={(v) => update('canKeepFluidsDown', v)}
              />
            </Question>
            <Question label="How many days ago did symptoms start?">
              <TextInput
                value={form.symptomOnsetDays}
                onChangeText={(t) => update('symptomOnsetDays', t.replace(/[^0-9]/g, ''))}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="e.g. 2"
                placeholderTextColor={palette.textTertiary}
              />
            </Question>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}>Symptoms — tap all that apply</Text>
            <View style={styles.symptomGrid}>
              {SYMPTOM_OPTIONS.map((s) => {
                const active = form.selectedSymptoms.has(s.key);
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => toggleSymptom(s.key)}
                    style={[styles.symptomChip, active && styles.symptomChipActive]}
                  >
                    <Feather
                      name={s.icon}
                      size={14}
                      color={active ? palette.white : palette.primary}
                    />
                    <Text
                      style={[
                        styles.symptomChipText,
                        active && styles.symptomChipTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}>Red flags — safety check</Text>
            <Text style={styles.sub}>
              Any "Yes" below will immediately text your clinician.
            </Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {RED_FLAG_DEFS.map((rf) => (
                <View key={rf.key} style={styles.rfRow}>
                  <Text style={styles.rfQ}>{rf.question}</Text>
                  <YesNo
                    value={form.redFlags[rf.key]}
                    onChange={(v) => {
                      if (v === null) return;
                      setForm((prev) => ({
                        ...prev,
                        redFlags: { ...prev.redFlags, [rf.key]: v },
                      }));
                    }}
                  />
                </View>
              ))}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardH}>Photos (optional)</Text>
            <Text style={styles.sub}>
              Photos stay on your device. They are not sent in escalation SMS (text only).
            </Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {PHOTO_SLOTS.map((slot) => {
                const existing = form.photos.find((p) => p.tag === slot.tag);
                return (
                  <View key={slot.tag} style={styles.photoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.photoLabel}>{slot.label}</Text>
                      {existing ? (
                        <Image source={{ uri: existing.uri }} style={styles.thumb} />
                      ) : null}
                    </View>
                    <View style={{ gap: 6 }}>
                      <Pressable
                        onPress={() => addPhoto(slot.tag, 'camera')}
                        style={styles.iconBtn}
                      >
                        <Feather name="camera" size={16} color={palette.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => addPhoto(slot.tag, 'library')}
                        style={styles.iconBtn}
                      >
                        <Feather name="image" size={16} color={palette.primary} />
                      </Pressable>
                      {existing ? (
                        <Pressable
                          onPress={() => removePhoto(slot.tag)}
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
            <Text style={styles.cardH}>Notes (optional)</Text>
            <TextInput
              value={form.notes}
              onChangeText={(t) => update('notes', t)}
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              multiline
              placeholder="Anything else the clinician should know?"
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
                <Text style={styles.submitText}>Save assessment</Text>
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

  let tone: 'success' | 'warning' | 'danger' = 'success';
  let title = 'Assessment saved';
  let message = '';
  switch (outcome.kind) {
    case 'no_red_flags':
      tone = 'success';
      message = 'No red flags — no alert was sent.';
      break;
    case 'no_clinician':
      tone = 'warning';
      message =
        'Red flags detected but no clinician phone on file. Please update your contacts.';
      break;
    case 'cooldown':
      tone = 'warning';
      message =
        'Red flags present, but your clinician was recently alerted about the same issues (6h cooldown).';
      break;
    case 'sent':
      tone = 'danger';
      title = 'Clinician alerted by SMS';
      message = `An SMS was sent to your clinician (Twilio id ${outcome.twilioSid.slice(0, 10)}…).`;
      break;
    case 'failed':
      tone = 'danger';
      title = 'SMS alert FAILED';
      message = `Could not text your clinician: ${outcome.error}. Please call them directly.`;
      break;
    case 'disabled':
      tone = 'danger';
      title = 'SMS alert disabled';
      message =
        'Red flags detected, but SMS is not configured. Please call your clinician directly.';
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
              outcome.kind === 'sent' || outcome.kind === 'failed' || outcome.kind === 'disabled'
                ? 'alert-octagon'
                : outcome.kind === 'cooldown' || outcome.kind === 'no_clinician'
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
            Severity score: <Text style={{ fontFamily: fonts.bold }}>{severity.toFixed(1)}</Text>
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
                · {trend === 'better' ? 'improving' : trend === 'worse' ? 'worsening' : 'unchanged'}
              </Text>
            ) : null}
          </Text>
        </View>

        <Banner tone={tone} title={title} message={message} />

        <View style={{ gap: 10 }}>
          <Pressable onPress={onDone} style={styles.submitBtn}>
            <Text style={styles.submitText}>Back to dashboard</Text>
          </Pressable>
          <Pressable
            onPress={onAnother}
            style={[styles.submitBtn, { backgroundColor: 'transparent' }]}
          >
            <Text style={[styles.submitText, { color: palette.primary }]}>
              Log another
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
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.yn, value === true && styles.ynYes]}
      >
        <Text style={[styles.ynText, value === true && styles.ynTextActive]}>Yes</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.yn, value === false && styles.ynNo]}
      >
        <Text style={[styles.ynText, value === false && styles.ynTextActive]}>No</Text>
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
  h1: { fontFamily: fonts.bold, fontSize: 22, color: palette.secondary },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  cardH: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.secondary,
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
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  yn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  ynYes: { backgroundColor: palette.statusAlert, borderColor: palette.statusAlert },
  ynNo: { backgroundColor: palette.primary, borderColor: palette.primary },
  ynText: { fontFamily: fonts.medium, fontSize: 14, color: palette.secondary },
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
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  symptomChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  symptomChipText: { fontFamily: fonts.medium, fontSize: 13, color: palette.secondary },
  symptomChipTextActive: { color: palette.white },
  rfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rfQ: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: palette.secondary },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  photoLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: palette.secondary,
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
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: 'rgba(248,250,252,0.92)',
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
  submitText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },

  resTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: palette.secondary,
    textAlign: 'center',
  },
  resSeverity: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
  },
});
