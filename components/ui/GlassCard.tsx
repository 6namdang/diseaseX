import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { glass, radii, surface } from '../../constants/designTokens';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Blur strength (native only). */
  intensity?: number;
};

export function GlassCard({ children, style, contentStyle, intensity = 32 }: Props) {
  const r = radii.card;

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
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={[StyleSheet.absoluteFillObject, { borderRadius: r }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.topHighlight,
          { borderTopLeftRadius: r, borderTopRightRadius: r },
        ]}
      />
      <View style={[styles.inner, { borderRadius: r }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.stroke,
    backgroundColor: surface.base,
  },
  inner: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  webOuter: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.stroke,
    backgroundColor: surface.elevated,
    overflow: 'hidden',
  },
  webInner: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
