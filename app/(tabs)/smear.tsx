import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { SettingsSheet } from '../../components/ui/SettingsSheet';
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import {
  deleteSmear,
  listSmears,
  saveSmear,
  type Smear,
  type SmearBand,
} from '../../db/smears';
import { useContentInsets } from '../../hooks/useContentInsets';
import { T } from '../../i18n/T';
import {
  BAND_LABEL,
  MODEL_DISPLAY_NAME,
  SPECIES_LABEL,
  analyzeSmear,
  type SmearAnalysis,
} from '../../services/smearAnalyzer';
import { usePatient } from '../../state/PatientContext';

const BAND_COLOR: Record<SmearBand, string> = {
  negative: palette.statusGood,
  low: palette.primary,
  moderate: palette.statusMonitor,
  high: palette.statusAlert,
};

const BAND_ICON: Record<SmearBand, 'check-circle' | 'eye' | 'alert-circle' | 'alert-triangle'> = {
  negative: 'check-circle',
  low: 'eye',
  moderate: 'alert-circle',
  high: 'alert-triangle',
};

export default function SmearScreen() {
  const insets = useContentInsets();
  const { active: patient, ready } = usePatient();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SmearAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Smear[]>([]);

  const reload = useCallback(async () => {
    if (!patient) {
      setHistory([]);
      return;
    }
    try {
      const rows = await listSmears(patient.id);
      setHistory(rows);
    } catch (e) {
      console.warn('[smear] listSmears failed', e);
    }
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const fx = Platform.OS !== 'web';

  const pickFromCamera = async () => {
    const r = await ImagePicker.requestCameraPermissionsAsync();
    if (!r.granted) {
      Alert.alert('Camera blocked', 'Enable camera access in your device settings to capture a smear.');
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
    if (!patient || !photoUri || !analysis) return;
    try {
      setSaving(true);
      await saveSmear({
        patientId: patient.id,
        photoUri,
        species: analysis.species,
        parasitemiaPct: analysis.parasitemiaPct,
        confidence: analysis.confidence,
        band: analysis.band,
        recommendation: analysis.recommendation,
        modelId: analysis.modelId,
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

  const removeFromHistory = (id: string) => {
    Alert.alert('Remove smear?', 'This deletes the saved analysis from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSmear(id);
            await reload();
          } catch (e) {
            Alert.alert('Could not remove', String(e));
          }
        },
      },
    ]);
  };

  if (!ready) {
    return (
      <ScreenBackdrop>
        <View style={[styles.center, { paddingTop: insets.top + 80 }]}>
          <Text style={styles.subtle}>
            <T>Loading…</T>
          </Text>
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: space.padH,
          gap: space.gap,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerMicro}>
              <T>Blood smear analysis</T>
            </Text>
            <Text style={styles.headerTitle}>
              {patient ? (
                <>
                  {patient.caseId} · <T>{patient.label}</T>
                </>
              ) : (
                <T>No patient selected</T>
              )}
            </Text>
          </View>
          <SettingsSheet />
        </View>

        {!patient && (
          <GlassCard intensity={32} contentStyle={{ backgroundColor: `${palette.primary}10` }}>
            <View style={styles.row}>
              <Feather name="user-plus" size={20} color={palette.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  <T>Add a patient first</T>
                </Text>
                <Text style={styles.cardSub}>
                  <T>Open settings (top right) to create a patient before running a smear.</T>
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {patient && (
          <>
            <GlassCard intensity={34}>
              <View style={styles.modelRow}>
                <Feather name="cpu" size={16} color={palette.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modelTitle}>
                    <T>{MODEL_DISPLAY_NAME}</T>
                  </Text>
                  <Text style={styles.modelSub}>
                    <T>Runs fully on this device — no images leave the phone.</T>
                  </Text>
                </View>
              </View>
            </GlassCard>

            {!photoUri && (
              <GlassCard intensity={34}>
                <Text style={styles.cardTitle}>
                  <T>Capture or pick a smear image</T>
                </Text>
                <Text style={styles.cardSub}>
                  <T>
                    Use a microscope eyepiece adapter or photograph a clean Giemsa-stained slide under
                    1000× oil immersion.
                  </T>
                </Text>
                <View style={styles.captureRow}>
                  <Pressable
                    onPress={pickFromCamera}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      fx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Feather name="camera" size={18} color={palette.white} />
                    <Text style={styles.primaryBtnText}>
                      <T>Take photo</T>
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={pickFromLibrary}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      fx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Feather name="image" size={18} color={palette.primary} />
                    <Text style={styles.secondaryBtnText}>
                      <T>Pick image</T>
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            )}

            {photoUri && (
              <GlassCard intensity={34}>
                <Text style={styles.cardTitle}>
                  <T>Smear image</T>
                </Text>
                <View style={styles.imageWrap}>
                  <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
                </View>
                <View style={styles.imageActions}>
                  <Pressable
                    onPress={pickFromCamera}
                    style={({ pressed }) => [
                      styles.ghostBtn,
                      fx && pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather name="refresh-ccw" size={14} color={palette.primary} />
                    <Text style={styles.ghostBtnText}>
                      <T>Retake</T>
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={pickFromLibrary}
                    style={({ pressed }) => [
                      styles.ghostBtn,
                      fx && pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather name="image" size={14} color={palette.primary} />
                    <Text style={styles.ghostBtnText}>
                      <T>Replace</T>
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={clearImage}
                    style={({ pressed }) => [
                      styles.ghostBtn,
                      fx && pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather name="x" size={14} color={palette.statusAlert} />
                    <Text style={[styles.ghostBtnText, { color: palette.statusAlert }]}>
                      <T>Clear</T>
                    </Text>
                  </Pressable>
                </View>

                {!analysis && (
                  <Pressable
                    disabled={analyzing}
                    onPress={runAnalysis}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { marginTop: 14 },
                      analyzing && { opacity: 0.7 },
                      fx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Feather name={analyzing ? 'loader' : 'cpu'} size={18} color={palette.white} />
                    <Text style={styles.primaryBtnText}>
                      <T>{analyzing ? 'Running model…' : 'Analyze smear'}</T>
                    </Text>
                  </Pressable>
                )}
              </GlassCard>
            )}

            {analysis && (
              <ResultCard
                analysis={analysis}
                saving={saving}
                onSave={saveToRecord}
                onDiscard={() => setAnalysis(null)}
              />
            )}

            <View style={styles.section}>
              <Text style={styles.cardTitle}>
                <T>Recent smears for this patient</T>
              </Text>
              {history.length === 0 ? (
                <GlassCard intensity={34}>
                  <View style={styles.emptyHistory}>
                    <Feather name="clock" size={18} color={palette.textTertiary} />
                    <Text style={styles.cardSub}>
                      <T>No saved smears yet. Analyze and save one to build a history.</T>
                    </Text>
                  </View>
                </GlassCard>
              ) : (
                <View style={{ gap: 10 }}>
                  {history.map((s) => (
                    <HistoryRow key={s.id} smear={s} onRemove={() => removeFromHistory(s.id)} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBackdrop>
  );
}

function ResultCard({
  analysis,
  saving,
  onSave,
  onDiscard,
}: {
  analysis: SmearAnalysis;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const color = BAND_COLOR[analysis.band];
  const fx = Platform.OS !== 'web';
  return (
    <GlassCard intensity={36} contentStyle={{ backgroundColor: `${color}10` }}>
      <View style={styles.resultHeader}>
        <Feather name={BAND_ICON[analysis.band]} size={26} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultBand, { color }]}>
            <T>{BAND_LABEL[analysis.band]}</T>
          </Text>
          <Text style={styles.resultSpecies}>
            <T>{SPECIES_LABEL[analysis.species]}</T>
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Parasitemia" value={`${analysis.parasitemiaPct.toFixed(2)}%`} color={color} />
        <Stat label="Model confidence" value={`${Math.round(analysis.confidence * 100)}%`} color={palette.primary} />
        <Stat label="Inference time" value={`${(analysis.durationMs / 1000).toFixed(1)}s`} color={palette.textSecondary} />
      </View>

      <View style={styles.recBox}>
        <Text style={styles.micro}>
          <T>Suggested next step</T>
        </Text>
        <Text style={styles.recText}>
          <T>{analysis.recommendation}</T>
        </Text>
      </View>

      <Text style={styles.modelStamp}>
        <T>Model</T>: {analysis.modelId}
      </Text>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onDiscard}
          style={({ pressed }) => [styles.secondaryBtn, fx && pressed && { opacity: 0.85 }]}
        >
          <Feather name="trash-2" size={16} color={palette.textSecondary} />
          <Text style={styles.secondaryBtnText}>
            <T>Discard</T>
          </Text>
        </Pressable>
        <Pressable
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => [
            styles.primaryBtn,
            saving && { opacity: 0.7 },
            fx && pressed && { opacity: 0.9 },
          ]}
        >
          <Feather name="save" size={16} color={palette.white} />
          <Text style={styles.primaryBtnText}>
            <T>{saving ? 'Saving…' : 'Save to record'}</T>
          </Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLbl, { color }]}>
        <T>{label}</T>
      </Text>
    </View>
  );
}

function HistoryRow({ smear, onRemove }: { smear: Smear; onRemove: () => void }) {
  const color = BAND_COLOR[smear.band];
  return (
    <GlassCard intensity={34}>
      <View style={styles.historyRow}>
        <View style={styles.historyThumbWrap}>
          <Image source={{ uri: smear.photoUri }} style={styles.historyThumb} resizeMode="cover" />
          <View style={[styles.bandTag, { backgroundColor: color }]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.historySpecies, { color }]}>
            <T>{SPECIES_LABEL[smear.species]}</T>
          </Text>
          <Text style={styles.historyMeta}>
            {smear.parasitemiaPct.toFixed(2)}% · <T>{BAND_LABEL[smear.band]}</T>
          </Text>
          <Text style={styles.historyDate}>
            {new Date(smear.createdAt).toLocaleString()} · {Math.round(smear.confidence * 100)}%{' '}
            <T>conf.</T>
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Remove smear"
        >
          <Feather name="trash-2" size={16} color={palette.statusAlert} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtle: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerMicro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: palette.secondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.secondary },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  modelTitle: { fontFamily: fonts.semibold, fontSize: 14, color: palette.secondary },
  modelSub: { fontFamily: fonts.regular, fontSize: 12, color: palette.textTertiary, marginTop: 2 },
  captureRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: palette.primary,
  },
  primaryBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.white },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.primary },
  imageWrap: {
    marginTop: 12,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: '#000',
  },
  image: { width: '100%', height: 240 },
  imageActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  ghostBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: palette.primary },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  resultBand: { fontFamily: fonts.bold, fontSize: 18 },
  resultSpecies: { fontFamily: fonts.medium, fontSize: 14, color: palette.textSecondary, marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: glass.stroke,
    alignItems: 'flex-start',
  },
  statValue: { fontFamily: fonts.bold, fontSize: 16, color: palette.secondary },
  statLbl: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  recBox: {
    padding: 12,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: glass.stroke,
    marginBottom: 10,
  },
  micro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  recText: { fontFamily: fonts.regular, fontSize: 14, color: palette.text, lineHeight: 20 },
  modelStamp: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.textTertiary,
    marginBottom: 10,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  section: { gap: 10 },
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
    height: 4,
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
    backgroundColor: `${palette.statusAlert}10`,
  },
});
