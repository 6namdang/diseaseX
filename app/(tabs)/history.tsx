import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { fonts, palette, radii, space } from '../../constants/designTokens';
import {
  activeRedFlags,
  getPhotosForAssessment,
  listAssessments,
} from '../../db/assessmentRepo';
import { listEscalations } from '../../db/escalationRepo';
import type { Assessment, AssessmentPhoto, Escalation, RedFlagKey } from '../../db/types';
import { useContentInsets } from '../../hooks/useContentInsets';

const RED_FLAG_LABEL: Record<RedFlagKey, string> = {
  confused: 'confusion',
  seizures: 'seizures',
  unable_to_walk: 'unable to walk',
  dark_urine: 'dark urine',
  yellow_eyes: 'yellow eyes',
  persistent_vomiting: 'vomiting+dehydration',
};

export default function HistoryScreen() {
  const insets = useContentInsets();
  const db = useSQLiteContext();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [photosById, setPhotosById] = useState<Record<number, AssessmentPhoto[]>>({});
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [a, e] = await Promise.all([listAssessments(db, 180), listEscalations(db, 100)]);
    setAssessments(a);
    setEscalations(e);
    const byId: Record<number, AssessmentPhoto[]> = {};
    await Promise.all(
      a.map(async (row) => {
        byId[row.id] = await getPhotosForAssessment(db, row.id);
      }),
    );
    setPhotosById(byId);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const escalationsByAssessment = new Map<number, Escalation[]>();
  for (const e of escalations) {
    const arr = escalationsByAssessment.get(e.assessmentId) ?? [];
    arr.push(e);
    escalationsByAssessment.set(e.assessmentId, arr);
  }

  return (
    <ScreenBackdrop>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: space.padH,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }
      >
        <Text style={styles.h1}>History</Text>
        <Text style={styles.sub}>
          Every assessment you have logged, most recent first.
        </Text>

        {assessments.length === 0 ? (
          <GlassCard>
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
              <Feather name="inbox" size={28} color={palette.textTertiary} />
              <Text style={styles.empty}>No assessments yet.</Text>
            </View>
          </GlassCard>
        ) : (
          assessments.map((a) => {
            const photos = photosById[a.id] ?? [];
            const flags = activeRedFlags(a);
            const esc = escalationsByAssessment.get(a.id) ?? [];
            return (
              <GlassCard key={a.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.when}>{formatDateTime(a.createdAt)}</Text>
                    <Text style={styles.sev}>
                      Severity:{' '}
                      <Text
                        style={{
                          fontFamily: fonts.bold,
                          color:
                            flags.length > 0
                              ? palette.statusAlert
                              : a.severityScore > 15
                                ? palette.statusMonitor
                                : palette.statusGood,
                        }}
                      >
                        {a.severityScore.toFixed(1)}
                      </Text>
                    </Text>
                  </View>
                  {flags.length > 0 ? (
                    <View style={styles.flagPill}>
                      <Feather name="alert-triangle" size={14} color={palette.white} />
                      <Text style={styles.flagPillText}>{flags.length} red flag{flags.length > 1 ? 's' : ''}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.stats}>
                  <Stat label="Fever" value={boolLabel(a.fever)} extra={a.feverTempC ? `${a.feverTempC}°C` : undefined} />
                  <Stat label="Vomiting" value={boolLabel(a.vomiting)} />
                  <Stat
                    label="Keeps fluids"
                    value={a.canKeepFluidsDown === null ? '—' : a.canKeepFluidsDown ? 'yes' : 'no'}
                  />
                  <Stat
                    label="Onset"
                    value={
                      a.symptomOnsetDaysAgo != null ? `${a.symptomOnsetDaysAgo}d ago` : '—'
                    }
                  />
                </View>

                {a.symptoms.length > 0 && (
                  <View style={styles.chipRow}>
                    {a.symptoms.map((s) => (
                      <View key={s} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{s.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {flags.length > 0 && (
                  <View style={styles.chipRow}>
                    {flags.map((f) => (
                      <View key={f} style={[styles.tagChip, styles.alertChip]}>
                        <Text style={[styles.tagChipText, { color: palette.white }]}>
                          {RED_FLAG_LABEL[f]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {photos.length > 0 && (
                  <ScrollView
                    horizontal
                    style={{ marginTop: 10 }}
                    showsHorizontalScrollIndicator={false}
                  >
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {photos.map((p) => (
                        <View key={p.id} style={styles.thumbWrap}>
                          <Image source={{ uri: p.fileUri }} style={styles.thumb} />
                          <Text style={styles.thumbLabel}>{p.symptomTag}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {a.notes ? (
                  <Text style={styles.notes}>"{a.notes}"</Text>
                ) : null}

                {esc.length > 0 && (
                  <View style={styles.escBlock}>
                    {esc.map((e) => (
                      <View key={e.id} style={styles.escRow}>
                        <Feather
                          name={
                            e.status === 'sent'
                              ? 'check-circle'
                              : e.status === 'failed' || e.status === 'disabled'
                                ? 'x-circle'
                                : 'clock'
                          }
                          size={14}
                          color={
                            e.status === 'sent'
                              ? palette.statusGood
                              : e.status === 'failed' || e.status === 'disabled'
                                ? palette.statusAlert
                                : palette.statusMonitor
                          }
                        />
                        <Text style={styles.escText}>
                          {e.status === 'sent'
                            ? `SMS sent to ${e.clinicianPhone}`
                            : e.status === 'failed'
                              ? `SMS failed: ${e.errorMessage ?? 'unknown'}`
                              : e.status === 'disabled'
                                ? 'SMS skipped: Twilio not configured'
                                : 'Cooldown — clinician already alerted recently'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </ScreenBackdrop>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {extra ? <Text style={{ color: palette.textTertiary }}> · {extra}</Text> : null}
      </Text>
    </View>
  );
}

function boolLabel(v: boolean | null): string {
  if (v === null) return '—';
  return v ? 'yes' : 'no';
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const date = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} · ${hh}:${mm}`;
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  h1: { fontFamily: fonts.bold, fontSize: 22, color: palette.secondary },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: palette.textSecondary },
  empty: { fontFamily: fonts.medium, fontSize: 14, color: palette.textTertiary },
  row: { flexDirection: 'row', alignItems: 'center' },
  when: { fontFamily: fonts.semibold, fontSize: 14, color: palette.secondary },
  sev: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  flagPill: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: palette.statusAlert,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  flagPillText: { fontFamily: fonts.semibold, fontSize: 11, color: palette.white },
  stats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: palette.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.secondary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  alertChip: {
    borderColor: palette.statusAlert,
    backgroundColor: palette.statusAlert,
  },
  tagChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.secondary,
    textTransform: 'capitalize',
  },
  thumbWrap: { gap: 2 },
  thumb: { width: 100, height: 80, borderRadius: radii.sm, backgroundColor: palette.background },
  thumbLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: palette.textTertiary,
    textTransform: 'capitalize',
  },
  notes: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    fontSize: 13,
    color: palette.textSecondary,
  },
  escBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 6,
  },
  escRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  escText: { fontFamily: fonts.medium, fontSize: 12, color: palette.textSecondary, flex: 1 },
});
