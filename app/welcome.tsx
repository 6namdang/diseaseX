import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Banner } from '../components/ui/Banner';
import { GlassCard } from '../components/ui/GlassCard';
import { ScreenBackdrop } from '../components/ui/ScreenBackdrop';
import { fonts, palette, radii, shadow, space } from '../constants/designTokens';
import { markOnboarded, upsertPatient } from '../db/patientRepo';
import type { ReadingLevel, Sex } from '../db/types';
import { useContentInsets } from '../hooks/useContentInsets';
import { captureLocation, type GeoResult } from '../services/geoService';

const STEP_COUNT = 5;

type Form = {
  name: string;
  age: string;
  sex: Sex | null;
  weightKg: string;
  heightCm: string;
  isPregnant: boolean | null;
  pregnancyTrimester: 1 | 2 | 3 | null;
  isBreastfeeding: boolean | null;
  allergies: string;
  currentMedications: string;
  chronicConditions: string;
  priorMalariaEpisodes: string;
  location: GeoResult | null;
  preferredLanguage: string;
  readingLevel: ReadingLevel | null;
  patientPhone: string;
  clinicianName: string;
  clinicianPhone: string;
  clinicianEmail: string;
};

const emptyForm: Form = {
  name: '',
  age: '',
  sex: null,
  weightKg: '',
  heightCm: '',
  isPregnant: null,
  pregnancyTrimester: null,
  isBreastfeeding: null,
  allergies: '',
  currentMedications: '',
  chronicConditions: '',
  priorMalariaEpisodes: '',
  location: null,
  preferredLanguage: 'English',
  readingLevel: 'basic',
  patientPhone: '',
  clinicianName: '',
  clinicianPhone: '',
  clinicianEmail: '',
};

export default function WelcomeScreen() {
  const insets = useContentInsets();
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canContinue = useMemo(() => stepIsValid(step, form), [step, form]);

  async function onNext() {
    if (!canContinue) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < STEP_COUNT - 1) {
      setStep(step + 1);
    } else {
      await finish();
    }
  }

  function onBack() {
    if (step === 0) return;
    setStep(step - 1);
  }

  async function onLocate() {
    setLocLoading(true);
    setLocError(null);
    const res = await captureLocation();
    setLocLoading(false);
    if (!res.ok) {
      if (res.error.kind === 'permission_denied') {
        setLocError(
          'Location permission is required to determine if you are in a malaria-endemic country. Please enable it in Settings and try again.',
        );
      } else if (res.error.kind === 'position_unavailable') {
        setLocError(
          `Could not get your position: ${res.error.error}. Make sure GPS is on and try again.`,
        );
      } else {
        setLocError(`Could not look up country: ${res.error.error}.`);
      }
      return;
    }
    update('location', res.data);
  }

  function openSettings() {
    Linking.openSettings().catch(() => {});
  }

  async function finish() {
    try {
      setSaving(true);
      await upsertPatient(db, {
        name: form.name.trim() || null,
        age: toInt(form.age),
        sex: form.sex,
        weightKg: toFloat(form.weightKg),
        heightCm: toFloat(form.heightCm),
        isPregnant: form.sex === 'female' ? form.isPregnant : false,
        pregnancyTrimester: form.isPregnant ? form.pregnancyTrimester : null,
        isBreastfeeding: form.sex === 'female' ? form.isBreastfeeding : false,
        allergies: splitList(form.allergies),
        currentMedications: splitList(form.currentMedications),
        chronicConditions: splitList(form.chronicConditions),
        priorMalariaEpisodes: toInt(form.priorMalariaEpisodes),
        countryCode: form.location?.countryCode ?? null,
        countryName: form.location?.countryName ?? null,
        region: form.location?.region ?? null,
        latitude: form.location?.latitude ?? null,
        longitude: form.location?.longitude ?? null,
        endemicity: form.location?.endemicity ?? null,
        preferredLanguage: form.preferredLanguage.trim() || null,
        readingLevel: form.readingLevel,
        patientPhone: form.patientPhone.trim() || null,
        clinicianName: form.clinicianName.trim() || null,
        clinicianPhone: form.clinicianPhone.trim() || null,
        clinicianEmail: form.clinicianEmail.trim() || null,
      });
      await markOnboarded(db);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Could not save', e?.message ?? 'Unknown error');
    }
  }

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
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 140,
              paddingHorizontal: space.padH,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header step={step} />

          {step === 0 && <StepIdentity form={form} update={update} />}
          {step === 1 && <StepMedical form={form} update={update} />}
          {step === 2 && (
            <StepLocation
              form={form}
              onLocate={onLocate}
              onSettings={openSettings}
              loading={locLoading}
              error={locError}
            />
          )}
          {step === 3 && <StepPrefs form={form} update={update} />}
          {step === 4 && <StepClinician form={form} update={update} />}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 16,
              paddingHorizontal: space.padH,
            },
          ]}
        >
          {step > 0 ? (
            <Pressable onPress={onBack} style={styles.backBtn} disabled={saving}>
              <Feather name="arrow-left" size={18} color={palette.secondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={onNext}
            disabled={!canContinue || saving}
            style={({ pressed }) => [
              styles.cta,
              (!canContinue || saving) && { opacity: 0.4 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {step === STEP_COUNT - 1 ? 'Complete setup' : 'Continue'}
                </Text>
                <Feather name="arrow-right" size={18} color={palette.white} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackdrop>
  );
}

function stepIsValid(step: number, f: Form): boolean {
  switch (step) {
    case 0:
      return (
        f.name.trim().length > 0 &&
        toInt(f.age) !== null &&
        f.sex !== null &&
        toFloat(f.weightKg) !== null
      );
    case 1: {
      if (f.sex === 'female') {
        if (f.isPregnant === null || f.isBreastfeeding === null) return false;
        if (f.isPregnant && f.pregnancyTrimester === null) return false;
      }
      return true;
    }
    case 2:
      return f.location !== null;
    case 3:
      return f.preferredLanguage.trim().length > 0 && f.readingLevel !== null;
    case 4:
      return (
        f.clinicianName.trim().length > 0 &&
        f.clinicianPhone.trim().length > 0
      );
    default:
      return false;
  }
}

function Header({ step }: { step: number }) {
  return (
    <View style={styles.header}>
      <LinearGradient
        colors={[palette.primary, palette.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoWrap}
      >
        <Feather name="heart" size={28} color={palette.white} />
      </LinearGradient>
      <Text style={styles.appName}>Welcome to DiseaseX</Text>
      <Text style={styles.tagline}>
        We'll ask a few questions so the app can give you advice tailored to your situation.
      </Text>
      <View style={styles.progressRow}>
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= step ? palette.primary : 'rgba(148,163,184,0.4)' },
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {step + 1} of {STEP_COUNT}: {STEP_TITLES[step]}
      </Text>
    </View>
  );
}

const STEP_TITLES = [
  'About you',
  'Medical history',
  'Location check',
  'Language & contact',
  'Your clinician',
];

// ── Step 0 ──────────────────────────────────────────────────────────────
function StepIdentity({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  return (
    <GlassCard>
      <View style={styles.fieldStack}>
        <Field label="Full name">
          <TextInput
            value={form.name}
            onChangeText={(t) => update('name', t)}
            style={styles.input}
            placeholder="e.g. Amina Mwangi"
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label="Age (years)">
          <TextInput
            value={form.age}
            onChangeText={(t) => update('age', t.replace(/[^0-9]/g, ''))}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="e.g. 34"
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label="Sex at birth">
          <Row>
            {(['male', 'female', 'other'] as const).map((s) => (
              <Choice
                key={s}
                label={s}
                selected={form.sex === s}
                onPress={() => update('sex', s)}
              />
            ))}
          </Row>
        </Field>
        <Field label="Weight (kg) — needed for dosing">
          <TextInput
            value={form.weightKg}
            onChangeText={(t) => update('weightKg', sanitizeDecimal(t))}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="e.g. 62.5"
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label="Height (cm) — optional">
          <TextInput
            value={form.heightCm}
            onChangeText={(t) => update('heightCm', sanitizeDecimal(t))}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="e.g. 170"
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
      </View>
    </GlassCard>
  );
}

// ── Step 1 ──────────────────────────────────────────────────────────────
function StepMedical({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  const askPregnancy = form.sex === 'female';
  return (
    <View style={{ gap: 12 }}>
      {askPregnancy && (
        <GlassCard>
          <View style={styles.fieldStack}>
            <Field label="Are you pregnant right now?">
              <Row>
                <Choice
                  label="Yes"
                  selected={form.isPregnant === true}
                  onPress={() => update('isPregnant', true)}
                />
                <Choice
                  label="No"
                  selected={form.isPregnant === false}
                  onPress={() => update('isPregnant', false)}
                />
              </Row>
            </Field>
            {form.isPregnant && (
              <Field label="Which trimester?">
                <Row>
                  {([1, 2, 3] as const).map((t) => (
                    <Choice
                      key={t}
                      label={`Trimester ${t}`}
                      selected={form.pregnancyTrimester === t}
                      onPress={() => update('pregnancyTrimester', t)}
                    />
                  ))}
                </Row>
              </Field>
            )}
            {form.isPregnant === false && (
              <Field label="Are you breastfeeding?">
                <Row>
                  <Choice
                    label="Yes"
                    selected={form.isBreastfeeding === true}
                    onPress={() => update('isBreastfeeding', true)}
                  />
                  <Choice
                    label="No"
                    selected={form.isBreastfeeding === false}
                    onPress={() => update('isBreastfeeding', false)}
                  />
                </Row>
              </Field>
            )}
          </View>
        </GlassCard>
      )}

      <GlassCard>
        <View style={styles.fieldStack}>
          <Field label="Drug allergies (comma-separated)">
            <TextInput
              value={form.allergies}
              onChangeText={(t) => update('allergies', t)}
              style={[styles.input, styles.multiline]}
              placeholder="e.g. penicillin, sulfa"
              placeholderTextColor={palette.textTertiary}
              multiline
            />
          </Field>
          <Field label="Medicines you are taking now">
            <TextInput
              value={form.currentMedications}
              onChangeText={(t) => update('currentMedications', t)}
              style={[styles.input, styles.multiline]}
              placeholder="e.g. metformin, paracetamol"
              placeholderTextColor={palette.textTertiary}
              multiline
            />
          </Field>
          <Field label="Long-term conditions">
            <TextInput
              value={form.chronicConditions}
              onChangeText={(t) => update('chronicConditions', t)}
              style={[styles.input, styles.multiline]}
              placeholder="e.g. diabetes, G6PD deficiency"
              placeholderTextColor={palette.textTertiary}
              multiline
            />
          </Field>
          <Field label="How many times have you had malaria before?">
            <TextInput
              value={form.priorMalariaEpisodes}
              onChangeText={(t) =>
                update('priorMalariaEpisodes', t.replace(/[^0-9]/g, ''))
              }
              style={styles.input}
              keyboardType="number-pad"
              placeholder="e.g. 2 (leave blank if unsure)"
              placeholderTextColor={palette.textTertiary}
            />
          </Field>
        </View>
      </GlassCard>
    </View>
  );
}

// ── Step 2 ──────────────────────────────────────────────────────────────
function StepLocation({
  form,
  onLocate,
  onSettings,
  loading,
  error,
}: {
  form: Form;
  onLocate: () => void;
  onSettings: () => void;
  loading: boolean;
  error: string | null;
}) {
  const loc = form.location;
  return (
    <View style={{ gap: 12 }}>
      <Banner
        tone="info"
        title="Why we ask for location"
        message="DiseaseX checks whether you are in a country with ongoing malaria transmission (per WHO Global Health Observatory). Used once. Never tracked in the background."
      />

      {error ? (
        <Banner tone="danger" title="Location error" message={error} />
      ) : null}

      <GlassCard>
        <View style={{ gap: 14, alignItems: 'center' }}>
          {loc ? (
            <>
              <Feather
                name={loc.endemicity === 'endemic' ? 'alert-triangle' : 'check-circle'}
                size={36}
                color={
                  loc.endemicity === 'endemic'
                    ? palette.statusAlert
                    : palette.statusGood
                }
              />
              <Text style={styles.locTitle}>
                {loc.countryName ?? 'Unknown country'}
                {loc.region ? `, ${loc.region}` : ''}
              </Text>
              <Text style={styles.locSubtitle}>
                {loc.endemicity === 'endemic'
                  ? 'This country has ongoing malaria transmission per WHO.'
                  : loc.endemicity === 'eliminated'
                    ? 'This country is considered malaria-free / eliminated per WHO.'
                    : loc.endemicity === 'non_endemic'
                      ? 'This country is not tracked as malaria-endemic by WHO.'
                      : 'WHO endemicity status unknown — proceed with caution.'}
              </Text>
              <Pressable onPress={onLocate} style={styles.secondaryBtn} disabled={loading}>
                <Feather name="refresh-cw" size={16} color={palette.primary} />
                <Text style={styles.secondaryBtnText}>Recapture</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Feather name="map-pin" size={36} color={palette.primary} />
              <Text style={styles.locTitle}>We need your location</Text>
              <Text style={styles.locSubtitle}>
                Tap below to share location. This is required to continue.
              </Text>
              <Pressable
                onPress={onLocate}
                style={styles.primaryInlineBtn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <>
                    <Feather name="navigation" size={16} color={palette.white} />
                    <Text style={styles.primaryInlineText}>Share my location</Text>
                  </>
                )}
              </Pressable>
              {error?.toLowerCase().includes('settings') && (
                <Pressable onPress={onSettings} style={styles.secondaryBtn}>
                  <Feather name="settings" size={16} color={palette.primary} />
                  <Text style={styles.secondaryBtnText}>Open Settings</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </GlassCard>
    </View>
  );
}

// ── Step 3 ──────────────────────────────────────────────────────────────
function StepPrefs({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  return (
    <GlassCard>
      <View style={styles.fieldStack}>
        <Field label="Preferred language for advice">
          <TextInput
            value={form.preferredLanguage}
            onChangeText={(t) => update('preferredLanguage', t)}
            style={styles.input}
            placeholder="e.g. English"
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label="Reading level">
          <Row>
            {(['basic', 'intermediate', 'advanced'] as const).map((r) => (
              <Choice
                key={r}
                label={r}
                selected={form.readingLevel === r}
                onPress={() => update('readingLevel', r)}
              />
            ))}
          </Row>
        </Field>
        <Field label="Your phone (optional — included in escalations)">
          <TextInput
            value={form.patientPhone}
            onChangeText={(t) => update('patientPhone', t)}
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="+254700123456"
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
      </View>
    </GlassCard>
  );
}

// ── Step 4 ──────────────────────────────────────────────────────────────
function StepClinician({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Banner
        tone="warning"
        title="Emergency contact"
        message="If you report severe symptoms, DiseaseX will automatically text your clinician with the key details. Please use a number that receives SMS."
      />
      <GlassCard>
        <View style={styles.fieldStack}>
          <Field label="Clinician / PCP name">
            <TextInput
              value={form.clinicianName}
              onChangeText={(t) => update('clinicianName', t)}
              style={styles.input}
              placeholder="e.g. Dr. Otieno"
              placeholderTextColor={palette.textTertiary}
            />
          </Field>
          <Field label="Clinician phone (with country code)">
            <TextInput
              value={form.clinicianPhone}
              onChangeText={(t) => update('clinicianPhone', t)}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+254700123456"
              placeholderTextColor={palette.textTertiary}
            />
          </Field>
          <Field label="Clinician email (optional)">
            <TextInput
              value={form.clinicianEmail}
              onChangeText={(t) => update('clinicianEmail', t)}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="dr.otieno@example.org"
              placeholderTextColor={palette.textTertiary}
            />
          </Field>
        </View>
      </GlassCard>
    </View>
  );
}

// ── Shared UI ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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

function splitList(raw: string): string[] {
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  header: { alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.logo,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: palette.secondary,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressDot: { width: 22, height: 6, borderRadius: 3 },
  stepLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.primary,
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  fieldStack: { gap: 14 },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: palette.textSecondary,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: palette.text,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: palette.secondary,
    textTransform: 'capitalize',
  },
  chipTextActive: { color: palette.white },

  locTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: palette.secondary,
    textAlign: 'center',
  },
  locSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radii.md,
  },
  primaryInlineText: {
    fontFamily: fonts.semibold,
    color: palette.white,
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontFamily: fonts.medium,
    color: palette.primary,
    fontSize: 14,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: 'rgba(248,250,252,0.9)',
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  backText: { fontFamily: fonts.medium, fontSize: 14, color: palette.secondary },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: radii.md,
    paddingVertical: 16,
  },
  ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
});
