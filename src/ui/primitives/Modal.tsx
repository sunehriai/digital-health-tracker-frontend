import React from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Web: Uses ReactDOM.createPortal to render into document.body, bypassing
 * react-native-web's per-View stacking contexts (every View gets zIndex:0
 * which traps position:fixed children). This mirrors how RN-web's own
 * built-in Modal works internally.
 *
 * Native: Uses the standard React Native <Modal>.
 */
export default function Modal({ visible, onClose, title, children }: ModalProps) {
  console.log(`[Modal] render — platform=${Platform.OS}, visible=${visible}, title="${title || '(none)'}"`);

  if (Platform.OS === 'web') {
    if (!visible) return null;

    const modalContent = (
      <div style={portalStyle}>
        <Pressable style={webStyles.backdrop} onPress={onClose} />
        <View style={webStyles.sheet}>
          <View style={styles.header}>
            {title && <Text style={styles.title}>{title}</Text>}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </div>
    );

    // createPortal renders directly into document.body, escaping all
    // ancestor stacking contexts created by react-native-web Views.
    const ReactDOM = require('react-dom');
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return (
    <RNModal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            {title && <Text style={styles.title}>{title}</Text>}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

// Inline style for the portal wrapper <div> — must be a plain CSS object,
// not a RN StyleSheet, because it's a raw DOM element.
const portalStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});

const webStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
});
