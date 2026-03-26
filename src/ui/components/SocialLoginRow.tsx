import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SocialLoginRowProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  loading?: boolean;
}

export const SocialLoginRow: React.FC<SocialLoginRowProps> = ({
  onGooglePress,
  onApplePress,
  loading = false,
}) => {
  const { colors, isDark } = useTheme();

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

      {/* Social buttons */}
      <View style={styles.buttonsRow}>
        {/* Google button */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: isDark ? 'transparent' : '#FFFFFF',
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
          onPress={onGooglePress}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.googleText, { color: colors.textPrimary }]}>G</Text>
        </TouchableOpacity>

        {/* Apple button — iOS only */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDark ? '#000000' : colors.border,
              },
            ]}
            onPress={onApplePress}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.appleText,
                { color: isDark ? '#FFFFFF' : '#000000' },
              ]}
            >
              {'\uF8FF'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
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
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  iconButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    minHeight: 52,
  },
  googleText: {
    fontSize: 20,
    fontWeight: '700',
  },
  appleText: {
    fontSize: 22,
    fontWeight: '600',
  },
});

export default SocialLoginRow;
