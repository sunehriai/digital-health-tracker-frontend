import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import GoogleLogo from './icons/GoogleLogo';

interface SocialLoginRowProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  loading?: boolean;
  disabled?: boolean;
  googleLabel?: string;
  appleLabel?: string;
}

export const SocialLoginRow: React.FC<SocialLoginRowProps> = ({
  onGooglePress,
  onApplePress,
  loading = false,
  disabled = false,
  googleLabel = 'Continue with Google',
  appleLabel = 'Continue with Apple',
}) => {
  const { colors, isDark } = useTheme();
  const isDisabled = loading || disabled;

  return (
    <View style={styles.container}>
      {/* Divider with centered text */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>
          or continue with
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Google button — full width */}
      <TouchableOpacity
        style={[
          styles.socialButton,
          {
            backgroundColor: isDark ? 'transparent' : '#FFFFFF',
            borderWidth: 1,
            borderColor: colors.border,
          },
          isDisabled && styles.disabled,
        ]}
        onPress={onGooglePress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <GoogleLogo size={20} />
        <Text style={[styles.socialLabel, { color: colors.textPrimary }]}>
          {googleLabel}
        </Text>
      </TouchableOpacity>

      {/* Apple button — iOS only, full width */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[
            styles.socialButton,
            {
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? '#000000' : colors.border,
              marginTop: 12,
            },
            isDisabled && styles.disabled,
          ]}
          onPress={onApplePress}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.appleLogo,
              { color: isDark ? '#FFFFFF' : '#000000' },
            ]}
          >
            {'\uF8FF'}
          </Text>
          <Text style={[styles.socialLabel, { color: colors.textPrimary }]}>
            {appleLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    marginHorizontal: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    gap: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  appleLogo: {
    fontSize: 22,
    fontWeight: '600',
  },
});

export default SocialLoginRow;
