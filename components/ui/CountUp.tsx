import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  to: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
};

export function CountUp({ to, decimals = 2, duration = 900, suffix = '', style }: Props) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const tick = (t: number) => {
      if (startTime.current === null) startTime.current = t;
      const elapsed = t - startTime.current;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(eased * to);
      if (p < 1) rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [to, duration]);

  return (
    <Text style={style}>
      {value.toFixed(decimals)}
      {suffix}
    </Text>
  );
}
