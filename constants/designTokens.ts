/**
 * DiseaseX — Clinical Instrument design system.
 * Dark obsidian base, bioluminescent signal accents, instrument-grade typography.
 */

import { StyleSheet } from 'react-native';

export const palette = {
  primary: '#5BFFB0',
  primaryLight: '#A6FFD4',
  primaryMuted: 'rgba(91,255,176,0.18)',
  secondary: '#0B0D11',

  background: '#07080B',
  backgroundSecondary: '#0F1116',
  backgroundTertiary: 'rgba(15,17,22,0.72)',

  text: '#F5F6F8',
  textSecondary: '#A0A4AB',
  textTertiary: '#5C6068',

  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.04)',

  statusGood: '#5BFFB0',
  statusMonitor: '#FFD15B',
  statusAlert: '#FF5577',
  inflammation: '#FF8A3D',

  white: '#FFFFFF',
} as const;

export const signal = {
  base: '#5BFFB0',
  glow: 'rgba(91,255,176,0.35)',
  glowSoft: 'rgba(91,255,176,0.12)',
  ink: '#062A1B',
} as const;

export const surface = {
  base: 'rgba(255,255,255,0.04)',
  raised: 'rgba(255,255,255,0.06)',
  elevated: 'rgba(255,255,255,0.08)',
  sunken: 'rgba(0,0,0,0.20)',
} as const;

export const hairline = {
  thin: 'rgba(255,255,255,0.06)',
  default: 'rgba(255,255,255,0.10)',
  strong: 'rgba(255,255,255,0.16)',
  width: StyleSheet.hairlineWidth,
} as const;

export const glass = {
  stroke: 'rgba(255,255,255,0.10)',
  strokeSoft: 'rgba(255,255,255,0.06)',
  fill: 'rgba(255,255,255,0.04)',
  fillStrong: 'rgba(255,255,255,0.08)',
  tint: 'rgba(91,255,176,0.05)',
} as const;

export const gradients = {
  screen: ['#0B0D11', '#08090C', '#06070A', '#040508'] as const,
  vignetteGood: ['rgba(91,255,176,0.10)', 'rgba(91,255,176,0)'] as const,
  vignetteMonitor: ['rgba(255,209,91,0.10)', 'rgba(255,209,91,0)'] as const,
  vignetteAlert: ['rgba(255,85,119,0.12)', 'rgba(255,85,119,0)'] as const,
  imageScrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as const,
} as const;

export type HealingStatus = 'good' | 'monitor' | 'alert';

export const healingTokens: Record<
  HealingStatus,
  { bg: string; border: string; label: string; message: string; accent: string }
> = {
  good: {
    bg: 'rgba(91,255,176,0.08)',
    border: 'rgba(91,255,176,0.22)',
    accent: palette.statusGood,
    label: 'Low immediate risk (mock)',
    message: 'Syndromic fit below urgent threshold. Continue observation per local SOP.',
  },
  monitor: {
    bg: 'rgba(255,209,91,0.08)',
    border: 'rgba(255,209,91,0.22)',
    accent: palette.statusMonitor,
    label: 'Monitor — test & treat (mock)',
    message: 'RDT / referral criteria may apply. Re-check vitals within guideline window.',
  },
  alert: {
    bg: 'rgba(255,85,119,0.08)',
    border: 'rgba(255,85,119,0.22)',
    accent: palette.statusAlert,
    label: 'Immediate treatment lane (mock)',
    message: 'Severe features flagged. Start protocol steps and arrange transport if indicated.',
  },
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 8,
  },
  logo: {
    shadowColor: signal.base,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  glow: {
    shadowColor: signal.base,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 0,
  },
  auraGood: {
    shadowColor: palette.statusGood,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 0,
  },
  auraMonitor: {
    shadowColor: palette.statusMonitor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 0,
  },
  auraAlert: {
    shadowColor: palette.statusAlert,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 0,
  },
} as const;

export const radii = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 28,
  card: 22,
  pill: 999,
} as const;

export const space = {
  padH: 22,
  gap: 16,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  section: 28,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  caps: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.textTertiary,
    textTransform: 'uppercase' as const,
  },
  capsBright: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.textSecondary,
    textTransform: 'uppercase' as const,
  },
  bodyM: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  bodyS: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: palette.textSecondary,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 30,
    color: palette.text,
    letterSpacing: -0.5,
  },
  display: {
    fontFamily: fonts.bold,
    fontSize: 72,
    lineHeight: 76,
    color: palette.text,
    letterSpacing: -2,
  },
  displayUnit: {
    fontFamily: fonts.medium,
    fontSize: 22,
    color: palette.textSecondary,
    letterSpacing: -0.5,
  },
} as const;
