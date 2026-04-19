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
import { fonts, palette, radii, space } from '../../constants/designTokens';
import { RED_FLAG_KEYS } from '../../db/assessmentRepo';
import type { RedFlagKey } from '../../db/types';
import { useAssessmentStats } from '../../hooks/useAssessmentStats';
import { useContentInsets } from '../../hooks/useContentInsets';
import { usePatient } from '../../hooks/usePatient';
import { isConfigured as twilioConfigured } from '../../services/twilioClient';

const RED_FLAG_LABEL: Record<RedFlagKey, string> = {
  confused: 'Confusion',
  seizures: 'Seizures',
  unable_to_walk: 'Unable to walk',
  dark_urine: 'Dark urine',
  yellow_eyes: 'Yellow eyes',
  persistent_vomiting: 'Persistent vomiting',
};

export default function HomeScreen() {
  const insets = useContentInsets();
  const router = useRouter();
  const { patient, refresh: refreshPatient } = usePatient();
  const stats = useAssessmentStats();

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
              {greeting()},{' '}
              <Text style={styles.greetingBold}>{patient?.name ?? 'friend'}</Text>
            </Text>
            <Text style={styles.subgreeting}>
              {patient?.countryName
                ? `${patient.countryName}${patient.region ? `, ${patient.region}` : ''} · `
                : ''}
              {patient?.endemicity === 'endemic'
                ? 'In a malaria-endemic region'
                : patient?.endemicity === 'eliminated' || patient?.endemicity === 'non_endemic'
                  ? 'Not in an endemic region'
                  : 'Endemicity unknown'}
            </Text>
          </View>
        </View>

        {!twilioConfigured() && (
          <Banner
            tone="warning"
            title="SMS escalation not configured"
            message="Set EXPO_PUBLIC_TWILIO_* env vars and rebuild the app so clinician alerts can be sent."
          />
        )}

        {anyRedFlagLatest && (
          <Banner
            tone="danger"
            title="Your latest assessment has red flags"
            message="Open the History tab to review. If you feel worse, seek care immediately."
          />
        )}

        {stats.total === 0 ? (
          <GlassCard>
            <View style={{ gap: 10, alignItems: 'center', paddingVertical: 18 }}>
              <Feather name="activity" size={28} color={palette.primary} />
              <Text style={styles.cardTitle}>No assessments yet</Text>
              <Text style={styles.cardBody}>
                Log your first assessment to start tracking your recovery.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/assessments')}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Start assessment</Text>
                <Feather name="arrow-right" size={16} color={palette.white} />
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <>
            <View style={styles.statRow}>
              <StatCard
                label="Latest severity"
                value={latest ? latest.severityScore.toFixed(1) : '—'}
                delta={deltaSeverity}
                color={
                  anyRedFlagLatest
                    ? palette.statusAlert
                    : (latest?.severityScore ?? 0) > 15
                      ? palette.statusMonitor
                      : palette.statusGood
                }
              />
              <StatCard
                label="Assessments"
                value={String(stats.total)}
                delta={null}
                color={palette.primary}
              />
              <StatCard
                label="Escalations sent"
                value={String(
                  stats.escalations.filter((e) => e.status === 'sent').length,
                )}
                delta={null}
                color={palette.statusAlert}
              />
            </View>

            <GlassCard>
              <Text style={styles.cardTitle}>Severity over your last assessments</Text>
              <Text style={styles.cardBody}>
                Lower is better. Dots are individual assessments.
              </Text>
              <LineChart
                data={stats.severitySeries}
                height={180}
                xLabelFormatter={(x) => formatDate(x)}
                color={palette.primary}
              />
            </GlassCard>

            <GlassCard>
              <Text style={styles.cardTitle}>Assessments per day (last 7)</Text>
              <BarChart
                data={stats.last7Days.map((d) => ({ label: d.day, value: d.count }))}
                height={150}
              />
            </GlassCard>

            <GlassCard>
              <Text style={styles.cardTitle}>Red flags reported</Text>
              <Text style={styles.cardBody}>
                Count across all assessments. Any flag triggers an SMS to your clinician.
              </Text>
              <View style={styles.flagGrid}>
                {RED_FLAG_KEYS.map((k) => (
                  <FlagTile
                    key={k}
                    label={RED_FLAG_LABEL[k]}
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
                  label="New assessment"
                  onPress={() => router.push('/(tabs)/assessments')}
                />
                <ActionLink
                  icon="list"
                  label="History"
                  onPress={() => router.push('/(tabs)/history')}
                />
                <ActionLink
                  icon="message-circle"
                  label="Ask AI"
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
}: {
  label: string;
  value: string;
  delta: number | null;
  color: string;
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
            ? 'no change'
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} vs last`}
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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
