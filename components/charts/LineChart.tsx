import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { fonts, palette } from '../../constants/designTokens';

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
  yMax?: number;
  xLabelFormatter?: (x: number, i: number) => string;
  emptyLabel?: string;
};

export function LineChart({
  data,
  width = 320,
  height = 160,
  color = palette.primary,
  yMax,
  xLabelFormatter,
  emptyLabel = 'No data yet',
}: Props) {
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;

  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.medium, color: palette.textTertiary }}>
          {emptyLabel}
        </Text>
      </View>
    );
  }

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const computedYMax = yMax ?? Math.max(1, ...ys);
  const yMin = 0;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const toX = (x: number) =>
    xMax === xMin ? padL + innerW / 2 : padL + ((x - xMin) / (xMax - xMin)) * innerW;
  const toY = (y: number) =>
    padT + innerH - ((y - yMin) / (computedYMax - yMin)) * innerH;

  const d = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
    .join(' ');

  const gridlines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = padT + innerH - f * innerH;
    const val = (computedYMax - yMin) * f + yMin;
    return { y, label: formatValue(val) };
  });

  return (
    <View>
      <Svg width={width} height={height}>
        {gridlines.map((g, i) => (
          <Line
            key={`g${i}`}
            x1={padL}
            x2={width - padR}
            y1={g.y}
            y2={g.y}
            stroke={palette.borderLight}
            strokeWidth={1}
          />
        ))}
        <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {data.map((p, i) => (
          <Circle key={`p${i}`} cx={toX(p.x)} cy={toY(p.y)} r={3.5} fill={color} />
        ))}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: padL }}>
        {data.length > 1 ? (
          <>
            <Label text={xLabelFormatter?.(xs[0], 0) ?? ''} />
            {data.length > 2 ? (
              <Label
                text={
                  xLabelFormatter?.(xs[Math.floor(xs.length / 2)], Math.floor(xs.length / 2)) ?? ''
                }
              />
            ) : null}
            <Label text={xLabelFormatter?.(xs[xs.length - 1], xs.length - 1) ?? ''} />
          </>
        ) : (
          <Label text={xLabelFormatter?.(xs[0], 0) ?? ''} />
        )}
      </View>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: palette.textTertiary }}>
      {text}
    </Text>
  );
}

function formatValue(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(1);
}
