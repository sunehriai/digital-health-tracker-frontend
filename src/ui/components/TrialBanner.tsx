/**
 * TrialBanner — shows "X days left in your free trial" when user is in trial.
 * Hidden when subscription flag is off, user is premium, or user is free (expired).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../theme/ThemeContext';

export default function TrialBanner() {
  const { isInTrial, trialDaysLeft, subscriptionEnabled } = useSubscription();
  const { colors } = useTheme();

  if (!subscriptionEnabled || !isInTrial || trialDaysLeft === null) return null;

  const isLastDay = trialDaysLeft <= 1;
  const bgColor = isLastDay ? colors.error : colors.cyan;
  const label = trialDaysLeft === 0
    ? 'Your free trial ends today'
    : trialDaysLeft === 1
      ? '1 day left in your free trial'
      : `${trialDaysLeft} days left in your free trial`;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
