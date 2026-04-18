/**
 * DiseaseX — field-first triage UI: teal primary, slate text, high-contrast status.
 * Glass tokens pair with expo-blur + translucent layers.
 */

export const palette = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryMuted: '#5EEAD4',
  secondary: '#1E293B',
  background: '#F8FAFC',
  backgroundSecondary: '#ECFEFF',
  backgroundTertiary: 'rgba(255,255,255,0.72)',
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: 'rgba(13,148,136,0.18)',
  borderLight: 'rgba(255,255,255,0.55)',
  statusGood: '#059669',
  statusMonitor: '#D97706',
  statusAlert: '#DC2626',
  inflammation: '#EA580C',
  white: '#FFFFFF',
} as const;

export const glass = {
  stroke: 'rgba(255,255,255,0.78)',
  strokeSoft: 'rgba(13,148,136,0.12)',
  fill: 'rgba(255,255,255,0.42)',
  fillStrong: 'rgba(255,255,255,0.62)',
  tint: 'rgba(13,148,136,0.08)',
} as const;

/** LinearGradient color stops for ScreenBackdrop */
export const gradients = {
  screen: ['#CFFAFE', '#ECFDF5', '#F1F5F9', '#F8FAFC'] as const,
} as const;

export type HealingStatus = 'good' | 'monitor' | 'alert';

/** Triage band copy (mock cycling on dashboard). */
export const healingTokens: Record<
  HealingStatus,
  { bg: string; border: string; label: string; message: string }
> = {
  good: {
    bg: `${palette.statusGood}16`,
    border: `${palette.statusGood}50`,
    label: 'Low immediate risk (mock)',
    message: 'Syndromic fit below urgent threshold. Continue observation per local SOP.',
  },
  monitor: {
    bg: `${palette.statusMonitor}18`,
    border: `${palette.statusMonitor}50`,
    label: 'Monitor — test & treat (mock)',
    message: 'RDT / referral criteria may apply. Re-check vitals within guideline window.',
  },
  alert: {
    bg: `${palette.statusAlert}16`,
    border: `${palette.statusAlert}50`,
    label: 'Immediate treatment lane (mock)',
    message: 'Severe features flagged. Start protocol steps and arrange transport if indicated.',
  },
};

export const shadow = {
  card: {
    shadowColor: palette.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  logo: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 0,
  },
} as const;

export const radii = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 28,
} as const;

export const space = {
  padH: 22,
  gap: 16,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
