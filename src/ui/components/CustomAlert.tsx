import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  Pressable,
  Platform,
} from 'react-native';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Trash2,
} from 'lucide-react-native';
import Button from '../primitives/Button';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import type { AlertType } from '../context/AlertContext';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  messageContent?: React.ReactNode;
  type: AlertType;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirmation: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  messageContent,
  type,
  confirmLabel,
  cancelLabel,
  isConfirmation,
  onConfirm,
  onCancel,
  onDismiss,
}: CustomAlertProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  const ALERT_CONFIG: Record<AlertType, {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
  }> = {
    success: {
      icon: CheckCircle,
      color: colors.success,
      bgColor: 'rgba(34, 197, 94, 0.15)',
    },
    error: {
      icon: AlertCircle,
      color: colors.error,
      bgColor: 'rgba(239, 68, 68, 0.15)',
    },
    warning: {
      icon: AlertTriangle,
      color: colors.warning,
      bgColor: 'rgba(245, 158, 11, 0.15)',
    },
    info: {
      icon: Info,
      color: colors.info,
      bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    confirm: {
      icon: HelpCircle,
      color: colors.cyan,
      bgColor: colors.cyanDim,
    },
    destructive: {
      icon: Trash2,
      color: colors.error,
      bgColor: 'rgba(239, 68, 68, 0.15)',
    },
  };

  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  const content = (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
        <Icon color={config.color} size={32} />
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {messageContent ? (
        <View style={styles.messageContainer}>{messageContent}</View>
      ) : message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}

      {isConfirmation ? (
        <View style={styles.buttonRow}>
          <Button
            title={cancelLabel || 'Cancel'}
            variant="ghost"
            onPress={onCancel}
            style={styles.btn}
          />
          <Button
            title={confirmLabel || 'Confirm'}
            variant={type === 'destructive' ? 'danger' : 'primary'}
            onPress={onConfirm}
            style={styles.btn}
          />
        </View>
      ) : (
        <Button
          title={confirmLabel || 'OK'}
          variant="primary"
          onPress={onConfirm}
          style={styles.fullBtn}
        />
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    const ReactDOM = require('react-dom');
    return ReactDOM.createPortal(
      <div style={portalStyle}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onDismiss} />
        <View style={styles.centeredContainer}>
          {content}
        </View>
      </div>,
      document.body
    );
  }

  return (
    <RNModal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onDismiss}>
        <View style={styles.centeredContainer}>
          <Pressable>{content}</Pressable>
        </View>
      </Pressable>
    </RNModal>
  );
}

const portalStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 99999,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    maxWidth: 340,
    width: '85%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 24,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
  },
  fullBtn: {
    width: '100%',
  },
});
