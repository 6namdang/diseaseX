import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { glass, radii } from '../../constants/designTokens';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Blur strength (native only). */
  intensity?: number;
};

export function GlassCard({ children, style, contentStyle, intensity = 42 }: Props) {
  const r = radii.lg;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webOuter, { borderRadius: r }, style]}>
        <View style={[styles.webInner, { borderRadius: r }, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.outer, { borderRadius: r }, style]}>
      <BlurView
        intensity={intensity}
        tint="light"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={[StyleSheet.absoluteFillObject, { borderRadius: r }]}
      />
      <View style={[styles.inner, { borderRadius: r }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  inner: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  webOuter: {
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fillStrong,
    overflow: 'hidden',
  },
  webInner: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
