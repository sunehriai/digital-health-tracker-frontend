import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from 'react-native';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAppPreferences } from '../../hooks/useAppPreferences';

export default function WelcomeScreen() {
  const { isWelcomeVisible, isLoaded, completeWelcome } = useOnboarding();
  const { prefs: { reducedMotion } } = useAppPreferences();

  // Internal render state for exit animation (D8 ghost overlay prevention)
  const [isRendered, setIsRendered] = useState(false);
  const isProcessingRef = useRef(false);

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const body1Opacity = useRef(new Animated.Value(0)).current;
  const body2Opacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Mount/unmount based on context visibility
  useEffect(() => {
    if (isWelcomeVisible && isLoaded) {
      setIsRendered(true);
    }
  }, [isWelcomeVisible, isLoaded]);

  // Run entrance animation when rendered
  useEffect(() => {
    if (!isRendered) return;
    if (reducedMotion) {
      // Instant show
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      titleOpacity.setValue(1);
      body1Opacity.setValue(1);
      body2Opacity.setValue(1);
      buttonTranslateY.setValue(0);
      buttonOpacity.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(titleOpacity, { toValue: 1, duration: 300, delay: 150, useNativeDriver: true }),
          Animated.timing(body1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(body2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(buttonTranslateY, { toValue: 0, duration: 400, delay: 300, useNativeDriver: true }),
          Animated.timing(buttonOpacity, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [isRendered, reducedMotion]);

  // Handle exit animation then unmount
  useEffect(() => {
    if (!isWelcomeVisible && isRendered) {
      if (reducedMotion) {
        setIsRendered(false);
        return;
      }
      Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIsRendered(false);
      });
    }
  }, [isWelcomeVisible, isRendered, reducedMotion]);

  const handleGetStarted = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    await completeWelcome();
  };

  if (!isRendered) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]} pointerEvents={isWelcomeVisible ? 'auto' : 'none'}>
      <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Animated.Text style={[styles.title, { color: '#FFFFFF', opacity: titleOpacity }]}>
          Welcome to Vision v2
        </Animated.Text>

        {/* Body */}
        <Animated.Text style={[styles.body, { color: '#CBD5E1', opacity: body1Opacity }]}>
          Taking medication consistently is hard.{'\n'}We make it easier.
        </Animated.Text>

        <Animated.Text style={[styles.body, { color: '#CBD5E1', opacity: body2Opacity, marginTop: 12 }]}>
          Track your medications, build streaks, and unlock insights about your health patterns.
        </Animated.Text>

        {/* CTA Button */}
        <Animated.View style={{ transform: [{ translateY: buttonTranslateY }], opacity: buttonOpacity, width: '100%' }}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get Started - begin app tour"
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(45, 212, 191, 0.4)',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: 'rgba(45, 212, 191, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#2DD4BF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: 'rgba(45, 212, 191, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
});
