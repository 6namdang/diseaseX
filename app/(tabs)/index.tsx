import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { ONBOARDING_KEY } from '../../constants/appStorage';
import { T } from '../../i18n/T';
import { usePatient } from '../../state/PatientContext';
import {
  fonts,
  glass,
  healingTokens,
  palette,
  radii,
  space,
  type HealingStatus,
} from '../../constants/designTokens';
import {
  MOCK_AI_BRIEFING,
  MOCK_CHW,
  MOCK_DASHBOARD_TASKS,
  MOCK_OUTBREAK_ALERTS,
  MOCK_RULE_OUT_CARD,
} from '../../data/mockClinical';
import { useContentInsets } from '../../hooks/useContentInsets';

export default function HomeScreen() {
  const insets = useContentInsets();
  const { active: activePatient } = usePatient();
  const [status, setStatus] = useState<HealingStatus>('monitor');
  const [tasks, setTasks] = useState(() => MOCK_DASHBOARD_TASKS.map((t) => ({ ...t })));

  const token = healingTokens[status];
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const toggleTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign out', 'Return to welcome screen?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(ONBOARDING_KEY);
          router.replace('/welcome');
        },
      },
    ]);
  };

  const cycleStatus = () => {
    Haptics.selectionAsync();
    setStatus((s) => (s === 'good' ? 'monitor' : s === 'monitor' ? 'alert' : 'good'));
  };

  const statusIcon =
    status === 'good' ? 'shield' : status === 'monitor' ? 'eye' : 'alert-triangle';

  const pressOpacity = Platform.OS !== 'web';

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
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.dateTiny}>{dateStr.toUpperCase()}</Text>
            <Text style={styles.greeting}>Field desk · {MOCK_CHW.greetingName}</Text>
            <Text style={styles.subtitle}>{MOCK_CHW.postLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={cycleStatus}
              style={({ pressed }) => [
                styles.wkPill,
                pressOpacity && pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.wkPillText}>
                <T>Mock band</T>
              </Text>
            </Pressable>
            <SettingsSheet />
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressOpacity && pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
              ]}
              accessibilityLabel="Sign out"
            >
              <Feather name="log-out" size={18} color={palette.white} />
            </Pressable>
          </View>
        </View>

        <GlassCard intensity={32}>
          <View style={styles.patientRow}>
            <View
              style={[
                styles.patientDot,
                {
                  backgroundColor:
                    activePatient.status === 'good'
                      ? palette.statusGood
                      : activePatient.status === 'monitor'
                        ? palette.statusMonitor
                        : palette.statusAlert,
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.patientMicro}>
                <T>Monitoring patient</T>
              </Text>
              <Text style={styles.patientTitle}>
                {activePatient.caseId} · <T>{activePatient.label}</T>
              </Text>
            </View>
            <Feather name="user" size={18} color={palette.primary} />
          </View>
        </GlassCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <T>Outbreak signals (mock)</T>
          </Text>
          <View style={{ gap: 10 }}>
            {MOCK_OUTBREAK_ALERTS.map((a) => (
              <GlassCard key={a.id} intensity={36}>
                <View style={styles.alertRow}>
                  <View
                    style={[
                      styles.alertDot,
                      {
                        backgroundColor:
                          a.band === 'monitor' ? palette.statusMonitor : palette.statusGood,
                      },
                    ]}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.alertTitle}>
                      <T>{a.title}</T>
                    </Text>
                    <Text style={styles.alertDetail}>
                      <T>{a.detail}</T>
                    </Text>
                    <Text style={styles.alertMeta}>
                      <T>{a.meta}</T>
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={palette.textTertiary} />
                </View>
              </GlassCard>
            ))}
          </View>
        </View>

        <Pressable
          onPress={cycleStatus}
          style={({ pressed }) => [
            pressOpacity && pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          <GlassCard intensity={32} contentStyle={{ backgroundColor: token.bg }}>
            <View style={styles.statusInner}>
              <Feather
                name={statusIcon}
                size={24}
                color={
                  status === 'good'
                    ? palette.statusGood
                    : status === 'monitor'
                      ? palette.statusMonitor
                      : palette.statusAlert
                }
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.statusLabel}>
                  <T>{token.label}</T>
                </Text>
                <Text style={styles.statusMsg}>
                  <T>{token.message}</T>
                </Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>

        <GlassCard intensity={34}>
          <Text style={styles.micro}>
            <T>Probability stack (mock)</T>
          </Text>
          <View style={styles.stackRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.stackName}>
                <T>{MOCK_RULE_OUT_CARD.primary.name}</T>
              </Text>
              <View style={styles.stackTrack}>
                <View
                  style={[
                    styles.stackFill,
                    { width: `${MOCK_RULE_OUT_CARD.primary.pct}%`, backgroundColor: palette.statusAlert },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.stackPct}>{MOCK_RULE_OUT_CARD.primary.pct}%</Text>
          </View>
          <View style={styles.stackRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.stackName}>
                <T>{MOCK_RULE_OUT_CARD.secondary.name}</T>
              </Text>
              <View style={styles.stackTrack}>
                <View
                  style={[
                    styles.stackFill,
                    {
                      width: `${MOCK_RULE_OUT_CARD.secondary.pct}%`,
                      backgroundColor: palette.statusMonitor,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.stackPct}>{MOCK_RULE_OUT_CARD.secondary.pct}%</Text>
          </View>
          <Text style={styles.reasoning}>
            <T>{MOCK_RULE_OUT_CARD.reasoning}</T>
          </Text>
        </GlassCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <T>Shift tasks (mock)</T>
          </Text>
          <GlassCard intensity={38}>
            {tasks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => toggleTask(t.id)}
                style={({ pressed }) => [
                  styles.taskRow,
                  pressOpacity && pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.checkbox, t.done && styles.checkboxOn]}>
                  {t.done ? <Feather name="check" size={14} color={palette.white} /> : null}
                </View>
                <Text style={[styles.taskLabel, t.done && styles.taskDone]}>
                  <T>{t.label}</T>
                </Text>
              </Pressable>
            ))}
          </GlassCard>
        </View>

        <GlassCard intensity={36}>
          <View style={styles.aiHeader}>
            <Feather name="cpu" size={20} color={palette.primary} />
            <Text style={styles.aiTitle}>
              <T>AI triage brief (mock)</T>
            </Text>
          </View>
          <Text style={styles.aiBody}>
            <T>{MOCK_AI_BRIEFING}</T>
          </Text>
        </GlassCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <T>Quick actions</T>
          </Text>
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/assessments');
              }}
              style={({ pressed }) => [
                styles.primaryAction,
                pressOpacity && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Feather name="activity" size={20} color={palette.white} />
              <Text style={styles.primaryActionText}>
                <T>New assessment</T>
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/logs');
              }}
              style={({ pressed }) => [
                styles.glassBtn,
                pressOpacity && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Feather name="layers" size={18} color={palette.primary} />
              <Text style={styles.glassBtnText}>
                <T>Patient queue & signals</T>
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/chat');
              }}
              style={({ pressed }) => [
                styles.glassBtn,
                pressOpacity && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Feather name="message-circle" size={18} color={palette.primary} />
              <Text style={styles.glassBtnText}>
                <T>Supervisor & AI desk</T>
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Protocols (mock)', 'Offline WHO / IMCI library — UI hook only.');
              }}
              style={({ pressed }) => [
                styles.glassBtn,
                pressOpacity && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Feather name="book-open" size={18} color={palette.primary} />
              <Text style={styles.glassBtnText}>
                <T>Protocol library (placeholder)</T>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dateTiny: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.7,
  },
  greeting: { fontFamily: fonts.bold, fontSize: 26, color: palette.secondary },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wkPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: glass.fillStrong,
    borderWidth: 1,
    borderColor: glass.stroke,
  },
  wkPillText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.primary },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.statusAlert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.secondary },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  alertTitle: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },
  alertDetail: { fontFamily: fonts.regular, fontSize: 13, color: palette.textSecondary, lineHeight: 18 },
  alertMeta: { fontFamily: fonts.medium, fontSize: 11, color: palette.textTertiary },
  statusInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusLabel: { fontFamily: fonts.bold, fontSize: 17, color: palette.secondary },
  statusMsg: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, lineHeight: 20 },
  micro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stackName: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  stackTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.borderLight,
    overflow: 'hidden',
  },
  stackFill: { height: '100%', borderRadius: 4 },
  stackPct: { fontFamily: fonts.bold, fontSize: 15, color: palette.secondary, minWidth: 40, textAlign: 'right' },
  reasoning: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: glass.stroke,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  checkboxOn: { backgroundColor: palette.statusGood, borderColor: palette.statusGood },
  taskLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: palette.secondary },
  taskDone: {
    color: palette.textTertiary,
    textDecorationLine: 'line-through',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.primary },
  aiBody: { fontFamily: fonts.regular, fontSize: 15, color: palette.text, lineHeight: 22 },
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
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientDot: { width: 10, height: 10, borderRadius: 5 },
  patientMicro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  patientTitle: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary, marginTop: 2 },
});
