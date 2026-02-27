import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Button from '../primitives/Button';
import { colors } from '../theme/colors';

interface ReactivationBannerProps {
  deletionType: 'data_only' | 'full_account' | null;
  permanentDeletionDate: string | null;
  daysRemaining: number | null;
  loading: boolean;
  onCancelDeletion: () => void;
  onSignOut: () => void;
}

export default function ReactivationBanner({
  deletionType,
  permanentDeletionDate,
  daysRemaining,
  loading,
  onCancelDeletion,
  onSignOut,
}: ReactivationBannerProps) {
  const formattedDate = permanentDeletionDate
    ? new Date(permanentDeletionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  const typeLabel = deletionType === 'full_account' ? 'account and all data' : 'health data';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <AlertTriangle color={colors.warning} size={40} />
        </View>

        <Text style={styles.title}>Account Deactivated</Text>

        <Text style={styles.message}>
          Your {typeLabel} is scheduled for permanent deletion on{' '}
          <Text style={styles.bold}>{formattedDate}</Text>.
        </Text>

        {daysRemaining !== null && (
          <View style={styles.daysBox}>
            <Text style={styles.daysNumber}>{daysRemaining}</Text>
            <Text style={styles.daysLabel}>days remaining</Text>
          </View>
        )}

        <Text style={styles.subtext}>
          Cancel now to keep your {deletionType === 'full_account' ? 'account and' : ''} data intact.
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.cyan} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.actions}>
            <Button
              title="Cancel Deletion & Reactivate"
              onPress={onCancelDeletion}
              style={styles.primaryBtn}
            />
            <Button
              title="Sign Out"
              variant="secondary"
              onPress={onSignOut}
              style={styles.secondaryBtn}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A0F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#121721',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.warning,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  daysBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  daysNumber: {
    color: colors.warning,
    fontSize: 32,
    fontWeight: '800',
  },
  daysLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtext: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
});
