import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { listAssessments } from '../db/assessmentRepo';
import { listEscalations } from '../db/escalationRepo';
import type { Assessment, Escalation, RedFlagKey } from '../db/types';

export type DailyBucket = {
  day: string; // "MM-DD"
  startOfDay: number;
  count: number;
  maxSeverity: number;
  avgSeverity: number;
  anyRedFlag: boolean;
};

export type AssessmentStats = {
  loading: boolean;
  total: number;
  last7Days: DailyBucket[];
  latest: Assessment | null;
  previous: Assessment | null;
  severitySeries: { x: number; y: number }[];
  redFlagTotals: Record<RedFlagKey, number>;
  escalations: Escalation[];
  refresh: () => Promise<void>;
};

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

export function useAssessmentStats(): AssessmentStats {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);

  const refresh = useCallback(async () => {
    const [a, e] = await Promise.all([listAssessments(db, 180), listEscalations(db, 50)]);
    setAssessments(a);
    setEscalations(e);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const today = startOfDay(Date.now());
  const days: DailyBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * MS_DAY;
    days.push({
      day: formatDay(dayStart),
      startOfDay: dayStart,
      count: 0,
      maxSeverity: 0,
      avgSeverity: 0,
      anyRedFlag: false,
    });
  }
  const byDay = new Map(days.map((d) => [d.startOfDay, d]));
  const severityTotals = new Map<number, number>();
  for (const a of assessments) {
    const k = startOfDay(a.createdAt);
    const bucket = byDay.get(k);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.maxSeverity = Math.max(bucket.maxSeverity, a.severityScore);
    severityTotals.set(k, (severityTotals.get(k) ?? 0) + a.severityScore);
    if (Object.values(a.redFlags).some(Boolean)) bucket.anyRedFlag = true;
  }
  for (const bucket of days) {
    if (bucket.count > 0) {
      bucket.avgSeverity =
        Math.round(((severityTotals.get(bucket.startOfDay) ?? 0) / bucket.count) * 10) / 10;
    }
  }

  const severitySeries = [...assessments]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-14)
    .map((a) => ({ x: a.createdAt, y: a.severityScore }));

  const redFlagTotals: Record<RedFlagKey, number> = {
    confused: 0,
    seizures: 0,
    unable_to_walk: 0,
    dark_urine: 0,
    yellow_eyes: 0,
    persistent_vomiting: 0,
  };
  for (const a of assessments) {
    for (const k of Object.keys(redFlagTotals) as RedFlagKey[]) {
      if (a.redFlags[k]) redFlagTotals[k] += 1;
    }
  }

  return {
    loading,
    total: assessments.length,
    last7Days: days,
    latest: assessments[0] ?? null,
    previous: assessments[1] ?? null,
    severitySeries,
    redFlagTotals,
    escalations,
    refresh,
  };
}
