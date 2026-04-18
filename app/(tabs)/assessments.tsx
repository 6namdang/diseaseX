import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import {
  MOCK_CLINICAL_ANALYSIS,
  MOCK_DOSAGE_PREVIEW,
  MOCK_OBSERVATION_STEP,
  MOCK_STEP2,
  MOCK_STEP3,
  MOCK_STEP4,
} from '../../data/mockClinical';
import { useContentInsets } from '../../hooks/useContentInsets';

type Step = 1 | 2 | 3 | 4;

function MetricBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricPct}>{pct}%</Text>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function PillToggle({
  label,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.pill,
        active && { backgroundColor: `${activeColor}22`, borderColor: activeColor },
      ]}
    >
      <Text style={[styles.pillText, active && { color: activeColor, fontFamily: fonts.semibold }]}>{label}</Text>
    </Pressable>
  );
}

export default function AssessmentsScreen() {
  const insets = useContentInsets();
  const [step, setStep] = useState<Step>(1);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [feverDays, setFeverDays] = useState(3);
  const [obsToggles, setObsToggles] = useState(() => MOCK_STEP2.obsChips.map(() => false));
  const [intakePoor, setIntakePoor] = useState<boolean | null>(null);

  const [supplyInject, setSupplyInject] = useState(true);
  const [supplyRdt, setSupplyRdt] = useState(false);

  const [notes, setNotes] = useState('');

  const pickImage = async () => {
    const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!r.granted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) setPhotoUri(res.assets[0].uri);
  };

  const pills = [1, 2, 3, 4] as const;
  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 4) {
      Alert.alert('Queued (mock)', 'Assessment stored locally — sync & logic not implemented.', [
        {
          text: 'OK',
          onPress: () => {
            setStep(1);
            setPhotoUri(null);
            setNotes('');
          },
        },
      ]);
      return;
    }
    setStep((s) => ((s + 1) as Step));
  };

  const clinicalVisible = step === 1 && photoUri;
  const pressFx = Platform.OS !== 'web';

  const toggleObs = (i: number) => {
    setObsToggles((prev) => prev.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <ScreenBackdrop>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: space.padH,
            paddingBottom: insets.bottom + 120,
            gap: space.gap,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepMeta}>Step {step} of 4 · mock triage</Text>
          <View style={styles.progressRow}>
            {pills.map((p) => (
              <View
                key={p}
                style={[styles.progressPill, p <= step ? styles.progressOn : styles.progressOff]}
              />
            ))}
          </View>

          {step === 1 && (
            <>
              {!photoUri ? (
                <Pressable onPress={pickImage} style={styles.dashed}>
                  <Feather name="video" size={28} color={palette.primary} />
                  <Text style={styles.dashedTitle}>{MOCK_OBSERVATION_STEP.dashedTitle}</Text>
                  <Text style={styles.dashedHint}>{MOCK_OBSERVATION_STEP.dashedHint}</Text>
                </Pressable>
              ) : (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.previewImg} />
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPhotoUri(null);
                    }}
                    style={styles.clearPhoto}
                  >
                    <Feather name="x" size={18} color={palette.white} />
                  </Pressable>
                </View>
              )}

              {clinicalVisible ? (
                <GlassCard intensity={34}>
                  <View style={styles.degreeRow}>
                    <Text style={styles.microLabel}>Pattern tag</Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: `${MOCK_CLINICAL_ANALYSIS.badgeColor}22` },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: MOCK_CLINICAL_ANALYSIS.badgeColor }]}>
                        {MOCK_CLINICAL_ANALYSIS.badgeLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.microLabel}>{MOCK_CLINICAL_ANALYSIS.patternBarLabel}</Text>
                  <View style={styles.healTrack}>
                    <View
                      style={[
                        styles.healFill,
                        {
                          width: `${MOCK_CLINICAL_ANALYSIS.patternBarPct}%`,
                          backgroundColor: MOCK_CLINICAL_ANALYSIS.barColor,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ gap: 12, marginTop: 8 }}>
                    {MOCK_CLINICAL_ANALYSIS.metrics.map((m) => (
                      <MetricBar key={m.label} label={m.label} pct={m.pct} color={m.color} />
                    ))}
                  </View>
                  <Text style={[styles.microLabel, { marginTop: 14 }]}>Clinical description</Text>
                  <Text style={styles.clinicalPara}>{MOCK_CLINICAL_ANALYSIS.description}</Text>
                  <View style={styles.compareBlock}>
                    <Text style={styles.microLabel}>Comparison note</Text>
                    <Text style={styles.compareText}>{MOCK_CLINICAL_ANALYSIS.comparison}</Text>
                  </View>
                </GlassCard>
              ) : null}
            </>
          )}

          {step === 2 && (
            <GlassCard intensity={36}>
              <Text style={styles.formTitle}>{MOCK_STEP2.title}</Text>
              <Text style={styles.fieldLabel}>{MOCK_STEP2.feverLabel}</Text>
              <View style={styles.painRow}>
                {Array.from({ length: 8 }, (_, n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFeverDays(n);
                    }}
                    style={[
                      styles.painDot,
                      feverDays === n && { backgroundColor: palette.primary, borderColor: palette.primary },
                    ]}
                  >
                    <Text style={[styles.painDotText, feverDays === n && { color: palette.white }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>{MOCK_STEP2.obsLabel}</Text>
              <View style={styles.chipRow}>
                {MOCK_STEP2.obsChips.map((label, i) => (
                  <PillToggle
                    key={label}
                    label={label}
                    active={obsToggles[i] ?? false}
                    onPress={() => toggleObs(i)}
                    activeColor={palette.statusMonitor}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>{MOCK_STEP2.intakeLabel}</Text>
              <View style={styles.yesNoRow}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIntakePoor(true);
                  }}
                  style={[
                    styles.yesNoBtn,
                    intakePoor === true && {
                      backgroundColor: `${palette.statusAlert}18`,
                      borderColor: palette.statusAlert,
                    },
                  ]}
                >
                  <Text style={[styles.yesNoText, intakePoor === true && { color: palette.statusAlert }]}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIntakePoor(false);
                  }}
                  style={[
                    styles.yesNoBtn,
                    intakePoor === false && { borderColor: palette.primary, backgroundColor: `${palette.primary}14` },
                  ]}
                >
                  <Text style={[styles.yesNoText, intakePoor === false && { color: palette.primary }]}>No</Text>
                </Pressable>
              </View>
            </GlassCard>
          )}

          {step === 3 && (
            <GlassCard intensity={36}>
              <Text style={styles.formTitle}>{MOCK_STEP3.title}</Text>
              <Text style={styles.fieldLabel}>{MOCK_STEP3.q1}</Text>
              <View style={styles.chipRow}>
                <PillToggle
                  label="Yes"
                  active={supplyInject}
                  onPress={() => setSupplyInject(true)}
                  activeColor={palette.statusGood}
                />
                <PillToggle
                  label="No"
                  active={!supplyInject}
                  onPress={() => setSupplyInject(false)}
                  activeColor={palette.textTertiary}
                />
              </View>
              <Text style={styles.fieldLabel}>{MOCK_STEP3.q2}</Text>
              <View style={styles.chipRow}>
                <PillToggle
                  label="Yes"
                  active={supplyRdt}
                  onPress={() => setSupplyRdt(true)}
                  activeColor={palette.statusGood}
                />
                <PillToggle
                  label="No"
                  active={!supplyRdt}
                  onPress={() => setSupplyRdt(false)}
                  activeColor={palette.textTertiary}
                />
              </View>
            </GlassCard>
          )}

          {step === 4 && (
            <GlassCard intensity={36}>
              <Text style={styles.formTitle}>{MOCK_STEP4.title}</Text>
              <Text style={styles.fieldLabel}>Free text</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                placeholder={MOCK_STEP4.placeholder}
                placeholderTextColor={palette.textTertiary}
                value={notes}
                onChangeText={setNotes}
              />
              <View style={styles.doseBox}>
                <Text style={styles.microLabel}>Dosage preview (mock)</Text>
                <Text style={styles.doseLine}>
                  {MOCK_DOSAGE_PREVIEW.weightKg} kg · {MOCK_DOSAGE_PREVIEW.route}
                </Text>
                <Text style={styles.doseLine}>{MOCK_DOSAGE_PREVIEW.doseMg}</Text>
              </View>
            </GlassCard>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.footerBtn,
              pressFx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.footerBtnText}>{step < 4 ? 'Continue' : 'Save (mock)'}</Text>
            <Feather name="arrow-right" size={20} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  stepMeta: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  progressRow: { flexDirection: 'row', gap: 8 },
  progressPill: { flex: 1, height: 6, borderRadius: 3 },
  progressOn: { backgroundColor: palette.primary },
  progressOff: { backgroundColor: palette.borderLight },
  dashed: {
    height: 220,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: glass.stroke,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: glass.fill,
  },
  dashedTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.secondary },
  dashedHint: { fontFamily: fonts.regular, fontSize: 14, color: palette.textTertiary, textAlign: 'center', paddingHorizontal: 20 },
  previewWrap: { borderRadius: radii.lg, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: glass.stroke },
  previewImg: { width: '100%', height: 220, backgroundColor: palette.borderLight },
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
  degreeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  microLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  healTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.borderLight,
    overflow: 'hidden',
    marginTop: 4,
  },
  healFill: { height: '100%', borderRadius: 4 },
  metricLabel: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  metricPct: { fontFamily: fonts.semibold, fontSize: 13, color: palette.text },
  metricTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.borderLight,
    overflow: 'hidden',
  },
  metricFill: { height: '100%', borderRadius: 4 },
  clinicalPara: { fontFamily: fonts.regular, fontSize: 15, color: palette.text, lineHeight: 22 },
  compareBlock: {
    marginTop: 8,
    padding: 12,
    borderRadius: radii.sm,
    backgroundColor: `${palette.primary}12`,
  },
  compareText: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, lineHeight: 20, marginTop: 6 },
  formTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.secondary, marginBottom: 4 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 14, color: palette.textSecondary },
  painRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  painDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: glass.stroke,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.fill,
  },
  painDotText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  pillText: { fontFamily: fonts.medium, fontSize: 14, color: palette.textSecondary },
  yesNoRow: { flexDirection: 'row', gap: 12 },
  yesNoBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: glass.stroke,
    alignItems: 'center',
    backgroundColor: glass.fill,
  },
  yesNoText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.textSecondary },
  notesInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: glass.stroke,
    borderRadius: radii.md,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: palette.text,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  doseBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: `${palette.primary}0F`,
    gap: 4,
  },
  doseLine: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.padH,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: glass.strokeSoft,
    backgroundColor: 'rgba(248,250,252,0.88)',
  },
  footerBtn: {
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  footerBtnText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
});
