import React from 'react';
import { View, StyleSheet, Platform, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import type { TargetRect } from '../../../domain/types';

const PAD = 4; // 4px buffer around target element

interface TourSpotlightProps {
  targetRect: TargetRect | null;
  onPress: () => void;
}

export default function TourSpotlight({ targetRect, onPress }: TourSpotlightProps) {
  const { width: SW, height: SH } = useWindowDimensions();

  if (!targetRect || SW === 0 || SH === 0) {
    return (
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={[styles.fixed, { width: SW, height: SH, backgroundColor: 'rgba(0,0,0,0.70)' }]} />
      </TouchableWithoutFeedback>
    );
  }

  // Cutout with 4px padding buffer
  const cx = Math.max(0, targetRect.x - PAD);
  const cy = Math.max(0, targetRect.y - PAD);
  const cw = Math.min(targetRect.width + PAD * 2, SW - cx);
  const ch = Math.min(targetRect.height + PAD * 2, SH - cy);

  const topH = Math.max(0, cy);
  const botH = Math.max(0, SH - cy - ch);
  const leftW = Math.max(0, cx);
  const rightW = Math.max(0, SW - cx - cw);

  return (
    <View style={[styles.fixed, { width: SW, height: SH }]} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={[styles.fixed, { width: SW, height: SH }]}>
          {topH > 0 && <View style={[styles.dark, { top: 0, left: 0, width: SW, height: topH }]} />}
          {botH > 0 && <View style={[styles.dark, { top: cy + ch, left: 0, width: SW, height: botH }]} />}
          {leftW > 0 && <View style={[styles.dark, { top: cy, left: 0, width: leftW, height: ch }]} />}
          {rightW > 0 && <View style={[styles.dark, { top: cy, left: cx + cw, width: rightW, height: ch }]} />}
        </View>
      </TouchableWithoutFeedback>

      {/* Mint border around cutout — no background, no shadow, no elevation */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: cy,
          left: cx,
          width: cw,
          height: ch,
          borderRadius: 2,
          borderWidth: 2,
          borderColor: '#2DD4BF',
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fixed: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  dark: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
  },
});
