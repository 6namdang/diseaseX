import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
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
import { getPatient, markOnboarded, upsertPatient } from '../db/patientRepo';
import type { ReadingLevel, Sex } from '../db/types';
import { useContentInsets } from '../hooks/useContentInsets';
import { T } from '../i18n/T';
import { useLanguage, useT } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/languages';
import { captureLocation, type GeoResult } from '../services/geoService';
import {
  generateRandomTopic,
  isValidTopic,
  subscribeUrlFor,
} from '../services/ntfyClient';

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
  clinicianAlertTopic: string;
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
  preferredLanguage: 'en',
  readingLevel: 'basic',
  patientPhone: '',
  clinicianName: '',
  clinicianAlertTopic: '',
  clinicianEmail: '',
};

export default function WelcomeScreen() {
  const insets = useContentInsets();
  const db = useSQLiteContext();
  const { lang, setLanguage } = useLanguage();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ ...emptyForm, preferredLanguage: lang });
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tLocPermDenied = useT(
    'Location permission is required to determine if you are in a malaria-endemic country. Please enable it in Settings and try again.',
  );
  const tLocPosUnavailPrefix = useT('Could not get your position');
  const tLocGpsHint = useT('Make sure GPS is on and try again.');
  const tLocLookupFail = useT('Could not look up country');
  const tSaveFail = useT('Could not save');
  const tUnknownErr = useT('Unknown error');
  const tBack = useT('Back');
  const tContinue = useT('Continue');
  const tCompleteSetup = useT('Complete setup');
  const tStepWord = useT('Step');
  const tOfWord = useT('of');
  const tWelcomeTitle = useT('Welcome to DiseaseX');
  const tWelcomeTagline = useT(
    "We'll ask a few questions so the app can give you advice tailored to your situation.",
  );
  const stepTitles = [
    useT('About you'),
    useT('Medical history'),
    useT('Location check'),
    useT('Language & contact'),
    useT('Your clinician'),
  ];

  // Pre-fill from existing DB row so Settings → Edit profile acts as an edit,
  // not an overwrite. Only runs once on mount; new installs just see emptyForm.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getPatient(db);
      if (cancelled || !existing) return;
      setForm({
        name: existing.name ?? '',
        age: existing.age != null ? String(existing.age) : '',
        sex: existing.sex,
        weightKg: existing.weightKg != null ? String(existing.weightKg) : '',
        heightCm: existing.heightCm != null ? String(existing.heightCm) : '',
        isPregnant: existing.isPregnant,
        pregnancyTrimester: existing.pregnancyTrimester,
        isBreastfeeding: existing.isBreastfeeding,
        allergies: existing.allergies.join(', '),
        currentMedications: existing.currentMedications.join(', '),
        chronicConditions: existing.chronicConditions.join(', '),
        priorMalariaEpisodes:
          existing.priorMalariaEpisodes != null ? String(existing.priorMalariaEpisodes) : '',
        location:
          existing.latitude != null && existing.longitude != null
            ? {
                countryCode: existing.countryCode,
                countryName: existing.countryName,
                region: existing.region,
                latitude: existing.latitude,
                longitude: existing.longitude,
                endemicity: existing.endemicity ?? 'unknown',
              }
            : null,
        preferredLanguage: existing.preferredLanguage ?? lang,
        readingLevel: existing.readingLevel,
        patientPhone: existing.patientPhone ?? '',
        clinicianName: existing.clinicianName ?? '',
        clinicianAlertTopic: existing.clinicianAlertTopic ?? '',
        clinicianEmail: existing.clinicianEmail ?? '',
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onPickLanguage = async (code: string) => {
    update('preferredLanguage', code);
    await setLanguage(code);
  };

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
        setLocError(tLocPermDenied);
      } else if (res.error.kind === 'position_unavailable') {
        setLocError(`${tLocPosUnavailPrefix}: ${res.error.error}. ${tLocGpsHint}`);
      } else {
        setLocError(`${tLocLookupFail}: ${res.error.error}.`);
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
        clinicianAlertTopic: form.clinicianAlertTopic.trim() || null,
        clinicianEmail: form.clinicianEmail.trim() || null,
      });
      await markOnboarded(db);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setSaving(false);
      Alert.alert(tSaveFail, e?.message ?? tUnknownErr);
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
          <Header
            step={step}
            stepTitles={stepTitles}
            titleText={tWelcomeTitle}
            taglineText={tWelcomeTagline}
            stepWord={tStepWord}
            ofWord={tOfWord}
          />

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
          {step === 3 && (
            <StepPrefs form={form} update={update} onPickLanguage={onPickLanguage} />
          )}
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
              <Text style={styles.backText}>{tBack}</Text>
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
                  {step === STEP_COUNT - 1 ? tCompleteSetup : tContinue}
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
        isValidTopic(f.clinicianAlertTopic.trim())
      );
    default:
      return false;
  }
}

function Header({
  step,
  stepTitles,
  titleText,
  taglineText,
  stepWord,
  ofWord,
}: {
  step: number;
  stepTitles: string[];
  titleText: string;
  taglineText: string;
  stepWord: string;
  ofWord: string;
}) {
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
      <Text style={styles.appName}>{titleText}</Text>
      <Text style={styles.tagline}>{taglineText}</Text>
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
        {stepWord} {step + 1} {ofWord} {STEP_COUNT}: {stepTitles[step]}
      </Text>
    </View>
  );
}

// ── Step 0 ──────────────────────────────────────────────────────────────
function StepIdentity({
  form,
  update,
}: {
  form: Form;
  update: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  const tFullName = useT('Full name');
  const tAgeYears = useT('Age (years)');
  const tSexAtBirth = useT('Sex at birth');
  const tWeight = useT('Weight (kg) — needed for dosing');
  const tHeight = useT('Height (cm) — optional');
  const tMale = useT('male');
  const tFemale = useT('female');
  const tOther = useT('other');
  const phName = useT('e.g. Amina Mwangi');
  const phAge = useT('e.g. 34');
  const phWeight = useT('e.g. 62.5');
  const phHeight = useT('e.g. 170');
  const sexLabels: Record<Sex, string> = { male: tMale, female: tFemale, other: tOther };
  return (
    <GlassCard>
      <View style={styles.fieldStack}>
        <Field label={tFullName}>
          <TextInput
            value={form.name}
            onChangeText={(t) => update('name', t)}
            style={styles.input}
            placeholder={phName}
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label={tAgeYears}>
          <TextInput
            value={form.age}
            onChangeText={(t) => update('age', t.replace(/[^0-9]/g, ''))}
            style={styles.input}
            keyboardType="number-pad"
            placeholder={phAge}
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label={tSexAtBirth}>
          <Row>
            {(['male', 'female', 'other'] as const).map((s) => (
              <Choice
                key={s}
                label={sexLabels[s]}
                selected={form.sex === s}
                onPress={() => update('sex', s)}
              />
            ))}
          </Row>
        </Field>
        <Field label={tWeight}>
          <TextInput
            value={form.weightKg}
            onChangeText={(t) => update('weightKg', sanitizeDecimal(t))}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={phWeight}
            placeholderTextColor={palette.textTertiary}
          />
        </Field>
        <Field label={tHeight}>
          <TextInput
            value={form.heightCm}
            onChangeText={(t) => update('heightCm', sanitizeDecimal(t))}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={phHeight}
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
  const tPregnantNow = useT('Are you pregnant right now?');
  const tWhichTrimester = useT('Which trimester?');
  const tBreastfeeding = useT('Are you breastfeeding?');
  const tAllergies = useT('Drug allergies (comma-separated)');
  const tMedsNow = useT('Medicines you are taking now');
  const tChronic = useT('Long-term conditions');
  const tPrior = useT('How many times have you had malaria before?');
  const tTrimester = useT('Trimester');
  const tYes = useT('Yes');
  const tNo = useT('No');
  const phAllergies = useT('e.g. penicillin, sulfa');
  const phMeds = useT('e.g. metformin, paracetamol');
  const phChronic = useT('e.g. diabetes, G6PD deficiency');
  const phPrior = useT('e.g. 2 (leave blank if unsure)');
  const askPregnancy = form.sex === 'female';
  return (
    <View style={{ gap: 12 }}>
      {askPregnancy && (
        <GlassCard>
          <View style={styles.fieldStack}>
            <Field label={tPregnantNow}>
              <Row>
                <Choice
                  label={tYes}
                  selected={form.isPregnant === true}
                  onPress={() => update('isPregnant', true)}
                />
                <Choice
                  label={tNo}
                  selected={form.isPregnant === false}
                  onPress={() => update('isPregnant', false)}
                />
              </Row>
            </Field>
            {form.isPregnant && (
              <Field label={tWhichTrimester}>
                <Row>
                  {([1, 2, 3] as const).map((t) => (
                    <Choice
                      key={t}
                      label={`${tTrimester} ${t}`}
                      selected={form.pregnancyTrimester === t}
                      onPress={() => update('pregnancyTrimester', t)}
                    />
                  ))}
                </Row>
              </Field>
            )}
            {form.isPregnant === false && (
              <Field label={tBreastfeeding}>
                <Row>
                  <Choice
                    label={tYes}
                    selected={form.isBreastfeeding === true}
                    onPress={() => update('isBreastfeeding', true)}
                  />
                  <Choice
                    label={tNo}
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
          <Field label={tAllergies}>
            <TextInput
              value={form.allergies}
              onChangeText={(t) => update('allergies', t)}
              style={[styles.input, styles.multiline]}
              placeholder={phAllergies}
              placeholderTextColor={palette.textTertiary}
              multiline
            />
          </Field>
          <Field label={tMedsNow}>
            <TextInput
              value={form.currentMedications}
              onChangeText={(t) => update('currentMedications', t)}
              style={[styles.input, styles.multiline]}
              placeholder={phMeds}
              placeholderTextColor={palette.textTertiary}
              multiline
            />
          </Field>
          <Field label={tChronic}>
            <TextInput
              value={form.chronicConditions}
              onChangeText={(t) => update('chronicConditions', t)}
              style={[styles.input, styles.multiline]}
              placeholder={phChronic}
              placeholderTextColor={palette.textTertiary}
              multiline
            />
          </Field>
          <Field label={tPrior}>
            <TextInput
              value={form.priorMalariaEpisodes}
              onChangeText={(t) =>
                update('priorMalariaEpisodes', t.replace(/[^0-9]/g, ''))
              }
              style={styles.input}
              keyboardType="number-pad"
              placeholder={phPrior}
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
  const tAskWhy = useT('Why we ask for location');
  const tAskWhyMsg = useT(
    'DiseaseX checks whether you are in a country with ongoing malaria transmission (per WHO Global Health Observatory). Used once. Never tracked in the background.',
  );
  const tLocErrTitle = useT('Location error');
  const tUnknownCountry = useT('Unknown country');
  const tEndemicTxt = useT('This country has ongoing malaria transmission per WHO.');
  const tEliminatedTxt = useT('This country is considered malaria-free / eliminated per WHO.');
  const tNonEndemicTxt = useT('This country is not tracked as malaria-endemic by WHO.');
  const tUnknownEndemic = useT('WHO endemicity status unknown — proceed with caution.');
  const tRecapture = useT('Recapture');
  const tNeedLoc = useT('We need your location');
  const tNeedLocHint = useT('Tap below to share location. This is required to continue.');
  const tShareLoc = useT('Share my location');
  const tOpenSettings = useT('Open Settings');
  const loc = form.location;
  return (
    <View style={{ gap: 12 }}>
      <Banner tone="info" title={tAskWhy} message={tAskWhyMsg} />

      {error ? (
        <Banner tone="danger" title={tLocErrTitle} message={error} />
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
                {loc.countryName ?? tUnknownCountry}
                {loc.region ? `, ${loc.region}` : ''}
              </Text>
              <Text style={styles.locSubtitle}>
                {loc.endemicity === 'endemic'
                  ? tEndemicTxt
                  : loc.endemicity === 'eliminated'
                    ? tEliminatedTxt
                    : loc.endemicity === 'non_endemic'
                      ? tNonEndemicTxt
                      : tUnknownEndemic}
              </Text>
              <Pressable onPress={onLocate} style={styles.secondaryBtn} disabled={loading}>
                <Feather name="refresh-cw" size={16} color={palette.primary} />
                <Text style={styles.secondaryBtnText}>{tRecapture}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Feather name="map-pin" size={36} color={palette.primary} />
              <Text style={styles.locTitle}>{tNeedLoc}</Text>
              <Text style={styles.locSubtitle}>{tNeedLocHint}</Text>
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
                    <Text style={styles.primaryInlineText}>{tShareLoc}</Text>
                  </>
                )}
              </Pressable>
              {error?.toLowerCase().includes('settings') && (
                <Pressable onPress={onSettings} style={styles.secondaryBtn}>
                  <Feather name="settings" size={16} color={palette.primary} />
                  <Text style={styles.secondaryBtnText}>{tOpenSettings}</Text>
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
  onPickLanguage,
}: {
  form: Form;
  update: <K extends keyof Form>(k: K, v: Form[K]) => void;
  onPickLanguage: (code: string) => void;
}) {
  const tLangLabel = useT('Preferred language (UI + advice)');
  const tReadingLevel = useT('Reading level');
  const tPhoneLabel = useT('Your phone (optional — included in escalations)');
  const tBasic = useT('basic');
  const tInter = useT('intermediate');
  const tAdv = useT('advanced');
  const readingLabels: Record<ReadingLevel, string> = {
    basic: tBasic,
    intermediate: tInter,
    advanced: tAdv,
  };
  return (
    <GlassCard>
      <View style={styles.fieldStack}>
        <Field label={tLangLabel}>
          <View style={styles.row}>
            {LANGUAGES.map((l) => (
              <Choice
                key={l.code}
                label={l.native}
                selected={form.preferredLanguage === l.code}
                onPress={() => onPickLanguage(l.code)}
              />
            ))}
          </View>
        </Field>
        <Field label={tReadingLevel}>
          <Row>
            {(['basic', 'intermediate', 'advanced'] as const).map((r) => (
              <Choice
                key={r}
                label={readingLabels[r]}
                selected={form.readingLevel === r}
                onPress={() => update('readingLevel', r)}
              />
            ))}
          </Row>
        </Field>
        <Field label={tPhoneLabel}>
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
  const tEmergencyTitle = useT('Emergency contact');
  const tEmergencyMsg = useT(
    "If you report severe symptoms, DiseaseX will push an urgent alert to your clinician via ntfy.sh. They need to install the free ntfy app (iOS / Android) and subscribe to the topic below — no SIM, phone number, or account required.",
  );
  const tClinName = useT('Clinician / PCP name');
  const tAlertTopic = useT('Alert topic (shared secret)');
  const tTopicHelp = useT(
    "This acts as a password. Pick one that isn't easy to guess, or tap Generate.",
  );
  const tGenerate = useT('Generate');
  const tHowToShare = useT('How to share with your clinician');
  const tShareStep1 = useT(
    'Ask them to install the free ntfy app (iOS / Android).',
  );
  const tShareStep2 = useT(
    "In the app tap + → Add subscription, paste ONLY the topic name below into the 'Topic' field (not the full URL), leave the server as the default (ntfy.sh), then tap Subscribe.",
  );
  const tShareStep3 = useT(
    'Or, they can open the Full URL in any browser to watch alerts live.',
  );
  const tTopicLabel = useT('Topic (paste this into the ntfy app)');
  const tFullUrlLabel = useT('Full URL (for browser only)');
  const tTopicInvalid = useT(
    'Use 1–64 letters, numbers, hyphens, or underscores.',
  );
  const tClinEmail = useT('Clinician email (optional)');
  const phClinName = useT('e.g. Dr. Otieno');
  const phTopic = useT('e.g. diseasex-amina-9f3c1');

  const topic = form.clinicianAlertTopic.trim();
  const topicValid = topic.length === 0 || isValidTopic(topic);
  const showShareCard = topic.length > 0 && topicValid;

  return (
    <View style={{ gap: 12 }}>
      <Banner tone="warning" title={tEmergencyTitle} message={tEmergencyMsg} />
      <GlassCard>
        <View style={styles.fieldStack}>
          <Field label={tClinName}>
            <TextInput
              value={form.clinicianName}
              onChangeText={(t) => update('clinicianName', t)}
              style={styles.input}
              placeholder={phClinName}
              placeholderTextColor={palette.textTertiary}
            />
          </Field>

          <Field label={tAlertTopic}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={form.clinicianAlertTopic}
                onChangeText={(t) =>
                  update(
                    'clinicianAlertTopic',
                    t.replace(/[^A-Za-z0-9_-]/g, ''),
                  )
                }
                style={[styles.input, { flex: 1 }]}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={phTopic}
                placeholderTextColor={palette.textTertiary}
              />
              <Pressable
                onPress={() => update('clinicianAlertTopic', generateRandomTopic())}
                style={styles.secondaryBtn}
              >
                <Feather name="refresh-cw" size={14} color={palette.primary} />
                <Text style={styles.secondaryBtnText}>{tGenerate}</Text>
              </Pressable>
            </View>
            {!topicValid ? (
              <Text style={styles.helpError}>{tTopicInvalid}</Text>
            ) : (
              <Text style={styles.helpText}>{tTopicHelp}</Text>
            )}
          </Field>

          {showShareCard ? (
            <View style={styles.shareCard}>
              <View style={styles.shareHeader}>
                <Feather name="share-2" size={14} color={palette.primary} />
                <Text style={styles.shareTitle}>{tHowToShare}</Text>
              </View>

              <View style={styles.shareStepsList}>
                <ShareStep n={1} text={tShareStep1} />
                <ShareStep n={2} text={tShareStep2} />
                <ShareStep n={3} text={tShareStep3} />
              </View>

              <View style={styles.urlBlock}>
                <Text style={styles.urlLabel}>{tTopicLabel}</Text>
                <Text style={styles.urlValue} selectable>
                  {topic}
                </Text>
              </View>
              <View style={[styles.urlBlock, { marginTop: 6 }]}>
                <Text style={styles.urlLabel}>{tFullUrlLabel}</Text>
                <Text style={styles.urlValueMuted} selectable>
                  {subscribeUrlFor(topic)}
                </Text>
              </View>
            </View>
          ) : null}

          <Field label={tClinEmail}>
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

function ShareStep({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.shareStepRow}>
      <View style={styles.shareStepDot}>
        <Text style={styles.shareStepDotText}>{n}</Text>
      </View>
      <Text style={styles.shareStepText}>{text}</Text>
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

  helpText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    marginTop: 6,
    lineHeight: 16,
  },
  helpError: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.statusAlert,
    marginTop: 6,
  },
  urlBlock: {
    marginTop: 10,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(37,99,235,0.06)',
    gap: 2,
  },
  urlLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: palette.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  urlValue: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: palette.primary,
  },
  urlValueMuted: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textSecondary,
  },
  shareCard: {
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(37,99,235,0.04)',
    gap: 10,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.primary,
    letterSpacing: 0.2,
  },
  shareStepsList: { gap: 8 },
  shareStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  shareStepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  shareStepDotText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: palette.white,
  },
  shareStepText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 19,
  },
});
