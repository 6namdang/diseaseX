import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from '../../components/charts/BarChart';
import { DonutRing } from '../../components/charts/DonutRing';
import { LineChart } from '../../components/charts/LineChart';
import { Banner } from '../../components/ui/Banner';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { SettingsSheet } from '../../components/ui/SettingsSheet';
import { fonts, palette, radii, space } from '../../constants/designTokens';
import { RED_FLAG_KEYS } from '../../db/assessmentRepo';
import type { RedFlagKey } from '../../db/types';
import { useAssessmentStats } from '../../hooks/useAssessmentStats';
import { useContentInsets } from '../../hooks/useContentInsets';
import { usePatient } from '../../hooks/usePatient';
import { T } from '../../i18n/T';
import { useT } from '../../i18n/LanguageContext';

export default function HomeScreen() {
  const insets = useContentInsets();
  const router = useRouter();
  const { patient, refresh: refreshPatient } = usePatient();
  const stats = useAssessmentStats();

  const redFlagLabels: Record<RedFlagKey, string> = {
    confused: useT('Confusion'),
    seizures: useT('Seizures'),
    unable_to_walk: useT('Unable to walk'),
    dark_urine: useT('Dark urine'),
    yellow_eyes: useT('Yellow eyes'),
    persistent_vomiting: useT('Persistent vomiting'),
  };
  const friendWord = useT('friend');
  const goodMorning = useT('Good morning');
  const goodAfternoon = useT('Good afternoon');
  const goodEvening = useT('Good evening');
  const greetingText = (() => {
    const h = new Date().getHours();
    if (h < 12) return goodMorning;
    if (h < 18) return goodAfternoon;
    return goodEvening;
  })();
  const endemicLabel = useT('In a malaria-endemic region');
  const notEndemicLabel = useT('Not in an endemic region');
  const unknownEndemicLabel = useT('Endemicity unknown');
  const noChangeLabel = useT('no change');
  const vsLastLabel = useT('vs last');
  const tNoTopicTitle = useT('Clinician alert topic not set');
  const tNoTopicMsg = useT(
    'Finish onboarding and add an ntfy.sh alert topic so urgent push alerts can reach your clinician.',
  );
  const tRedFlagsTitle = useT('Your latest assessment has red flags');
  const tRedFlagsMsg = useT(
    'Open the History tab to review. If you feel worse, seek care immediately.',
  );
  const tLatestSeverity = useT('Latest severity');
  const tAssessments = useT('Assessments');
  const tEscalationsSent = useT('Escalations sent');
  const tNewAssessment = useT('New assessment');
  const tHistory = useT('History');
  const tAskAI = useT('Ask AI');

  useFocusEffect(
    useCallback(() => {
      refreshPatient();
      stats.refresh();
    }, [refreshPatient, stats]),
  );

  const latest = stats.latest;
  const prev = stats.previous;
  const deltaSeverity =
    latest && prev ? latest.severityScore - prev.severityScore : null;

  const anyRedFlagLatest = latest
    ? Object.values(latest.redFlags).some(Boolean)
    : false;

  return (
    <ScreenBackdrop>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: space.padH,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {greetingText},{' '}
              <Text style={styles.greetingBold}>{patient?.name ?? friendWord}</Text>
            </Text>
            <Text style={styles.subgreeting}>
              {patient?.countryName
                ? `${patient.countryName}${patient.region ? `, ${patient.region}` : ''} · `
                : ''}
              {patient?.endemicity === 'endemic'
                ? endemicLabel
                : patient?.endemicity === 'eliminated' || patient?.endemicity === 'non_endemic'
                  ? notEndemicLabel
                  : unknownEndemicLabel}
            </Text>
          </View>
          <SettingsSheet />
        </View>

        {patient?.onboardingCompletedAt && !patient?.clinicianAlertTopic && (
          <Banner
            tone="warning"
            title={tNoTopicTitle}
            message={tNoTopicMsg}
          />
        )}

        {anyRedFlagLatest && (
          <Banner
            tone="danger"
            title={tRedFlagsTitle}
            message={tRedFlagsMsg}
          />
        )}

        {stats.total === 0 ? (
          <GlassCard>
            <View style={{ gap: 10, alignItems: 'center', paddingVertical: 18 }}>
              <Feather name="activity" size={28} color={palette.primary} />
              <Text style={styles.cardTitle}><T>No assessments yet</T></Text>
              <Text style={styles.cardBody}>
                <T>Log your first assessment to start tracking your recovery.</T>
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/assessments')}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}><T>Start assessment</T></Text>
                <Feather name="arrow-right" size={16} color={palette.white} />
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <>
            <View style={styles.statRow}>
              <StatCard
                label={tLatestSeverity}
                value={latest ? latest.severityScore.toFixed(1) : '—'}
                delta={deltaSeverity}
                noChangeLabel={noChangeLabel}
                vsLastLabel={vsLastLabel}
                color={
                  anyRedFlagLatest
                    ? palette.statusAlert
                    : (latest?.severityScore ?? 0) > 15
                      ? palette.statusMonitor
                      : palette.statusGood
                }
              />
              <StatCard
                label={tAssessments}
                value={String(stats.total)}
                delta={null}
                noChangeLabel={noChangeLabel}
                vsLastLabel={vsLastLabel}
                color={palette.primary}
              />
              <StatCard
                label={tEscalationsSent}
                value={String(
                  stats.escalations.filter((e) => e.status === 'sent').length,
                )}
                delta={null}
                noChangeLabel={noChangeLabel}
                vsLastLabel={vsLastLabel}
                color={palette.statusAlert}
              />
            </View>

            <GlassCard>
              <Text style={styles.cardTitle}><T>Severity over your last assessments</T></Text>
              <Text style={styles.cardBody}>
                <T>Lower is better. Dots are individual assessments.</T>
              </Text>
              <LineChart
                data={stats.severitySeries}
                height={180}
                xLabelFormatter={(x) => formatDate(x)}
                color={palette.primary}
              />
            </GlassCard>

            <GlassCard>
              <Text style={styles.cardTitle}><T>Assessments per day (last 7)</T></Text>
              <BarChart
                data={stats.last7Days.map((d) => ({ label: d.day, value: d.count }))}
                height={150}
              />
            </GlassCard>

            <GlassCard>
              <Text style={styles.cardTitle}><T>Red flags reported</T></Text>
              <Text style={styles.cardBody}>
                <T>Count across all assessments. Any flag pushes an urgent alert to your clinician.</T>
              </Text>
              <View style={styles.flagGrid}>
                {RED_FLAG_KEYS.map((k) => (
                  <FlagTile
                    key={k}
                    label={redFlagLabels[k]}
                    count={stats.redFlagTotals[k]}
                    total={stats.total}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard>
              <View style={styles.actionsRow}>
                <ActionLink
                  icon="activity"
                  label={tNewAssessment}
                  onPress={() => router.push('/(tabs)/assessments')}
                />
                <ActionLink
                  icon="list"
                  label={tHistory}
                  onPress={() => router.push('/(tabs)/history')}
                />
                <ActionLink
                  icon="message-circle"
                  label={tAskAI}
                  onPress={() => router.push('/(tabs)/chat')}
                />
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>
    </ScreenBackdrop>
  );
}

function StatCard({
  label,
  value,
  delta,
  color,
  noChangeLabel,
  vsLastLabel,
}: {
  label: string;
  value: string;
  delta: number | null;
  color: string;
  noChangeLabel: string;
  vsLastLabel: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}33` }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {delta !== null ? (
        <Text
          style={[
            styles.statDelta,
            {
              color:
                delta === 0
                  ? palette.textTertiary
                  : delta < 0
                    ? palette.statusGood
                    : palette.statusAlert,
            },
          ]}
        >
          {delta === 0
            ? noChangeLabel
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${vsLastLabel}`}
        </Text>
      ) : null}
    </View>
  );
}

function FlagTile({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <View style={styles.flagTile}>
      <DonutRing
        size={58}
        percent={pct}
        color={count > 0 ? palette.statusAlert : palette.primaryMuted}
        label={label}
      />
      <Text style={styles.flagCount}>
        {count}/{total}
      </Text>
    </View>
  );
}

function ActionLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.actionLink,
      pressed && { opacity: 0.7 },
    ]}>
      <Feather name={icon} size={18} color={palette.primary} />
      <Text style={styles.actionLinkText}>{label}</Text>
    </Pressable>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: palette.textSecondary,
  },
  greetingBold: { fontFamily: fonts.bold, color: palette.secondary },
  subgreeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textTertiary,
    marginTop: 2,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.secondary,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
    gap: 2,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statValue: { fontFamily: fonts.bold, fontSize: 22 },
  statDelta: { fontFamily: fonts.medium, fontSize: 11 },
  flagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 4,
  },
  flagTile: { width: '30%', alignItems: 'center' },
  flagCount: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: 2,
  },
  primaryBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  primaryBtnText: { fontFamily: fonts.semibold, color: palette.white, fontSize: 14 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionLink: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionLinkText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.secondary,
  },
});
