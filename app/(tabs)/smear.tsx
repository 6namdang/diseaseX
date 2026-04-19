import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CountUp } from '../../components/ui/CountUp';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { SettingsSheet } from '../../components/ui/SettingsSheet';
import {
  fonts,
  glass,
  gradients,
  hairline,
  palette,
  radii,
  shadow,
  signal,
  space,
  surface,
  type,
} from '../../constants/designTokens';
import { deleteSmear, insertSmear, listSmears } from '../../db/smearRepo';
import type { Smear, SmearBand } from '../../db/types';
import { useContentInsets } from '../../hooks/useContentInsets';
import { usePatient } from '../../hooks/usePatient';
import { T } from '../../i18n/T';
import {
  BAND_LABEL,
  MODEL_DISPLAY_NAME,
  SPECIES_LABEL,
  analyzeSmear,
  type SmearAnalysis,
} from '../../services/smearAnalyzer';

const BAND_COLOR: Record<SmearBand, string> = {
  negative: palette.statusGood,
  low: palette.primary,
  moderate: palette.statusMonitor,
  high: palette.statusAlert,
};

const BAND_SHADOW: Record<SmearBand, (typeof shadow)[keyof typeof shadow]> = {
  negative: shadow.auraGood,
  low: shadow.auraGood,
  moderate: shadow.auraMonitor,
  high: shadow.auraAlert,
};

const BAND_VIGNETTE: Record<SmearBand, readonly [string, string]> = {
  negative: gradients.vignetteGood,
  low: gradients.vignetteGood,
  moderate: gradients.vignetteMonitor,
  high: gradients.vignetteAlert,
};

/* ── Glow button — gradient fill + colored shadow halo ── */
function GlowButton({
  children,
  glowColor,
  onPress,
  disabled,
  gradient,
  outlined,
}: {
  children: React.ReactNode;
  glowColor: string;
  onPress: () => void;
  disabled?: boolean;
  /** Gradient stops for the button fill. If omitted uses solid color from style. */
  gradient?: readonly [string, string];
  outlined?: boolean;
}) {
  const fx = Platform.OS !== 'web';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flex: 1,
          borderRadius: radii.lg,
          overflow: 'visible' as const,
          // The glow — visible on iOS, elevation on Android
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: outlined ? 2 : 8,
        },
        disabled && { opacity: 0.7 },
        fx && pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            glowStyles.btnInner,
            outlined && glowStyles.btnOutlined,
          ]}
        >
          {children}
        </LinearGradient>
      ) : (
        <View
          style={[
            glowStyles.btnInner,
            outlined && glowStyles.btnOutlined,
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

const glowStyles = StyleSheet.create({
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  btnOutlined: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline.strong,
    backgroundColor: surface.base,
  },
});

/* ── Fade-in wrapper ── */
function FadeIn({ children, delay = 0, duration = 500 }: { children: React.ReactNode; delay?: number; duration?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function SmearScreen() {
  const db = useSQLiteContext();
  const insets = useContentInsets();
  const { patient, loading } = usePatient();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SmearAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Smear[]>([]);

  const onboarded = !!patient?.onboardingCompletedAt;

  const reload = useCallback(async () => {
    if (!onboarded) {
      setHistory([]);
      return;
    }
    try {
      const rows = await listSmears(db, 90);
      setHistory(rows);
    } catch (e) {
      console.warn('[smear] listSmears failed', e);
    }
  }, [db, onboarded]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const fx = Platform.OS !== 'web';

  const pickFromCamera = async () => {
    const r = await ImagePicker.requestCameraPermissionsAsync();
    if (!r.granted) {
      Alert.alert(
        'Camera blocked',
        'Enable camera access in your device settings to capture a smear.',
      );
      return;
    }
    if (fx) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setPhotoUri(res.assets[0].uri);
      setAnalysis(null);
    }
  };

  const pickFromLibrary = async () => {
    const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!r.granted) return;
    if (fx) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setPhotoUri(res.assets[0].uri);
      setAnalysis(null);
    }
  };

  const clearImage = () => {
    setPhotoUri(null);
    setAnalysis(null);
  };

  const runAnalysis = async () => {
    if (!photoUri) return;
    if (fx) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setAnalyzing(true);
      const res = await analyzeSmear(photoUri);
      setAnalysis(res);
    } catch (e) {
      Alert.alert('Analysis failed', String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const saveToRecord = async () => {
    if (!photoUri || !analysis) return;
    try {
      setSaving(true);
      await insertSmear(db, {
        photoUri,
        species: analysis.species,
        parasitemiaPct: analysis.parasitemiaPct,
        confidence: analysis.confidence,
        band: analysis.band,
        recommendation: analysis.recommendation,
        modelId: analysis.modelId,
        durationMs: analysis.durationMs,
      });
      await reload();
      if (fx) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhotoUri(null);
      setAnalysis(null);
    } catch (e) {
      Alert.alert('Could not save', String(e));
    } finally {
      setSaving(false);
    }
  };

  const removeFromHistory = (id: number) => {
    Alert.alert('Remove smear?', 'This deletes the saved analysis from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSmear(db, id);
            await reload();
          } catch (e) {
            Alert.alert('Could not remove', String(e));
          }
        },
      },
    ]);
  };

  // Dynamic backdrop glow color based on state
  const backdropGlow = analysis
    ? `rgba(255,85,119,0.07)` // red when result showing
    : photoUri
      ? `rgba(255,85,119,0.06)` // softer red when image loaded
      : `rgba(91,255,176,0.08)`; // green in ready state

  /* ── Loading ── */
  if (loading) {
    return (
      <ScreenBackdrop>
        <View style={[s.center, { paddingTop: insets.top + 80 }]}>
          <Text style={s.subtle}>
            <T>Loading…</T>
          </Text>
        </View>
      </ScreenBackdrop>
    );
  }

  /* ── Not onboarded ── */
  if (!onboarded) {
    return (
      <ScreenBackdrop>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: space.padH,
            gap: space.gap,
          }}
        >
          <Text style={s.headerCaps}>
            <T>Blood smear analysis</T>
          </Text>
          <Text style={s.headerTitle}>
            <T>Microscopy</T>
          </Text>
          <GlassCard>
            <View style={s.row}>
              <Feather name="user-plus" size={20} color={palette.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>
                  <T>Finish onboarding first</T>
                </Text>
                <Text style={s.cardSub}>
                  <T>Complete the welcome flow so smears are linked to your profile.</T>
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <GlowButton
                glowColor={signal.base}
                onPress={() => router.push('/welcome')}
                gradient={['#5BFFB0', '#34E89E']}
              >
                <Text style={s.primaryBtnText}>
                  <T>Go to onboarding</T>
                </Text>
              </GlowButton>
            </View>
          </GlassCard>
        </ScrollView>
      </ScreenBackdrop>
    );
  }

  /* ── Main screen ── */
  const slideNum = String(history.length + 1).padStart(3, '0');

  return (
    <ScreenBackdrop glowColor={backdropGlow}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: space.padH,
          gap: space.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <FadeIn delay={0} duration={400}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerCaps}>
                <T>Blood smear</T>
                {' · '}
                {patient?.name ? patient.name.split(' ')[0].toUpperCase() : 'P1'}
              </Text>
              <Text style={s.headerTitle}>
                <T>Microscopy</T>
              </Text>
            </View>
            <SettingsSheet tint="dark" />
          </View>
        </FadeIn>

        {/* ── Empty state: ready to capture ── */}
        {!photoUri && !analysis && (
          <FadeIn delay={100} duration={500}>
            <GlassCard style={s.readyCardGlow}>
              <View style={s.readyWrap}>
                <ReadyIndicator />
                <Text style={s.readyLabel}>
                  <T>READY</T>
                </Text>
                <Text style={s.readySub}>
                  <T>Tap to load slide</T>
                </Text>
              </View>
              <View style={s.captureRow}>
                <GlowButton
                  glowColor={signal.base}
                  onPress={pickFromCamera}
                  gradient={['#5BFFB0', '#34E89E']}
                >
                  <Feather name="camera" size={18} color={signal.ink} />
                  <Text style={s.primaryBtnText}>
                    <T>Take photo</T>
                  </Text>
                </GlowButton>
                <GlowButton
                  glowColor="rgba(160,164,171,0.2)"
                  onPress={pickFromLibrary}
                  outlined
                >
                  <Feather name="image" size={18} color={palette.textSecondary} />
                  <Text style={s.secondaryBtnText}>
                    <T>Pick image</T>
                  </Text>
                </GlowButton>
              </View>
            </GlassCard>
          </FadeIn>
        )}

        {/* ── Photo loaded, awaiting analysis ── */}
        {photoUri && !analysis && (
          <FadeIn delay={0} duration={400}>
            <View style={{ gap: space.gap }}>
              {/* Red glow behind image when loaded */}
              <View style={s.imageCard}>
                <View style={s.imageRedGlow} pointerEvents="none" />
                <Image source={{ uri: photoUri }} style={s.image} resizeMode="cover" />
                <LinearGradient
                  colors={[...gradients.imageScrim]}
                  style={s.imageScrim}
                  pointerEvents="none"
                />
                <View style={s.imageMeta}>
                  <Text style={s.imageMetaText}>
                    1000× · GIEMSA · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              <View style={s.imageActions}>
                <Pressable
                  onPress={pickFromCamera}
                  style={({ pressed }) => [s.ghostBtn, fx && pressed && { opacity: 0.85 }]}
                >
                  <Feather name="refresh-ccw" size={14} color={palette.primary} />
                  <Text style={s.ghostBtnText}>
                    <T>Retake</T>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={pickFromLibrary}
                  style={({ pressed }) => [s.ghostBtn, fx && pressed && { opacity: 0.85 }]}
                >
                  <Feather name="image" size={14} color={palette.primary} />
                  <Text style={s.ghostBtnText}>
                    <T>Replace</T>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={clearImage}
                  style={({ pressed }) => [s.ghostBtn, fx && pressed && { opacity: 0.85 }]}
                >
                  <Feather name="x" size={14} color={palette.statusAlert} />
                  <Text style={[s.ghostBtnText, { color: palette.statusAlert }]}>
                    <T>Clear</T>
                  </Text>
                </Pressable>
              </View>

              <GlowButton
                glowColor={analyzing ? palette.statusMonitor : signal.base}
                onPress={runAnalysis}
                disabled={analyzing}
                gradient={analyzing ? ['#FFD15B', '#F59E0B'] : ['#5BFFB0', '#34E89E']}
              >
                <Feather name={analyzing ? 'loader' : 'cpu'} size={18} color={signal.ink} />
                <Text style={s.primaryBtnText}>
                  <T>{analyzing ? 'Running model…' : 'Analyze smear'}</T>
                </Text>
              </GlowButton>
            </View>
          </FadeIn>
        )}

        {/* ── Result hero ── */}
        {analysis && photoUri && (
          <FadeIn delay={0} duration={600}>
            <ResultHero
              analysis={analysis}
              photoUri={photoUri}
              slideNum={slideNum}
              patientName={patient?.name ?? null}
              saving={saving}
              onSave={saveToRecord}
              onDiscard={() => setAnalysis(null)}
            />
          </FadeIn>
        )}

        {/* ── History ── */}
        <FadeIn delay={200} duration={400}>
          <View style={s.section}>
            <Text style={s.sectionCaps}>
              <T>Recent smears</T>
            </Text>
            {history.length === 0 ? (
              <GlassCard>
                <View style={s.emptyHistory}>
                  <Feather name="clock" size={18} color={palette.textTertiary} />
                  <Text style={s.cardSub}>
                    <T>No saved smears yet. Analyze and save one to build a history.</T>
                  </Text>
                </View>
              </GlassCard>
            ) : (
              <View style={{ gap: 10 }}>
                {history.map((h, i) => (
                  <FadeIn key={h.id} delay={i * 80} duration={350}>
                    <HistoryRow smear={h} onRemove={() => removeFromHistory(h.id)} />
                  </FadeIn>
                ))}
              </View>
            )}
          </View>
        </FadeIn>
      </ScrollView>
    </ScreenBackdrop>
  );
}

/* ── Ready indicator with pulsing ring + green glow ── */
function ReadyIndicator() {
  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();

    // Slow breathing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={s.readyIconWrap}>
      {/* Large ambient glow behind the icon */}
      <Animated.View
        style={[s.readyAmbientGlow, { opacity: glowOpacity }]}
      />
      {/* Pulsing ring */}
      <Animated.View
        style={[s.readyPulseRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />
      {/* Second ring offset */}
      <Animated.View
        style={[
          s.readyPulseRing,
          {
            transform: [{ scale: Animated.add(ringScale, 0.15) }],
            opacity: Animated.multiply(ringOpacity, 0.4),
          },
        ]}
      />
      <View style={s.readyIconCircle}>
        <Feather name="aperture" size={28} color={signal.base} />
      </View>
    </View>
  );
}

/* ── Result hero card ── */
function ResultHero({
  analysis,
  photoUri,
  slideNum,
  patientName,
  saving,
  onSave,
  onDiscard,
}: {
  analysis: SmearAnalysis;
  photoUri: string;
  slideNum: string;
  patientName: string | null;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const color = BAND_COLOR[analysis.band];
  const bandShadow = BAND_SHADOW[analysis.band];
  const vignette = BAND_VIGNETTE[analysis.band];
  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ gap: space.gap }}>
      {/* Status vignette at top */}
      <LinearGradient
        colors={[...vignette]}
        style={s.vignetteStrip}
        pointerEvents="none"
      />

      {/* Smear image with red ambient glow */}
      <View style={[s.imageCard, { shadowColor: '#FF5577', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } }]}>
        <Image source={{ uri: photoUri }} style={s.image} resizeMode="cover" />
        <LinearGradient
          colors={[...gradients.imageScrim]}
          style={s.imageScrim}
          pointerEvents="none"
        />
        <View style={s.imageMeta}>
          <Text style={s.imageMetaText}>
            1000× · GIEMSA · {ts}
          </Text>
        </View>
      </View>

      {/* Result readout */}
      <GlassCard style={bandShadow}>
        {/* Colored accent line at top of card */}
        <View style={[s.cardAccentLine, { backgroundColor: color }]} />

        {/* Slide header */}
        <View style={s.slideRow}>
          <Text style={s.slideCaps}>
            SLIDE {slideNum}
            {patientName ? ` · ${patientName.toUpperCase()}` : ''}
          </Text>
          <Text style={s.slideTime}>{ts}</Text>
        </View>

        <View style={[s.hairline, { marginVertical: 12 }]} />

        {/* Species badge with glow dot */}
        <View style={[s.speciesBadge, { borderColor: `${color}55` }]}>
          <View style={[s.speciesDot, { backgroundColor: color, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }]} />
          <Text style={[s.speciesText, { color }]}>
            <T>{SPECIES_LABEL[analysis.species]}</T>
          </Text>
        </View>

        {/* Giant parasitemia number */}
        <View style={s.heroNumWrap}>
          <CountUp
            to={analysis.parasitemiaPct}
            decimals={2}
            duration={900}
            style={[s.heroNum, { color }]}
          />
          <Text style={[s.heroUnit, { color }]}>%</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statCaps}>
              <T>Confidence</T>
            </Text>
            <Text style={[s.statVal, { color: palette.primary }]}>
              {Math.round(analysis.confidence * 100)}%
            </Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statCaps}>
              <T>Band</T>
            </Text>
            <Text style={[s.statVal, { color }]}>
              <T>{BAND_LABEL[analysis.band]}</T>
            </Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statCaps}>
              <T>Time</T>
            </Text>
            <Text style={s.statVal}>
              {(analysis.durationMs / 1000).toFixed(1)}s
            </Text>
          </View>
        </View>

        <View style={[s.hairline, { marginVertical: 12 }]} />

        {/* Recommendation */}
        <View style={s.recBox}>
          <Text style={s.recCaps}>
            <T>Suggested next step</T>
          </Text>
          <Text style={s.recText}>
            <T>{analysis.recommendation}</T>
          </Text>
        </View>

        <Text style={s.modelStamp}>
          <T>Model</T>: {analysis.modelId}
        </Text>

        {/* Actions */}
        <View style={s.actionsRow}>
          <GlowButton
            glowColor="rgba(160,164,171,0.15)"
            onPress={onDiscard}
            outlined
          >
            <Feather name="trash-2" size={16} color={palette.textSecondary} />
            <Text style={s.secondaryBtnText}>
              <T>Discard</T>
            </Text>
          </GlowButton>
          <GlowButton
            glowColor={signal.base}
            onPress={onSave}
            disabled={saving}
            gradient={['#5BFFB0', '#34E89E']}
          >
            <Feather name="save" size={16} color={signal.ink} />
            <Text style={s.primaryBtnText}>
              <T>{saving ? 'Saving…' : 'Save to record'}</T>
            </Text>
          </GlowButton>
        </View>
      </GlassCard>
    </View>
  );
}

/* ── History row ── */
function HistoryRow({ smear, onRemove }: { smear: Smear; onRemove: () => void }) {
  const color = BAND_COLOR[smear.band];
  return (
    <GlassCard>
      <View style={s.historyRow}>
        <View style={s.historyThumbWrap}>
          <Image source={{ uri: smear.photoUri }} style={s.historyThumb} resizeMode="cover" />
          <View style={[s.bandTag, { backgroundColor: color }]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.historySpecies, { color }]}>
            <T>{SPECIES_LABEL[smear.species]}</T>
          </Text>
          <Text style={s.historyMeta}>
            {smear.parasitemiaPct.toFixed(2)}% · <T>{BAND_LABEL[smear.band]}</T>
          </Text>
          <Text style={s.historyDate}>
            {new Date(smear.createdAt).toLocaleString()} · {Math.round(smear.confidence * 100)}%{' '}
            <T>conf.</T>
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Remove smear"
        >
          <Feather name="trash-2" size={16} color={palette.statusAlert} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtle: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCaps: {
    ...type.caps,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: palette.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },

  /* Cards */
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.text },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  /* Ready state */
  readyCardGlow: {
    shadowColor: signal.base,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 6,
  },
  readyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  readyIconWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyAmbientGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(91,255,176,0.15)',
  },
  readyPulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: signal.base,
  },
  readyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: surface.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,255,176,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    // Green inner glow
    shadowColor: signal.base,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  readyLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 2,
    color: signal.base,
    textTransform: 'uppercase',
  },
  readySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textTertiary,
  },

  /* Capture buttons */
  captureRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primaryBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: signal.ink },
  secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.textSecondary },

  /* Image */
  imageCard: {
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.stroke,
    backgroundColor: '#000',
  },
  imageRedGlow: {
    position: 'absolute',
    top: -40,
    left: '15%',
    width: '70%',
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,85,119,0.12)',
    zIndex: -1,
  },
  image: { width: '100%', height: 260 },
  imageScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  imageMeta: {
    position: 'absolute',
    bottom: 12,
    left: 14,
  },
  imageMetaText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  imageActions: { flexDirection: 'row', gap: 8 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline.default,
    backgroundColor: surface.base,
  },
  ghostBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: palette.primary },

  /* Vignette strip */
  vignetteStrip: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: -space.gap + 4,
  },

  /* Card accent line */
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 1,
  },

  /* Result readout */
  slideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  slideCaps: {
    ...type.caps,
    color: palette.textTertiary,
  },
  slideTime: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: hairline.thin,
  },
  speciesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 8,
    marginBottom: 4,
  },
  speciesDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  speciesText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* Hero number */
  heroNumWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  heroNum: {
    fontFamily: fonts.bold,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2,
  },
  heroUnit: {
    fontFamily: fonts.medium,
    fontSize: 24,
    letterSpacing: -0.5,
    marginLeft: 2,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    gap: 2,
  },
  statCaps: {
    ...type.caps,
    fontSize: 10,
  },
  statVal: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: palette.text,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: hairline.thin,
    marginHorizontal: 8,
  },

  /* Recommendation */
  recBox: {
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: surface.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hairline.thin,
    marginBottom: 10,
    gap: 6,
  },
  recCaps: {
    ...type.caps,
    fontSize: 10,
  },
  recText: { fontFamily: fonts.regular, fontSize: 14, color: palette.text, lineHeight: 20 },
  modelStamp: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.textTertiary,
    marginBottom: 10,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },

  /* Section */
  section: { gap: 10 },
  sectionCaps: {
    ...type.caps,
    marginBottom: 4,
  },

  /* History */
  emptyHistory: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  historyThumb: { width: '100%', height: '100%' },
  bandTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  historySpecies: { fontFamily: fonts.semibold, fontSize: 14 },
  historyMeta: { fontFamily: fonts.medium, fontSize: 13, color: palette.text },
  historyDate: { fontFamily: fonts.regular, fontSize: 11, color: palette.textTertiary },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${palette.statusAlert}15`,
    // Red glow on delete
    shadowColor: palette.statusAlert,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
});
