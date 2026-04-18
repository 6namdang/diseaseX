import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts, palette } from '../../constants/designTokens';

type Props = {
  size?: number;
  strokeWidth?: number;
  percent: number;
  color: string;
  label?: string;
};

export function DonutRing({ size = 72, strokeWidth = 8, percent, color, label }: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const arc = (p / 100) * c;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View style={{ height: size, width: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={palette.borderLight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arc} ${c}`}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: palette.text }}>
          {Math.round(percent)}%
        </Text>
      </View>
      {label ? (
        <Text
          style={{
            marginTop: 6,
            fontFamily: fonts.medium,
            fontSize: 11,
            color: palette.textSecondary,
            textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
