import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
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
import { SettingsSheet } from '../../components/ui/SettingsSheet';
import { ONBOARDING_KEY } from '../../constants/appStorage';
import {
  fonts,
  glass,
  palette,
  radii,
  space,
} from '../../constants/designTokens';
import {
  getLatestAssessment,
  type Assessment,
} from '../../db/assessments';
import {
  getLatestSmear,
  type Smear,
} from '../../db/smears';
import {
  addTask,
  deleteTask,
  listTasks,
  setTaskDone,
  type Task,
} from '../../db/tasks';
import { useContentInsets } from '../../hooks/useContentInsets';
import { useT } from '../../i18n/LanguageContext';
import { T } from '../../i18n/T';
import { BAND_LABEL, SPECIES_LABEL } from '../../services/smearAnalyzer';
import { usePatient } from '../../state/PatientContext';
import type { TriageLevel } from '../../data/questionnaire';
import type { SmearBand } from '../../db/smears';

const SMEAR_BAND_COLOR: Record<SmearBand, string> = {
  negative: palette.statusGood,
  low: palette.primary,
  moderate: palette.statusMonitor,
  high: palette.statusAlert,
};

const TRIAGE_BAND: Record<
  TriageLevel,
  { color: string; label: string; message: string; icon: 'shield' | 'eye' | 'alert-triangle' | 'activity' }
> = {
  urgent: {
    color: palette.statusAlert,
    label: 'Urgent — refer immediately',
    message: 'Latest triage flagged danger signs. Start protocol and arrange transport.',
    icon: 'alert-triangle',
  },
  review: {
    color: palette.statusMonitor,
    label: 'Clinician review soon',
    message: 'Pattern suggests escalation. Re-check vitals and contact supervisor.',
    icon: 'eye',
  },
  possible: {
    color: palette.primary,
    label: 'Possible malaria — test & monitor',
    message: 'Fever with supporting symptoms. Consider RDT and continue observation.',
    icon: 'activity',
  },
  low: {
    color: palette.statusGood,
    label: 'Low immediate risk',
    message: 'No danger signs in latest assessment. Re-assess if symptoms change.',
    icon: 'shield',
  },
};

export default function HomeScreen() {
  const insets = useContentInsets();
  const { active: activePatient, ready } = usePatient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [latest, setLatest] = useState<Assessment | null>(null);
  const [latestSmear, setLatestSmear] = useState<Smear | null>(null);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const reload = useCallback(async () => {
    const [t, a, s] = await Promise.all([
      listTasks(activePatient?.id ?? null),
      activePatient ? getLatestAssessment(activePatient.id) : Promise.resolve(null),
      activePatient ? getLatestSmear(activePatient.id) : Promise.resolve(null),
    ]);
    setTasks(t);
    setLatest(a);
    setLatestSmear(s);
  }, [activePatient]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const toggleTask = async (id: string, current: boolean) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !current } : t)));
    try {
      await setTaskDone(id, !current);
    } catch (e) {
      Alert.alert('Could not update task', String(e));
      void reload();
    }
  };

  const removeTaskRow = (id: string) => {
    Alert.alert('Remove task?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(id);
            await reload();
          } catch (e) {
            Alert.alert('Could not remove task', String(e));
          }
        },
      },
    ]);
  };

  const submitNewTask = async () => {
    const label = newTaskLabel.trim();
    if (!label) return;
    try {
      await addTask(label, activePatient?.id ?? null);
      setNewTaskLabel('');
      setAddingTask(false);
      await reload();
    } catch (e) {
      Alert.alert('Could not add task', String(e));
    }
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

  const pressOpacity = Platform.OS !== 'web';
  const taskPlaceholder = useT('Add a task — e.g. confirm RDT result');

  const band = latest ? TRIAGE_BAND[latest.triageLevel] : null;

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
            <Text style={styles.greeting}>
              <T>Field desk</T>
            </Text>
            <Text style={styles.subtitle}>
              <T>Local-first triage assistant</T>
            </Text>
          </View>
          <View style={styles.headerActions}>
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

        {ready && !activePatient && (
          <GlassCard intensity={32} contentStyle={{ backgroundColor: `${palette.primary}10` }}>
            <View style={styles.patientRow}>
              <Feather name="user-plus" size={20} color={palette.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.patientMicro}>
                  <T>No patient yet</T>
                </Text>
                <Text style={styles.patientTitle}>
                  <T>Open settings to add your first patient.</T>
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {activePatient && (
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
        )}

        {activePatient && band && latest && (
          <GlassCard intensity={32} contentStyle={{ backgroundColor: `${band.color}14` }}>
            <View style={styles.statusInner}>
              <Feather name={band.icon} size={24} color={band.color} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.statusLabel, { color: band.color }]}>
                  <T>{band.label}</T>
                </Text>
                <Text style={styles.statusMsg}>
                  <T>{band.message}</T>
                </Text>
                <Text style={styles.statusMeta}>
                  <T>Severity score</T>: {latest.triageScore} ·{' '}
                  {new Date(latest.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {activePatient && !latest && (
          <GlassCard intensity={32}>
            <View style={styles.emptyTriage}>
              <Feather name="clipboard" size={22} color={palette.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>
                  <T>No assessment yet for this patient</T>
                </Text>
                <Text style={styles.emptyBody}>
                  <T>Start the questionnaire to compute a triage band.</T>
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {latest && latest.triageReasons.length > 0 && (
          <GlassCard intensity={34}>
            <Text style={styles.micro}>
              <T>Reasons from latest assessment</T>
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {latest.triageReasons.slice(0, 4).map((r, i) => (
                <View key={i} style={styles.reasonRow}>
                  <Feather name="alert-circle" size={14} color={band?.color ?? palette.primary} />
                  <Text style={styles.reasonText}>
                    <T>{r}</T>
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {activePatient && latestSmear && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              router.push('/(tabs)/smear');
            }}
            style={({ pressed }) => [pressOpacity && pressed && { opacity: 0.92 }]}
          >
            <GlassCard
              intensity={34}
              contentStyle={{ backgroundColor: `${SMEAR_BAND_COLOR[latestSmear.band]}10` }}
            >
              <View style={styles.smearRow}>
                <Feather name="aperture" size={20} color={SMEAR_BAND_COLOR[latestSmear.band]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.micro}>
                    <T>Latest smear</T>
                  </Text>
                  <Text style={styles.smearTitle}>
                    <T>{SPECIES_LABEL[latestSmear.species]}</T> ·{' '}
                    {latestSmear.parasitemiaPct.toFixed(2)}%
                  </Text>
                  <Text style={styles.smearMeta}>
                    <T>{BAND_LABEL[latestSmear.band]}</T> ·{' '}
                    {Math.round(latestSmear.confidence * 100)}% <T>conf.</T> ·{' '}
                    {new Date(latestSmear.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={palette.textTertiary} />
              </View>
            </GlassCard>
          </Pressable>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              <T>Shift tasks</T>
            </Text>
            {!addingTask && (
              <Pressable
                onPress={() => setAddingTask(true)}
                style={({ pressed }) => [
                  styles.addPill,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="plus" size={14} color={palette.primary} />
                <Text style={styles.addPillText}>
                  <T>Add</T>
                </Text>
              </Pressable>
            )}
          </View>
          <GlassCard intensity={38}>
            {addingTask && (
              <View style={styles.newTaskRow}>
                <TextInput
                  style={styles.newTaskInput}
                  placeholder={taskPlaceholder}
                  placeholderTextColor={palette.textTertiary}
                  value={newTaskLabel}
                  onChangeText={setNewTaskLabel}
                  onSubmitEditing={submitNewTask}
                  returnKeyType="done"
                  autoFocus
                />
                <Pressable
                  onPress={submitNewTask}
                  style={({ pressed }) => [styles.taskSaveBtn, pressed && { opacity: 0.85 }]}
                >
                  <Feather name="check" size={16} color={palette.white} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAddingTask(false);
                    setNewTaskLabel('');
                  }}
                  style={({ pressed }) => [styles.taskCancelBtn, pressed && { opacity: 0.85 }]}
                >
                  <Feather name="x" size={16} color={palette.textSecondary} />
                </Pressable>
              </View>
            )}
            {tasks.length === 0 && !addingTask && (
              <Text style={styles.emptyTaskText}>
                <T>No tasks. Tap “Add” to create one.</T>
              </Text>
            )}
            {tasks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => toggleTask(t.id, t.done)}
                onLongPress={() => removeTaskRow(t.id)}
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
                <Pressable
                  onPress={() => removeTaskRow(t.id)}
                  hitSlop={8}
                  accessibilityLabel="Remove task"
                >
                  <Feather name="x" size={14} color={palette.textTertiary} />
                </Pressable>
              </Pressable>
            ))}
          </GlassCard>
        </View>

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
                router.push('/(tabs)/smear');
              }}
              style={({ pressed }) => [
                styles.glassBtn,
                pressOpacity && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Feather name="aperture" size={18} color={palette.primary} />
              <Text style={styles.glassBtnText}>
                <T>Blood smear analysis</T>
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
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.statusAlert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.secondary },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  addPillText: { fontFamily: fonts.semibold, fontSize: 12, color: palette.primary },
  statusInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusLabel: { fontFamily: fonts.bold, fontSize: 17 },
  statusMsg: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, lineHeight: 20 },
  statusMeta: { fontFamily: fonts.medium, fontSize: 11, color: palette.textTertiary, marginTop: 4 },
  emptyTriage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, color: palette.textSecondary, marginTop: 2 },
  micro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reasonText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
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
  taskDone: { color: palette.textTertiary, textDecorationLine: 'line-through' },
  emptyTaskText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textTertiary,
    paddingVertical: 8,
  },
  newTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  newTaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: glass.stroke,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.text,
    backgroundColor: palette.white,
  },
  taskSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.stroke,
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
  smearRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smearTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.secondary,
    marginTop: 4,
  },
  smearMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
});
