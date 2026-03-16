/**
 * 3D two-tone SVG capsule icon with glow.
 * Uses deterministic colors derived from the medication name.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getCapsuleColors } from '../../domain/utils/medicationColor';

interface CapsuleIconProps {
  name: string;
  size?: number;
  paused?: boolean;
  mutedColor?: string;
}

function CapsuleIconInner({ name, size = 24, paused = false, mutedColor = '#6B6B73' }: CapsuleIconProps) {
  const { body, cap, highlight } = getCapsuleColors(name);

  const w = size;
  const h = size;
  const rx = w * 0.3; // Rounded ends

  // When paused, use muted desaturated color
  const bodyColor = paused ? mutedColor : body;
  const capColor = paused ? `${mutedColor}AA` : cap;

  return (
    <View style={[styles.container, { width: w, height: h }]}>
      {/* Glow shadow */}
      {!paused && (
        <View
          style={[
            styles.glow,
            {
              width: w,
              height: h,
              shadowColor: body,
              shadowOpacity: 0.4,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            },
          ]}
        />
      )}
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <LinearGradient id={`body-${name}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={highlight} stopOpacity={0.6} />
            <Stop offset="0.5" stopColor={bodyColor} stopOpacity={1} />
            <Stop offset="1" stopColor={bodyColor} stopOpacity={0.9} />
          </LinearGradient>
          <LinearGradient id={`cap-${name}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={highlight} stopOpacity={0.4} />
            <Stop offset="0.5" stopColor={capColor} stopOpacity={1} />
            <Stop offset="1" stopColor={capColor} stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        {/* Body (bottom half) */}
        <Rect
          x={0}
          y={h * 0.45}
          width={w}
          height={h * 0.55}
          rx={rx}
          fill={`url(#body-${name})`}
        />
        {/* Cap (top half) */}
        <Rect
          x={0}
          y={0}
          width={w}
          height={h * 0.55}
          rx={rx}
          fill={`url(#cap-${name})`}
        />
        {/* Highlight strip for 3D effect */}
        <Rect
          x={w * 0.2}
          y={h * 0.1}
          width={w * 0.12}
          height={h * 0.8}
          rx={w * 0.06}
          fill="rgba(255, 255, 255, 0.25)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
});

export default React.memo(CapsuleIconInner);
