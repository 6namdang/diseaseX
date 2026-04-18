import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DonutRing } from '../../components/charts/DonutRing';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import {
  MOCK_CASE_TIMELINE,
  MOCK_DONUT_TRILE,
  MOCK_OUTLOOK_DONUTS,
  MOCK_QUEUE_VOLUME,
  MOCK_REGION_STATS,
  MOCK_SYNDROMIC_TREND,
  MOCK_WEEKLY_BARS,
} from '../../data/mockClinical';
import { useContentInsets } from '../../hooks/useContentInsets';

function trendColor(t: 'good' | 'monitor' | 'alert') {
  if (t === 'good') return palette.statusGood;
  if (t === 'monitor') return palette.statusMonitor;
  return palette.statusAlert;
}

function volumeBarColor(level: number) {
  if (level <= 3) return palette.statusGood;
  if (level <= 5) return palette.statusMonitor;
  return palette.statusAlert;
}

export default function LogsScreen() {
  const insets = useContentInsets();

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
        <Text style={styles.title}>Queue & signals</Text>
        <Text style={styles.sub}>Mock syndromic overview — no live analytics yet.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {MOCK_REGION_STATS.map((s) => (
            <GlassCard key={s.label} intensity={32} style={styles.statCardOuter} contentStyle={styles.statCardInner}>
              <Feather name={s.icon} size={18} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassCard>
          ))}
        </ScrollView>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>Rule-out mix (mock)</Text>
          <View style={styles.donutRow}>
            {MOCK_DONUT_TRILE.map((d) => (
              <DonutRing key={d.label} percent={d.percent} color={d.color} label={d.label} />
            ))}
          </View>
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>Program KPIs (mock)</Text>
          <View style={{ gap: 14 }}>
            {MOCK_WEEKLY_BARS.map((b) => (
              <View key={b.label} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.barLabel}>{b.label}</Text>
                  <Text style={styles.barPct}>{b.pct}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${b.pct}%`, backgroundColor: b.color }]} />
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>Fever / distress index</Text>
          <View style={styles.lineChart}>
            {MOCK_SYNDROMIC_TREND.map((p) => (
              <View key={p.id} style={styles.lineCol}>
                <View style={styles.lineTrack}>
                  <View
                    style={[
                      styles.lineDot,
                      { bottom: `${p.y * 100}%`, backgroundColor: trendColor(p.trend) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={styles.lineLabels}>
            {MOCK_SYNDROMIC_TREND.map((p) => (
              <Text key={p.id} style={styles.lineLbl}>
                {p.d}
              </Text>
            ))}
          </View>
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>Assessments per day (mock)</Text>
          <View style={styles.volRow}>
            {MOCK_QUEUE_VOLUME.map((p) => (
              <View key={p.id} style={styles.volCol}>
                <Text style={styles.volVal}>{p.level}</Text>
                <View style={styles.volTrack}>
                  <View
                    style={[
                      styles.volFill,
                      { height: `${(p.level / 10) * 100}%`, backgroundColor: volumeBarColor(p.level) },
                    ]}
                  />
                </View>
                <Text style={styles.volDay}>{p.day}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard intensity={34}>
          <Text style={styles.cardTitle}>Case disposition outlook</Text>
          <View style={styles.donutRow}>
            {MOCK_OUTLOOK_DONUTS.map((d) => (
              <DonutRing key={d.label} percent={d.percent} color={d.color} label={d.label} />
            ))}
          </View>
        </GlassCard>

        <View style={styles.section}>
          <Text style={styles.cardTitle}>Active queue timeline (mock)</Text>
          <View style={styles.timeline}>
            {MOCK_CASE_TIMELINE.map((entry, idx) => (
              <View key={entry.id} style={styles.tlRow}>
                <View style={styles.tlRail}>
                  <View style={[styles.tlDot, { backgroundColor: trendColor(entry.status) }]} />
                  {idx < MOCK_CASE_TIMELINE.length - 1 ? <View style={styles.tlLine} /> : null}
                </View>
                <GlassCard intensity={36} style={styles.tlCardOuter} contentStyle={styles.tlCardInner}>
                  <View style={styles.tlThumb} />
                  <View style={styles.miniBars}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.miniLbl}>{entry.metricA.label}</Text>
                      <View style={styles.miniTrack}>
                        <View
                          style={[
                            styles.miniFill,
                            {
                              width: `${entry.metricA.pct * 100}%`,
                              backgroundColor: palette.statusMonitor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.miniLbl}>{entry.metricB.label}</Text>
                      <View style={styles.miniTrack}>
                        <View
                          style={[
                            styles.miniFill,
                            {
                              width: `${entry.metricB.pct * 100}%`,
                              backgroundColor: palette.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${palette.primary}18` }]}>
                    <Text style={[styles.badgeTxt, { color: palette.primary }]}>{entry.caseId}</Text>
                  </View>
                  <Text style={styles.caseLabel}>{entry.label}</Text>
                  <Text style={styles.tlDesc}>{entry.desc}</Text>
                  <View style={styles.compareBox}>
                    <Text style={styles.micro}>Field note</Text>
                    <Text style={styles.compareTxt}>{entry.compare}</Text>
                  </View>
                </GlassCard>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  title: { fontFamily: fonts.bold, fontSize: 28, color: palette.secondary },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: palette.textSecondary, marginTop: 4 },
  statsRow: { gap: 12, paddingVertical: 4 },
  statCardOuter: { width: 118 },
  statCardInner: { minHeight: 100, gap: 8 },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: palette.secondary },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, color: palette.textSecondary },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.secondary },
  donutRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  barLabel: { fontFamily: fonts.medium, fontSize: 13, color: palette.textSecondary },
  barPct: { fontFamily: fonts.semibold, fontSize: 13, color: palette.text },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: palette.borderLight, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  lineChart: { flexDirection: 'row', alignItems: 'stretch', marginTop: 8, height: 120 },
  lineCol: { flex: 1, position: 'relative', alignItems: 'center' },
  lineTrack: { flex: 1, width: 4, backgroundColor: palette.borderLight, borderRadius: 2, position: 'relative', marginBottom: 8 },
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
  lineLbl: { fontFamily: fonts.medium, fontSize: 10, color: palette.textTertiary, flex: 1, textAlign: 'center' },
  volRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 140, gap: 6 },
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
  volFill: { width: '100%', borderRadius: 6, minHeight: 4 },
  volDay: { fontFamily: fonts.medium, fontSize: 11, color: palette.textTertiary },
  section: { gap: 12 },
  timeline: { gap: 0 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 20, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: palette.white, zIndex: 1 },
  tlLine: { width: 2, flex: 1, minHeight: 40, backgroundColor: glass.strokeSoft, marginVertical: -2 },
  tlCardOuter: { flex: 1, marginBottom: 16 },
  tlCardInner: { gap: 10 },
  tlThumb: {
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderWidth: 1,
    borderColor: glass.stroke,
  },
  miniBars: { flexDirection: 'row', gap: 10 },
  miniLbl: { fontFamily: fonts.medium, fontSize: 10, color: palette.textTertiary, letterSpacing: 0.5 },
  miniTrack: { height: 6, borderRadius: 3, backgroundColor: palette.borderLight, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontFamily: fonts.semibold, fontSize: 12 },
  caseLabel: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },
  tlDesc: { fontFamily: fonts.regular, fontSize: 14, color: palette.text, lineHeight: 20 },
  compareBox: { padding: 10, borderRadius: radii.sm, backgroundColor: `${palette.primary}10` },
  micro: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  compareTxt: { fontFamily: fonts.regular, fontSize: 13, color: palette.textSecondary, marginTop: 6, lineHeight: 18 },
});
