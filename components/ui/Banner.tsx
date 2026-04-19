import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, palette, radii } from '../../constants/designTokens';

export type BannerTone = 'info' | 'warning' | 'danger' | 'success';

type Props = {
  tone?: BannerTone;
  title: string;
  message?: string;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
};

const TONES: Record<BannerTone, { bg: string; border: string; text: string; iconColor: string }> = {
  info: {
    bg: 'rgba(0,229,204,0.10)',
    border: 'rgba(0,229,204,0.25)',
    text: palette.text,
    iconColor: palette.primary,
  },
  warning: {
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.30)',
    text: palette.text,
    iconColor: palette.statusMonitor,
  },
  danger: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.30)',
    text: palette.text,
    iconColor: palette.statusAlert,
  },
  success: {
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.25)',
    text: palette.text,
    iconColor: palette.statusGood,
  },
};

const DEFAULT_ICONS: Record<BannerTone, keyof typeof Feather.glyphMap> = {
  info: 'info',
  warning: 'alert-triangle',
  danger: 'alert-octagon',
  success: 'check-circle',
};

export function Banner({ tone = 'info', title, message, icon, style }: Props) {
  const t = TONES[tone];
  const ic = icon ?? DEFAULT_ICONS[tone];
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: t.bg, borderColor: t.border },
        style,
      ]}
    >
      <Feather name={ic} size={18} color={t.iconColor} style={{ marginTop: 2 }} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {message ? <Text style={[styles.message, { color: t.text }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
  message: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
