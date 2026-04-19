import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { fonts, palette, radii } from '../../constants/designTokens';

type Bar = { label: string; value: number };

type Props = {
  data: Bar[];
  width?: number;
  height?: number;
  color?: string;
  emptyLabel?: string;
};

export function BarChart({
  data,
  width = 320,
  height = 150,
  color = palette.primaryLight,
  emptyLabel = 'No data yet',
}: Props) {
  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.medium, color: palette.textTertiary }}>
          {emptyLabel}
        </Text>
      </View>
    );
  }
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 6;
  const barW = Math.max(8, (innerW - barGap * (data.length - 1)) / data.length);

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = padL + i * (barW + barGap);
          const y = padT + innerH - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(1, h)}
              rx={Math.min(barW / 2, radii.sm / 2)}
              fill={color}
            />
          );
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: padL,
        }}
      >
        {data.map((d, i) => (
          <Text
            key={i}
            style={{
              fontFamily: fonts.medium,
              fontSize: 10,
              color: palette.textTertiary,
              width: barW,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
