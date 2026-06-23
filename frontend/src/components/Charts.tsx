import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import { theme } from '@/src/lib/theme';

type Point = { label: string; value: number };

export function BarChart({ data, height = 140, color = theme.primary, testID }: { data: Point[]; height?: number; color?: string; testID?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 18;
  const gap = 14;
  const width = data.length * (barW + gap);
  return (
    <View testID={testID}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 30);
          const x = i * (barW + gap);
          const y = height - 20 - h;
          return (
            <Rect key={`b-${i}`} x={x} y={y} width={barW} height={Math.max(h, 2)} rx={6} fill={color} opacity={d.value === 0 ? 0.25 : 1} />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {data.map((d, i) => (
          <Text key={`l-${i}`} style={[styles.lbl, { width: barW + gap, textAlign: 'center' }]}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

export function LineChart({ data, height = 120, testID }: { data: Point[]; height?: number; testID?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 280;
  const stepX = w / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => {
    const x = i * stepX;
    const y = height - 16 - (d.value / max) * (height - 30);
    return { x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <View testID={testID}>
      <Svg width={w} height={height}>
        <Line x1={0} y1={height - 16} x2={w} y2={height - 16} stroke={theme.border} strokeWidth={1} />
        {pts.length > 1 && <Path d={path} stroke={theme.primary} fill="none" strokeWidth={2.5} />}
        {pts.map((p, i) => (
          <Circle key={`p-${i}`} cx={p.x} cy={p.y} r={3.5} fill={theme.primary} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: { color: theme.textMute, fontSize: 10, marginTop: 4 },
});
