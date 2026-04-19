import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { fonts, hairline, palette, radii, type HealingStatus } from '../../constants/designTokens';

type Props = {
  status: HealingStatus;
  label: string;
  pulse?: boolean;
};

const STATUS_COLOR: Record<HealingStatus, string> = {
  good: palette.statusGood,
  monitor: palette.statusMonitor,
  alert: palette.statusAlert,
};

export function StatusChip({ status, label, pulse = true }: Props) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseAnim]);

  const color = STATUS_COLOR[status];
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.2] });

  return (
    <View style={[styles.wrap, { borderColor: `${color}55` }]}>
      <View style={styles.dotWrap}>
        <Animated.View
          style={[
            styles.dotHalo,
            { backgroundColor: color, transform: [{ scale }], opacity },
          ]}
        />
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: hairline.width,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignSelf: 'flex-start',
  },
  dotWrap: {
    width: 10,
    height: 10,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotHalo: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
