import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import { useContentInsets } from '../../hooks/useContentInsets';
import { analyzeSmear, analyzeStage, type SmearResult, type StageResult } from '../../services/vision';

// ============================================================================
// Smear tab — Blood smear AI confirmation
// ----------------------------------------------------------------------------
// MobileNetV2 fine-tuned on NIH Malaria Cell Images (27,558 cells)
// 92.14% validation accuracy. Stage analysis via Claude Vision.
// ============================================================================
export default function SmearScreen() {
  const insets = useContentInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SmearResult | null>(null);
  const [stage, setStage] = useState<StageResult | null>(null);
  const [stageLoading, setStageLoading] = useState(false);

  const pressFx = Platform.OS !== 'web';

  const pickImage = async () => {
    const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!r.granted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      setStage(null);
    }
  };

  const runAnalysis = async () => {
    if (!imageUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalyzing(true);
    const res = await analyzeSmear(imageUri);
    setResult(res);
    setAnalyzing(false);

    if (!res.error && res.verdict === 'parasitized') {
      setStageLoading(true);
      const s = await analyzeStage(imageUri);
      setStage(s);
      setStageLoading(false);
    }
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImageUri(null);
    setResult(null);
    setStage(null);
  };

  const isParasitized = result?.verdict === 'parasitized';
  const verdictColor = isParasitized ? palette.statusAlert : palette.statusGood;

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: space.padH,
          gap: space.gap,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.microLabel}>Vision AI · mock demo</Text>
          <Text style={styles.title}>Blood smear</Text>
          <Text style={styles.subtitle}>
            MobileNetV2 fine-tuned on 27,558 NIH-labeled cell images · 92% validation accuracy.
          </Text>
        </View>

        {/* Upload zone or preview */}
        {!imageUri ? (
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.dashed,
              pressFx && pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={styles.dashedIconWrap}>
              <Feather name="image" size={26} color={palette.primary} />
            </View>
            <Text style={styles.dashedTitle}>Select smear image</Text>
            <Text style={styles.dashedHint}>Thin blood smear · photo library</Text>
          </Pressable>
        ) : (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
            <Pressable
              onPress={reset}
              style={({ pressed }) => [
                styles.clearPhoto,
                pressFx && pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="x" size={18} color={palette.white} />
            </Pressable>
          </View>
        )}

        {/* Analyze button (only when we have an image and no result yet) */}
        {imageUri && !result && (
          <Pressable
            onPress={runAnalysis}
            disabled={analyzing}
            style={({ pressed }) => [
              styles.primaryAction,
              pressFx && pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              analyzing && { opacity: 0.7 },
            ]}
          >
            {analyzing ? (
              <>
                <ActivityIndicator color={palette.white} />
                <Text style={styles.primaryActionText}>Analyzing…</Text>
              </>
            ) : (
              <>
                <Feather name="zap" size={20} color={palette.white} />
                <Text style={styles.primaryActionText}>Analyze smear</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Result card */}
        {result && !result.error && (
          <GlassCard
            intensity={34}
            contentStyle={{
              backgroundColor: `${verdictColor}12`,
              borderColor: `${verdictColor}38`,
              borderWidth: 1,
              borderRadius: radii.lg,
            }}
          >
            <View style={styles.resultHeaderRow}>
              <View style={[styles.verdictBadge, { backgroundColor: `${verdictColor}22` }]}>
                <Feather
                  name={isParasitized ? 'alert-circle' : 'check-circle'}
                  size={14}
                  color={verdictColor}
                />
                <Text style={[styles.verdictBadgeText, { color: verdictColor }]}>
                  {isParasitized ? 'PARASITIZED' : 'UNINFECTED'}
                </Text>
              </View>
            </View>

            <Text style={[styles.resultNumber, { color: verdictColor }]}>
              {result.confidencePercent}%
            </Text>
            <Text style={styles.resultCaption}>Model confidence</Text>

            {/* Probability breakdown */}
            <View style={styles.probBlock}>
              <Text style={styles.microLabel}>Probability breakdown</Text>
              <View style={styles.probRow}>
                <Text style={styles.probLabel}>Parasitized</Text>
                <View style={styles.probTrack}>
                  <View
                    style={[
                      styles.probFill,
                      {
                        width: `${Math.round((result.parasitized ?? 0) * 100)}%`,
                        backgroundColor: palette.statusAlert,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.probPct}>
                  {Math.round((result.parasitized ?? 0) * 100)}%
                </Text>
              </View>
              <View style={styles.probRow}>
                <Text style={styles.probLabel}>Uninfected</Text>
                <View style={styles.probTrack}>
                  <View
                    style={[
                      styles.probFill,
                      {
                        width: `${Math.round((result.uninfected ?? 0) * 100)}%`,
                        backgroundColor: palette.statusGood,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.probPct}>
                  {Math.round((result.uninfected ?? 0) * 100)}%
                </Text>
              </View>
            </View>

            <Text style={styles.metaLine}>
              MobileNetV2 · 92.14% val. accuracy · NIH Malaria dataset
            </Text>
          </GlassCard>
        )}

        {/* Stage analysis card (only when parasitized) */}
        {isParasitized && (
          <GlassCard intensity={36}>
            <View style={styles.stageHeaderRow}>
              <View style={styles.stageIconWrap}>
                <Feather name="cpu" size={14} color={palette.primary} />
              </View>
              <Text style={styles.stageHeaderText}>Developmental stage</Text>
              {stageLoading && (
                <ActivityIndicator
                  size="small"
                  color={palette.primary}
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </View>

            {stageLoading ? (
              <Text style={styles.stageBody}>Identifying parasite stage with Claude Vision…</Text>
            ) : stage?.stage && stage.stage !== 'unknown' ? (
              <>
                <Text style={styles.stageName}>{stage.stage}</Text>
                {stage.reasoning ? (
                  <Text style={styles.stageBody}>{stage.reasoning}</Text>
                ) : null}
                <View style={styles.stageDivider} />
                <Text style={styles.stageFootnote}>
                  Visual analysis by Claude — mock demo, not a validated classifier.
                </Text>
              </>
            ) : (
              <Text style={styles.stageBody}>
                Stage analysis unavailable.{stage?.error ? ` (${stage.error})` : ''}
              </Text>
            )}
          </GlassCard>
        )}

        {/* Reset button (when we have a result) */}
        {result && (
          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.glassBtn,
              pressFx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Feather name="refresh-cw" size={18} color={palette.primary} />
            <Text style={styles.glassBtnText}>New scan</Text>
          </Pressable>
        )}

        {/* Error card */}
        {result?.error && (
          <GlassCard
            intensity={32}
            contentStyle={{
              backgroundColor: `${palette.statusMonitor}18`,
              borderColor: `${palette.statusMonitor}44`,
              borderWidth: 1,
              borderRadius: radii.lg,
            }}
          >
            <View style={styles.errorRow}>
              <Feather name="cloud-off" size={18} color={palette.statusMonitor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Model unreachable</Text>
                <Text style={styles.errorBody}>{result.error}</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Info card — only when nothing's happened yet */}
        {!result && (
          <GlassCard intensity={32}>
            <Text style={styles.microLabel}>About this model</Text>
            <Text style={styles.infoBody}>
              Two-class classification (parasitized vs uninfected) on thin blood
              smear images. Trained on 27,558 cells from the NIH Malaria dataset.
              For parasitized images, Claude Vision identifies the Plasmodium
              developmental stage.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },

  header: { gap: 4 },
  microLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.bold, fontSize: 26, color: palette.secondary },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
  },

  dashed: {
    minHeight: 220,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: glass.stroke,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: glass.fill,
    paddingVertical: 28,
  },
  dashedIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${palette.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${palette.primary}26`,
  },
  dashedTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.secondary },
  dashedHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textTertiary,
    textAlign: 'center',
  },

  previewWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: glass.stroke,
  },
  previewImg: { width: '100%', height: 240, backgroundColor: palette.borderLight },
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

  primaryAction: {
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
  primaryActionText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },

  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  glassBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },

  resultHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verdictBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  resultNumber: {
    fontFamily: fonts.bold,
    fontSize: 48,
    lineHeight: 54,
    marginTop: 8,
  },
  resultCaption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },

  probBlock: { marginTop: 14, gap: 10 },
  probRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  probLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.textSecondary,
    width: 84,
  },
  probTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.borderLight,
    overflow: 'hidden',
  },
  probFill: { height: '100%', borderRadius: 4 },
  probPct: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.text,
    minWidth: 40,
    textAlign: 'right',
  },

  metaLine: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: 14,
  },

  stageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stageIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${palette.primary}16`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageHeaderText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  stageName: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: palette.secondary,
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  stageBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.text,
    lineHeight: 20,
  },
  stageDivider: {
    height: 1,
    backgroundColor: glass.strokeSoft,
    marginVertical: 12,
  },
  stageFootnote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.textTertiary,
    fontStyle: 'italic',
  },

  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  errorTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: palette.statusMonitor,
  },
  errorBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },

  infoBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
});
