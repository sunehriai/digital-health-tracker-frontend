import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, TouchableWithoutFeedback, Platform, useWindowDimensions } from 'react-native';
import { useAppPreferences } from '../../hooks/useAppPreferences';
import { measureElement } from '../../utils/measureElement';
import type { TargetRect } from '../../../domain/types';

const PAD = 4;
const ARROW_SIZE = 8;
const TOOLTIP_MARGIN = 16;

interface SpotlightHintProps {
  targetRect: TargetRect;
  title: string;
  message: string;
  onDismiss: () => void;
  borderRadius?: number;
}

export default function SpotlightHint({ targetRect, title, message, onDismiss, borderRadius = 2 }: SpotlightHintProps) {
  const { prefs: { reducedMotion } } = useAppPreferences();
  const { width: SW, height: SH } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  // On native, adjust for parent container position
  const [containerOrigin, setContainerOrigin] = useState({ x: 0, y: 0 });
  const containerMeasuredRef = useRef(false);
  const handleLayout = useCallback((e: any) => {
    if (Platform.OS === 'web' || containerMeasuredRef.current) return;
    measureElement(e.target, (x: number, y: number) => {
      containerMeasuredRef.current = true;
      setContainerOrigin({ x, y });
    });
  }, []);

  const adjustedRect = Platform.OS === 'web' ? targetRect : {
    x: targetRect.x - containerOrigin.x,
    y: targetRect.y - containerOrigin.y,
    width: targetRect.width,
    height: targetRect.height,
  };

  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [reducedMotion]);

  // Cutout with 4px padding
  const cx = Math.max(0, adjustedRect.x - PAD);
  const cy = Math.max(0, adjustedRect.y - PAD);
  const cw = Math.min(adjustedRect.width + PAD * 2, SW - cx);
  const ch = Math.min(adjustedRect.height + PAD * 2, SH - cy);

  const topH = Math.max(0, cy);
  const botH = Math.max(0, SH - cy - ch);
  const leftW = Math.max(0, cx);
  const rightW = Math.max(0, SW - cx - cw);

  // Tooltip position
  const position = adjustedRect.y / SH > 0.5 ? 'above' : 'below';
  const tooltipTop = position === 'below' ? cy + ch + ARROW_SIZE + 8 : undefined;
  const tooltipBottom = position === 'above' ? SH - cy + ARROW_SIZE + 8 : undefined;
  const arrowLeft = Math.min(
    Math.max(adjustedRect.x + adjustedRect.width / 2 - TOOLTIP_MARGIN - ARROW_SIZE, 20),
    SW - TOOLTIP_MARGIN * 2 - ARROW_SIZE * 2 - 20
  );

  const fixedStyle = { position: Platform.OS === 'web' ? 'fixed' as any : 'absolute' as any };

  return (
    <Animated.View style={[{ ...fixedStyle, top: 0, left: 0, width: SW, height: SH, zIndex: 9999 }, { opacity }]} pointerEvents="box-none" onLayout={handleLayout}>
      {/* Dark overlay with cutout */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={{ ...fixedStyle, top: 0, left: 0, width: SW, height: SH }}>
          {topH > 0 && <View style={[styles.dark, { top: 0, left: 0, width: SW, height: topH }]} />}
          {botH > 0 && <View style={[styles.dark, { top: cy + ch, left: 0, width: SW, height: botH }]} />}
          {leftW > 0 && <View style={[styles.dark, { top: cy, left: 0, width: leftW, height: ch }]} />}
          {rightW > 0 && <View style={[styles.dark, { top: cy, left: cx + cw, width: rightW, height: ch }]} />}
        </View>
      </TouchableWithoutFeedback>

      {/* Mint border */}
      <View pointerEvents="none" style={{ position: 'absolute', top: cy, left: cx, width: cw, height: ch, borderRadius, borderWidth: 2, borderColor: '#2DD4BF', backgroundColor: 'transparent' }} />

      {/* Tooltip */}
      <View
        style={[
          styles.tooltip,
          {
            left: TOOLTIP_MARGIN,
            right: TOOLTIP_MARGIN,
            ...(tooltipTop !== undefined ? { top: tooltipTop } : {}),
            ...(tooltipBottom !== undefined ? { bottom: tooltipBottom } : {}),
          },
        ]}
        pointerEvents="box-none"
      >
        {position === 'below' && (
          <View style={[styles.arrowUp, { left: arrowLeft }]} />
        )}

        <View style={styles.tooltipCard}>
          <Text style={styles.tooltipTitle}>{title}</Text>
          <Text style={styles.tooltipMessage}>{message}</Text>
          <TouchableOpacity style={styles.gotItButton} activeOpacity={0.8} onPress={onDismiss}>
            <Text style={styles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </View>

        {position === 'above' && (
          <View style={[styles.arrowDown, { left: arrowLeft }]} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dark: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
  },
  tooltip: {
    position: 'absolute',
  },
  tooltipCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2DD4BF',
    padding: 16,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  tooltipMessage: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 14,
  },
  gotItButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#2DD4BF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  arrowUp: {
    position: 'absolute',
    top: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2DD4BF',
    zIndex: 1,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2DD4BF',
  },
});
