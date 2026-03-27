import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Mail, X } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface EmailVerificationBannerProps {
  onVerifyNow: () => Promise<void>;
  onDismiss: () => void;
  isEscalated?: boolean;
  hoursRemaining?: number;
}

const COOLDOWN_SECONDS = 60;

const WARNING_BG = 'rgba(245, 158, 11, 0.15)';
const WARNING_COLOR = '#F59E0B';

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  onVerifyNow,
  onDismiss,
  isEscalated = false,
  hoursRemaining,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleVerifyNow = useCallback(async () => {
    if (isSending || cooldown) return;

    setIsSending(true);
    try {
      await onVerifyNow();
    } finally {
      setIsSending(false);
      setCooldown(true);
      timerRef.current = setTimeout(() => {
        setCooldown(false);
        timerRef.current = null;
      }, COOLDOWN_SECONDS * 1000);
    }
  }, [isSending, cooldown, onVerifyNow]);

  // Always use warning amber for visibility — verification is important
  const accentColor = WARNING_COLOR;
  const bgColor = WARNING_BG;

  const messageText = isEscalated
    ? `Only ${hoursRemaining ?? 0} hours left to verify your email. Access will be paused after 24 hours.`
    : 'Verify your email within 24 hours to keep full access.';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Mail size={20} color={accentColor} style={styles.icon} />

      <View style={styles.textBlock}>
        <Text style={styles.message}>
          {messageText}
        </Text>
        {cooldown ? (
          <Text style={[styles.cooldownText, { color: accentColor }]}>Link sent — check your inbox</Text>
        ) : (
          <TouchableOpacity
            onPress={handleVerifyNow}
            disabled={isSending}
            activeOpacity={0.7}
          >
            <View style={styles.actionRow}>
              <Text style={[styles.actionText, { color: accentColor }, isSending && styles.actionTextDisabled]}>
                Verify Now
              </Text>
              {isSending && (
                <ActivityIndicator
                  size="small"
                  color={accentColor}
                  style={styles.spinner}
                />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {!isEscalated && (
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={styles.dismiss}>
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  icon: {
    marginTop: 2,
    marginRight: 10,
  },
  textBlock: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionTextDisabled: {
    opacity: 0.5,
  },
  cooldownText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.8,
  },
  spinner: {
    marginLeft: 6,
  },
  dismiss: {
    marginLeft: 8,
    marginTop: 2,
    padding: 2,
  },
});

export default EmailVerificationBanner;
