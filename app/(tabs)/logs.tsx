import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DonutRing } from '../../components/charts/DonutRing';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import { loadDashboardStats, type DashboardStats } from '../../db/analytics';
import type { SmearBand } from '../../db/smears';
import type { TriageLevel } from '../../data/questionnaire';
import { useContentInsets } from '../../hooks/useContentInsets';
import { T } from '../../i18n/T';
import { BAND_LABEL as SMEAR_BAND_LABEL, SPECIES_LABEL } from '../../services/smearAnalyzer';

const TRIAGE_COLOR: Record<TriageLevel, string> = {
  urgent: palette.statusAlert,
  review: palette.statusMonitor,
  possible: palette.primary,
  low: palette.statusGood,
};

const TRIAGE_LABEL: Record<TriageLevel, string> = {
  urgent: 'Urgent',
  review: 'Review',
  possible: 'Possible',
  low: 'Low risk',
};

const DISPOSITION_COLOR: Record<'stable' | 'observe' | 'escalated', string> = {
  stable: palette.statusGood,
  observe: palette.statusMonitor,
  escalated: palette.statusAlert,
};

const DISPOSITION_LABEL: Record<'stable' | 'observe' | 'escalated', string> = {
  stable: 'Stable / low risk',
  observe: 'Under observation',
  escalated: 'Escalated',
};

const SMEAR_BAND_COLOR: Record<SmearBand, string> = {
  negative: palette.statusGood,
  low: palette.primary,
  moderate: palette.statusMonitor,
  high: palette.statusAlert,
};

function patientStatusColor(s: 'good' | 'monitor' | 'alert') {
  if (s === 'good') return palette.statusGood;
  if (s === 'monitor') return palette.statusMonitor;
  return palette.statusAlert;
}

export default function LogsScreen() {
  const insets = useContentInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const s = await loadDashboardStats();
          if (!cancelled) setStats(s);
        } catch (e) {
          console.warn('[logs] loadDashboardStats failed', e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!stats) {
    return (
      <ScreenBackdrop>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <Text style={styles.sub}>
            <T>Loading queue & signals…</T>
          </Text>
        </View>
      </ScreenBackdrop>
    );
  }

  const triageTotal = stats.triageMix.reduce((a, b) => a + b.count, 0);
  const dispositionTotal = stats.dispositionMix.reduce((a, b) => a + b.count, 0);
  const maxPerDay = Math.max(1, ...stats.perDay.map((d) => d.count));
  const maxAvgScore = Math.max(1, ...stats.perDay.map((d) => d.avgScore));
  const tasksPct =
    stats.tasksTotal > 0 ? Math.round((stats.tasksDone / stats.tasksTotal) * 100) : 0;

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: space.padH,
          gap: space.gap,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          <T>Queue & signals</T>
        </Text>
        <Text style={styles.sub}>
          <T>Live rollups from this device — patients, assessments, and tasks.</T>
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard
            icon="users"
            value={String(stats.totalPatients)}
            label="Patients tracked"
            color={palette.primary}
          />
          <StatCard
            icon="activity"
            value={String(stats.assessments7d)}
            label="Assessments (7d)"
            color={palette.statusGood}
          />
          <StatCard
            icon="alert-triangle"
            value={String(stats.urgentOrReview7d)}
            label="Urgent / review (7d)"
            color={palette.statusAlert}
          />
          <StatCard
            icon="check-circle"
            value={`${tasksPct}%`}
            label={`Tasks done (${stats.tasksDone}/${stats.tasksTotal})`}
            color={palette.statusMonitor}
          />
        </ScrollView>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>
            <T>Current triage mix</T>
          </Text>
          <Text style={styles.cardSub}>
            <T>Latest assessment per patient.</T>
          </Text>
          {triageTotal === 0 ? (
            <EmptyChartHint text="No assessments yet — submit one to populate this card." />
          ) : (
            <View style={styles.donutRow}>
              {stats.triageMix.map((m) => (
                <DonutRing
                  key={m.level}
                  percent={triageTotal > 0 ? (m.count / triageTotal) * 100 : 0}
                  color={TRIAGE_COLOR[m.level]}
                  label={`${TRIAGE_LABEL[m.level]} (${m.count})`}
                />
              ))}
            </View>
          )}
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>
            <T>Average severity (7d)</T>
          </Text>
          <Text style={styles.cardSub}>
            <T>Mean triage score per day. Empty days are blank.</T>
          </Text>
          {stats.perDay.every((d) => d.count === 0) ? (
            <EmptyChartHint text="No assessments in the last 7 days." />
          ) : (
            <>
              <View style={styles.lineChart}>
                {stats.perDay.map((p) => {
                  const hasData = p.count > 0;
                  const yPct = hasData ? (p.avgScore / maxAvgScore) * 100 : 0;
                  const dotColor = p.worst ? TRIAGE_COLOR[p.worst] : palette.borderLight;
                  return (
                    <View key={p.date} style={styles.lineCol}>
                      <View style={styles.lineTrack}>
                        {hasData && (
                          <View
                            style={[
                              styles.lineDot,
                              { bottom: `${yPct}%`, backgroundColor: dotColor },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={styles.lineLabels}>
                {stats.perDay.map((p) => (
                  <Text key={p.date} style={styles.lineLbl}>
                    {p.dayLabel}
                  </Text>
                ))}
              </View>
            </>
          )}
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>
            <T>Assessments per day</T>
          </Text>
          <View style={styles.volRow}>
            {stats.perDay.map((p) => {
              const heightPct = (p.count / maxPerDay) * 100;
              const color = p.worst
                ? TRIAGE_COLOR[p.worst]
                : p.count > 0
                  ? palette.statusGood
                  : palette.borderLight;
              return (
                <View key={p.date} style={styles.volCol}>
                  <Text style={styles.volVal}>{p.count}</Text>
                  <View style={styles.volTrack}>
                    <View
                      style={[
                        styles.volFill,
                        { height: `${Math.max(heightPct, p.count > 0 ? 8 : 0)}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={styles.volDay}>{p.dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>
            <T>Case disposition outlook</T>
          </Text>
          <Text style={styles.cardSub}>
            <T>Where each patient stands based on their last assessment.</T>
          </Text>
          {dispositionTotal === 0 ? (
            <EmptyChartHint text="Disposition appears once patients have at least one assessment." />
          ) : (
            <View style={styles.donutRow}>
              {stats.dispositionMix.map((d) => (
                <DonutRing
                  key={d.kind}
                  percent={dispositionTotal > 0 ? (d.count / dispositionTotal) * 100 : 0}
                  color={DISPOSITION_COLOR[d.kind]}
                  label={`${DISPOSITION_LABEL[d.kind]} (${d.count})`}
                />
              ))}
            </View>
          )}
        </GlassCard>

        <View style={styles.section}>
          <Text style={styles.cardTitle}>
            <T>Active queue timeline</T>
          </Text>
          {stats.patientLatest.length === 0 ? (
            <GlassCard intensity={34}>
              <EmptyChartHint text="No patients yet — add one from settings to start the queue." />
            </GlassCard>
          ) : (
            <View style={styles.timeline}>
              {stats.patientLatest.map((entry, idx) => {
                const a = entry.assessment;
                const accent = a ? TRIAGE_COLOR[a.triageLevel] : patientStatusColor(entry.patient.status);
                return (
                  <View key={entry.patient.id} style={styles.tlRow}>
                    <View style={styles.tlRail}>
                      <View style={[styles.tlDot, { backgroundColor: accent }]} />
                      {idx < stats.patientLatest.length - 1 ? <View style={styles.tlLine} /> : null}
                    </View>
                    <GlassCard intensity={36} style={styles.tlCardOuter} contentStyle={styles.tlCardInner}>
                      <View style={styles.tlHeader}>
                        <View style={[styles.badge, { backgroundColor: `${accent}1A` }]}>
                          <Text style={[styles.badgeTxt, { color: accent }]}>{entry.patient.caseId}</Text>
                        </View>
                        {a && (
                          <View style={[styles.triagePill, { backgroundColor: `${accent}14`, borderColor: accent }]}>
                            <Text style={[styles.triagePillTxt, { color: accent }]}>
                              <T>{TRIAGE_LABEL[a.triageLevel]}</T>
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.caseLabel}>
                        <T>{entry.patient.label}</T>
                      </Text>
                      {a ? (
                        <>
                          <View style={styles.metricRow}>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={styles.miniLbl}>
                                <T>Severity score</T>
                              </Text>
                              <View style={styles.miniTrack}>
                                <View
                                  style={[
                                    styles.miniFill,
                                    {
                                      width: `${Math.min(100, (a.triageScore / 12) * 100)}%`,
                                      backgroundColor: accent,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                            <Text style={styles.scoreNum}>{a.triageScore}</Text>
                          </View>
                          {a.triageReasons.length > 0 && (
                            <View style={styles.reasonsBox}>
                              <Text style={styles.micro}>
                                <T>Top reasons</T>
                              </Text>
                              {a.triageReasons.slice(0, 3).map((r, i) => (
                                <Text key={i} style={styles.tlDesc}>
                                  • <T>{r}</T>
                                </Text>
                              ))}
                            </View>
                          )}
                          {entry.smear && (
                            <View
                              style={[
                                styles.compareBox,
                                {
                                  backgroundColor: `${SMEAR_BAND_COLOR[entry.smear.band]}10`,
                                },
                              ]}
                            >
                              <Text style={styles.micro}>
                                <T>Smear (latest)</T>
                              </Text>
                              <Text
                                style={[
                                  styles.compareTxt,
                                  { color: SMEAR_BAND_COLOR[entry.smear.band], fontFamily: fonts.semibold },
                                ]}
                              >
                                <T>{SPECIES_LABEL[entry.smear.species]}</T> ·{' '}
                                {entry.smear.parasitemiaPct.toFixed(2)}% ·{' '}
                                <T>{SMEAR_BAND_LABEL[entry.smear.band]}</T>
                              </Text>
                            </View>
                          )}
                          <View style={styles.compareBox}>
                            <Text style={styles.micro}>
                              <T>Last assessed</T>
                            </Text>
                            <Text style={styles.compareTxt}>
                              {new Date(a.createdAt).toLocaleString()}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.compareBox}>
                          <Text style={styles.micro}>
                            <T>Status</T>
                          </Text>
                          <Text style={styles.compareTxt}>
                            <T>No assessment yet — start the questionnaire for this patient.</T>
                          </Text>
                        </View>
                      )}
                    </GlassCard>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  label: string;
  color: string;
}) {
  return (
    <GlassCard intensity={32} style={styles.statCardOuter} contentStyle={styles.statCardInner}>
      <Feather name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>
        <T>{label}</T>
      </Text>
    </GlassCard>
  );
}

function EmptyChartHint({ text }: { text: string }) {
  return (
    <View style={styles.emptyChart}>
      <Feather name="bar-chart-2" size={20} color={palette.textTertiary} />
      <Text style={styles.emptyChartText}>
        <T>{text}</T>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 28, color: palette.secondary },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, marginTop: 4 },
  statsRow: { gap: 12, paddingVertical: 4 },
  statCardOuter: { width: 138 },
  statCardInner: { minHeight: 100, gap: 8 },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: palette.secondary },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, color: palette.textSecondary },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.secondary },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    marginTop: 2,
    marginBottom: 12,
  },
  donutRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  lineChart: { flexDirection: 'row', alignItems: 'stretch', marginTop: 8, height: 120 },
  lineCol: { flex: 1, position: 'relative', alignItems: 'center' },
  lineTrack: {
    flex: 1,
    width: 4,
    backgroundColor: palette.borderLight,
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
  },
  lineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    left: -4,
    marginBottom: -6,
    borderWidth: 2,
    borderColor: palette.white,
  },
  lineLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLbl: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: palette.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  volRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 140,
    gap: 6,
    marginTop: 8,
  },
  volCol: { flex: 1, alignItems: 'center', gap: 6 },
  volVal: { fontFamily: fonts.bold, fontSize: 13, color: palette.secondary },
  volTrack: {
    width: '70%',
    flex: 1,
    minHeight: 80,
    backgroundColor: palette.borderLight,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  volFill: { width: '100%', borderRadius: 6 },
  volDay: { fontFamily: fonts.medium, fontSize: 11, color: palette.textTertiary },
  section: { gap: 12 },
  timeline: { gap: 0 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 20, alignItems: 'center' },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.white,
    zIndex: 1,
    marginTop: 4,
  },
  tlLine: { width: 2, flex: 1, minHeight: 40, backgroundColor: glass.strokeSoft, marginVertical: -2 },
  tlCardOuter: { flex: 1, marginBottom: 16 },
  tlCardInner: { gap: 10 },
  tlHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniLbl: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: palette.textTertiary,
    letterSpacing: 0.5,
  },
  miniTrack: { height: 6, borderRadius: 3, backgroundColor: palette.borderLight, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3 },
  scoreNum: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: palette.secondary,
    minWidth: 32,
    textAlign: 'right',
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontFamily: fonts.semibold, fontSize: 12 },
  triagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  triagePillTxt: { fontFamily: fonts.semibold, fontSize: 11 },
  caseLabel: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },
  tlDesc: { fontFamily: fonts.regular, fontSize: 13, color: palette.text, lineHeight: 18 },
  reasonsBox: { gap: 4, paddingTop: 4 },
  compareBox: { padding: 10, borderRadius: radii.sm, backgroundColor: `${palette.primary}10` },
  micro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  compareTxt: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  emptyChart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  emptyChartText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textTertiary,
    lineHeight: 18,
  },
});
