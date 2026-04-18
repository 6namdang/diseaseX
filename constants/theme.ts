export const COLORS = {
  // Backgrounds
  bg:              '#080C12',
  surface:         '#0F1520',
  surfaceElevated: '#162030',
  border:          '#1E2D42',
  inputBg:         '#0D1825',
  cardBg:          '#0F1828',

  // Severity
  red:       '#FF3B55',
  redDim:    '#2A0A10',
  yellow:    '#FFB800',
  yellowDim: '#2A1E00',
  green:     '#00E676',
  greenDim:  '#002A14',

  // Accent
  accent:    '#00B4FF',
  accentDim: '#001E2A',

  // Text
  text:          '#E8F0FE',
  textSecondary: '#8BA3C4',
  textMuted:     '#4A6080',
};

export const SEVERITY_CONFIG = {
  RED: {
    color:  '#FF3B55',
    bg:     '#2A0A10',
    border: '#FF3B5540',
    icon:   'alert-circle',
    label:  'CRITICAL',
  },
  YELLOW: {
    color:  '#FFB800',
    bg:     '#2A1E00',
    border: '#FFB80040',
    icon:   'warning',
    label:  'URGENT',
  },
  GREEN: {
    color:  '#00E676',
    bg:     '#002A14',
    border: '#00E67640',
    icon:   'checkmark-circle',
    label:  'STABLE',
  },
};