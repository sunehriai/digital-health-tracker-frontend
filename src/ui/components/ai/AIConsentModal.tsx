/**
 * AI Consent Modal
 *
 * Shows privacy information and obtains user consent before AI scanning.
 * Persists consent state using useAIConsent hook.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Shield, CheckCircle, X } from 'lucide-react-native';
import { AI_UPLOAD_COPY } from '../../../domain/medicationConfig';
import { useTheme } from '../../theme/ThemeContext';

interface AIConsentModalProps {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export function AIConsentModal({ visible, onAgree, onDecline }: AIConsentModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlayHeavy }]} onPress={onDecline}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.bgElevated, borderColor: colors.cyanDim }]}
          onPress={e => e.stopPropagation()}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onDecline}>
            <X size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[colors.cyanGlow, colors.cyanDim]}
              style={[styles.iconGradient, { borderColor: colors.cyanDim }]}
            >
              <Camera size={32} color={colors.cyan} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{AI_UPLOAD_COPY.CONSENT_TITLE}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{AI_UPLOAD_COPY.CONSENT_SUBTITLE}</Text>

          {/* Bullets */}
          <View style={styles.bulletsContainer}>
            <BulletPoint
              icon={<Shield size={18} color={colors.cyan} />}
              text={AI_UPLOAD_COPY.CONSENT_BULLET_1}
              colors={colors}
            />
            <BulletPoint
              icon={<Camera size={18} color={colors.cyan} />}
              text={AI_UPLOAD_COPY.CONSENT_BULLET_2}
              colors={colors}
            />
            <BulletPoint
              icon={<CheckCircle size={18} color={colors.cyan} />}
              text={AI_UPLOAD_COPY.CONSENT_BULLET_3}
              colors={colors}
            />
          </View>

          {/* Buttons */}
          <TouchableOpacity onPress={onAgree} activeOpacity={0.8}>
            <LinearGradient
              colors={isDark ? ['#00D1FF', '#0099CC'] : ['#0097B8', '#007A96']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.agreeButton}
            >
              <Text style={styles.agreeButtonText}>{AI_UPLOAD_COPY.CONSENT_AGREE}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={[styles.declineButtonText, { color: colors.textMuted }]}>{AI_UPLOAD_COPY.CONSENT_CANCEL}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface BulletPointProps {
  icon: React.ReactNode;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function BulletPoint({ icon, text, colors }: BulletPointProps) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletIcon, { backgroundColor: colors.cyanDim }]}>{icon}</View>
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  bulletsContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  agreeButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  agreeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  declineButtonText: {
    fontSize: 14,
  },
});
