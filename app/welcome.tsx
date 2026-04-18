import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/ui/GlassCard';
import { ScreenBackdrop } from '../components/ui/ScreenBackdrop';
import { ONBOARDING_KEY } from '../constants/appStorage';
import { fonts, palette, radii, shadow, space } from '../constants/designTokens';
import { MOCK_WELCOME_FEATURES } from '../data/mockClinical';
import { useContentInsets } from '../hooks/useContentInsets';

export default function WelcomeScreen() {
  const insets = useContentInsets();

  async function finish() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  }

  const pressFx = Platform.OS !== 'web';

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 28,
            paddingBottom: insets.bottom + 36,
            paddingHorizontal: space.padH,
            gap: 26,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBlock}>
          <LinearGradient
            colors={[palette.primary, palette.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoWrap}
          >
            <Feather name="aperture" size={40} color={palette.white} />
          </LinearGradient>
          <Text style={styles.appName}>DiseaseX</Text>
          <Text style={styles.tagline}>Triage & protocol engine — rule out the known, treat the urgent.</Text>
        </View>

        <View style={styles.midBlock}>
          {MOCK_WELCOME_FEATURES.map((f) => (
            <GlassCard key={f.title} intensity={40}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={f.icon} size={22} color={palette.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>

        <View style={styles.bottomBlock}>
          <Text style={styles.disclaimer}>
            Mock build: supports training flows only. Clinical decisions remain with licensed providers and national
            guidelines.
          </Text>
          <Pressable
            onPress={finish}
            style={({ pressed }) => [
              styles.cta,
              pressFx && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaText}>Enter field desk</Text>
            <Feather name="arrow-right" size={20} color={palette.white} />
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, justifyContent: 'space-between' },
  topBlock: { alignItems: 'center', gap: 12 },
  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.logo,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: palette.secondary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  midBlock: { gap: 12 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(13,148,136,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.secondary },
  featureDesc: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, lineHeight: 20 },
  bottomBlock: { gap: 14 },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
  cta: {
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
  ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
});
