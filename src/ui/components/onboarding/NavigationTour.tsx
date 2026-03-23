import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, ActivityIndicator, Text, Platform } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useMedications } from '../../hooks/useMedications';
import { useAppPreferences } from '../../hooks/useAppPreferences';
import { useAlert } from '../../context/AlertContext';
import TourSpotlight from './TourSpotlight';
import TourTooltip from './TourTooltip';
import { createLogger } from '../../../utils/logger';
import { measureElement } from '../../utils/measureElement';
import type { RootStackParamList } from '../../navigation/types';
import type { TargetRect } from '../../../domain/types';

const logger = createLogger('NavigationTour');

const TOUR_STEPS = [
  {
    title: 'Everything in Reach',
    message: 'Home, Cabinet, Insights, Settings — all one tap away.',
    tab: 'Home',
  },
  {
    title: 'Start Tracking',
    message: 'Tap + to add a medication. Snap a photo or enter manually.',
    tab: 'Home',
  },
  {
    title: 'Consistency Pays Off',
    message: 'Every dose earns XP. Watch your tier grow here.',
    tab: 'Home',
  },
  {
    title: 'Your Medical Snapshot',
    message: 'Need a quick snapshot of your meds, allergies, and conditions? Perfect for doctor visits or emergencies.',
    tab: 'Profile',
  },
];

export default function NavigationTour() {
  const {
    isTourActive, tourStep, layoutReady, targetRects,
    advanceTour, skipTour, completeTour,
  } = useOnboarding();
  const { activeMedications } = useMedications();
  const { prefs: { reducedMotion } } = useAppPreferences();
  const { showAlert } = useAlert();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navState = useNavigationState(state => state);

  // On native, overlay is position:absolute inside parent — need to subtract parent's window position
  // On web, overlay is position:fixed — no adjustment needed
  const [containerOrigin, setContainerOrigin] = useState({ x: 0, y: 0 });
  const containerMeasuredRef = useRef(false);

  const handleContainerLayout = useCallback((e: any) => {
    if (Platform.OS === 'web') return;
    measureElement(e.target, (x: number, y: number) => {
      setContainerOrigin({ x, y });
    });
  }, []);

  // Adjust rect from window coords to container-local coords (native only)
  const adjustRect = useCallback((rect: TargetRect | null): TargetRect | null => {
    if (!rect) return null;
    if (Platform.OS === 'web') return rect; // fixed positioning, no adjustment
    return {
      x: rect.x - containerOrigin.x,
      y: rect.y - containerOrigin.y,
      width: rect.width,
      height: rect.height,
    };
  }, [containerOrigin]);

  // Internal render state for exit animation
  const [isRendered, setIsRendered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount/unmount based on context
  useEffect(() => {
    if (isTourActive) {
      setIsRendered(true);
    } else if (isRendered) {
      const t = setTimeout(() => setIsRendered(false), reducedMotion ? 0 : 300);
      return () => clearTimeout(t);
    }
  }, [isTourActive, reducedMotion]);

  // 5-second layout ready timeout (E9)
  useEffect(() => {
    if (!isTourActive || layoutReady) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    timeoutRef.current = setTimeout(() => {
      logger.warn('Layout ready timeout expired. Skipping tour.');
      showAlert({
        title: 'You can take the tour anytime from Settings',
        type: 'info',
      });
      skipTour();
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isTourActive, layoutReady]);

  // Navigate to correct tab when step changes
  useEffect(() => {
    if (!isTourActive || !layoutReady) return;
    const step = TOUR_STEPS[tourStep];
    if (!step) return;

    if (step.tab === 'Cabinet') {
      (navigation as any).navigate('MainTabs', { screen: 'Cabinet' });
    } else if (step.tab === 'Profile') {
      (navigation as any).navigate('MainTabs', { screen: 'Profile' });
    } else if (step.tab === 'Home') {
      (navigation as any).navigate('MainTabs', { screen: 'Home' });
    }
  }, [tourStep, isTourActive, layoutReady]);

  // Handle step advance or completion
  const handleNext = () => {
    if (tourStep >= 3) {
      completeTour();
      // Navigate back to Home after tour ends
      setTimeout(() => {
        (navigation as any).navigate('MainTabs', { screen: 'Home' });
      }, 300);
    } else {
      advanceTour();
    }
  };

  const handleSkip = () => {
    // Navigate back to Home when skipping from non-Home step
    const currentTab = TOUR_STEPS[tourStep]?.tab;
    if (currentTab && currentTab !== 'Home') {
      (navigation as any).navigate('MainTabs', { screen: 'Home' });
    }
    skipTour();
  };

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 30,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          handleNext();
        }
      },
    })
  ).current;

  if (!isRendered) return null;

  // Show loading indicator while waiting for layout
  if (!layoutReady) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.loadingContainer]} pointerEvents="box-none">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2DD4BF" />
          <Text style={styles.loadingText}>Preparing tour...</Text>
        </View>
      </View>
    );
  }

  const currentStep = TOUR_STEPS[tourStep];
  const currentRect = adjustRect(targetRects[tourStep] || null);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container]}
      pointerEvents="box-none"
      onLayout={handleContainerLayout}
      {...panResponder.panHandlers}
    >
      <TourSpotlight targetRect={currentRect} onPress={handleNext} />
      <TourTooltip
        title={currentStep.title}
        message={currentStep.message}
        targetRect={currentRect}
        stepIndex={tourStep}
        totalSteps={4}
        isLastStep={tourStep === 3}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 101,
  },
  loadingContainer: {
    zIndex: 101,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.80)',
  },
  loadingOverlay: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
});
