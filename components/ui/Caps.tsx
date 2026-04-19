import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { fonts, palette, signal } from '../../constants/designTokens';

type Props = {
  children: React.ReactNode;
  tone?: 'tertiary' | 'secondary' | 'signal';
  size?: 'xs' | 'sm';
  style?: StyleProp<TextStyle>;
};

export function Caps({ children, tone = 'tertiary', size = 'sm', style }: Props) {
  const color =
    tone === 'signal' ? signal.base : tone === 'secondary' ? palette.textSecondary : palette.textTertiary;
  const fontSize = size === 'xs' ? 10 : 11;
  return <Text style={[styles.base, { color, fontSize }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.semibold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
