/**
 * AI Error Display
 *
 * Shows error states from AI analysis with appropriate actions.
 * Differentiates between hard errors (must restart) and soft errors (can continue).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, XCircle, RefreshCw, Edit3 } from 'lucide-react-native';
import { isHardError, isSoftError } from '../../../data/services/aiService';
import { useTheme } from '../../theme/ThemeContext';

interface AIErrorDisplayProps {
  message: string;
  errorCode: string | null;
  onRetry: () => void;
  onManualEntry: () => void;
}

export function AIErrorDisplay({
  message,
  errorCode,
  onRetry,
  onManualEntry,
}: AIErrorDisplayProps) {
  const { colors, isDark } = useTheme();
  const isHard = isHardError(errorCode);
  const isSoft = isSoftError(errorCode);

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconContainer, isHard && styles.iconContainerError]}>
        {isHard ? (
          <XCircle size={40} color="#EF4444" />
        ) : (
          <AlertTriangle size={40} color="#F59E0B" />
        )}
      </View>

      {/* Message */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {isHard ? 'Unable to Scan' : 'Scan Issue'}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        {/* For soft errors, show manual entry as primary */}
        {isSoft && (
          <TouchableOpacity onPress={onManualEntry} activeOpacity={0.8}>
            <LinearGradient
              colors={isDark ? ['#00D1FF', '#0099CC'] : ['#0D9488', '#0F766E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Edit3 size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Enter Manually</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* For hard errors, show retry as primary */}
        {isHard && (
          <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
            <LinearGradient
              colors={isDark ? ['#00D1FF', '#0099CC'] : ['#0D9488', '#0F766E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Secondary action */}
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.cyanDim }]}
          onPress={isSoft || isHard ? (isSoft ? onRetry : onManualEntry) : onRetry}
          activeOpacity={0.7}
        >
          {isSoft ? (
            <>
              <RefreshCw size={18} color={colors.cyan} />
              <Text style={[styles.secondaryButtonText, { color: colors.cyan }]}>Try Again</Text>
            </>
          ) : isHard ? (
            <>
              <Edit3 size={18} color={colors.cyan} />
              <Text style={[styles.secondaryButtonText, { color: colors.cyan }]}>Enter Manually Instead</Text>
            </>
          ) : (
            <>
              <Edit3 size={18} color={colors.cyan} />
              <Text style={[styles.secondaryButtonText, { color: colors.cyan }]}>Enter Manually Instead</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Compact inline error for use within forms
 */
interface AIErrorInlineProps {
  message: string;
}

export function AIErrorInline({ message }: AIErrorInlineProps) {
  return (
    <View style={styles.inlineContainer}>
      <AlertTriangle size={16} color="#EF4444" />
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  iconContainerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 280,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  inlineText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },
});
