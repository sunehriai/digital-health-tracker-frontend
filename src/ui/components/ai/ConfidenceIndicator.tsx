/**
 * Confidence Indicator
 *
 * Visual indicator for AI confidence levels on form fields.
 * Shows icon and optional label for medium/low confidence fields.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';
import {
  ConfidenceLevel,
  getConfidenceStyles,
} from '../../../domain/utils/confidenceUtils';

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

export function ConfidenceIndicator({
  level,
  showLabel = true,
  size = 'medium',
}: ConfidenceIndicatorProps) {
  const styles_conf = getConfidenceStyles(level);

  // High confidence shows nothing
  if (level === 'high') {
    return null;
  }

  const iconSize = size === 'small' ? 14 : 18;
  const Icon = level === 'medium' ? AlertCircle : XCircle;

  return (
    <View style={[styles.container, size === 'small' && styles.containerSmall]}>
      <Icon size={iconSize} color={styles_conf.iconColor} />
      {showLabel && styles_conf.labelText && (
        <Text
          style={[
            styles.label,
            { color: styles_conf.iconColor },
            size === 'small' && styles.labelSmall,
          ]}
        >
          {styles_conf.labelText}
        </Text>
      )}
    </View>
  );
}

/**
 * Confidence badge for field headers
 */
interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const styles_conf = getConfidenceStyles(level);

  if (level === 'high') {
    return (
      <View style={[styles.badge, styles.badgeHigh]}>
        <CheckCircle size={12} color="#00D1FF" />
        <Text style={styles.badgeTextHigh}>AI confident</Text>
      </View>
    );
  }

  if (level === 'medium') {
    return (
      <View style={[styles.badge, styles.badgeMedium]}>
        <AlertCircle size={12} color="#F59E0B" />
        <Text style={styles.badgeTextMedium}>Verify</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeLow]}>
      <XCircle size={12} color="#EF4444" />
      <Text style={styles.badgeTextLow}>Required</Text>
    </View>
  );
}

/**
 * Wrapper component for fields with confidence-based styling
 */
interface ConfidenceFieldWrapperProps {
  level: ConfidenceLevel;
  children: React.ReactNode;
}

export function ConfidenceFieldWrapper({
  level,
  children,
}: ConfidenceFieldWrapperProps) {
  const styles_conf = getConfidenceStyles(level);

  return (
    <View
      style={[
        styles.fieldWrapper,
        {
          borderColor: styles_conf.borderColor,
          backgroundColor: styles_conf.backgroundColor,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  containerSmall: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeHigh: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
  },
  badgeMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  badgeTextHigh: {
    fontSize: 11,
    fontWeight: '500',
    color: '#00D1FF',
  },
  badgeTextMedium: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F59E0B',
  },
  badgeTextLow: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EF4444',
  },
  fieldWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
