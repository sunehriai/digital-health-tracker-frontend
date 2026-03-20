import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import type { TargetRect } from '../../../domain/types';

const ARROW_SIZE = 8;
const MARGIN = 16;

interface TourTooltipProps {
  title: string;
  message: string;
  targetRect: TargetRect | null;
  stepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export default function TourTooltip({
  title,
  message,
  targetRect,
  stepIndex,
  totalSteps,
  isLastStep,
  onNext,
  onSkip,
}: TourTooltipProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isProcessingRef = useRef(false);

  const handleNext = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setTimeout(() => { isProcessingRef.current = false; }, 200);
    onNext();
  };

  // Position tooltip above or below target
  const position = targetRect
    ? (targetRect.y / screenH > 0.5 ? 'above' : 'below')
    : 'below';

  const tooltipStyle: any = {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    left: MARGIN,
    right: MARGIN,
    zIndex: 10000,
  };

  if (targetRect) {
    if (position === 'below') {
      tooltipStyle.top = targetRect.y + targetRect.height + 12 + ARROW_SIZE;
    } else {
      tooltipStyle.bottom = screenH - targetRect.y + 12 + ARROW_SIZE;
    }
  } else {
    tooltipStyle.top = screenH * 0.35;
  }

  // Arrow horizontal position — center on target
  const arrowLeft = targetRect
    ? Math.min(Math.max(targetRect.x + targetRect.width / 2 - MARGIN - ARROW_SIZE, 20), screenW - MARGIN * 2 - ARROW_SIZE * 2 - 20)
    : 0;

  return (
    <View style={tooltipStyle} pointerEvents="box-none">
      {/* Arrow */}
      {targetRect && (
        <View
          style={[
            styles.arrow,
            position === 'below'
              ? { top: -ARROW_SIZE, borderBottomColor: '#2DD4BF' }
              : { bottom: -ARROW_SIZE, borderTopColor: '#2DD4BF' },
            { left: arrowLeft },
          ]}
        />
      )}

      {/* Tooltip Card */}
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <Text style={styles.stepIndicator}>Step {stepIndex + 1} of {totalSteps}</Text>

        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip Tour">
            <Text style={styles.skipText}>Skip Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={isLastStep ? 'Done' : 'Next'}>
            <Text style={styles.nextText}>{isLastStep ? 'Done' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2DD4BF',
    padding: 16,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 12,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#2DD4BF',
  },
  dotInactive: {
    backgroundColor: 'rgba(100, 116, 139, 0.4)',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  nextButton: {
    backgroundColor: '#2DD4BF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});
