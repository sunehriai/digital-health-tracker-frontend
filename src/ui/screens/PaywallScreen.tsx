/**
 * PaywallScreen — subscription purchase UI.
 *
 * Shows plan cards, value props, and CTA. Rendered inside NavigationContainer
 * so useNavigation() is available. Can be used as both:
 *   - A gate (rendered by AppNavigator when user has no active subscription)
 *   - A navigation destination (from Profile > Manage Subscription)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { subscriptionService, type SubscriptionPackage } from '../../data/services/subscriptionService';

const VALUE_PROPS = [
  { title: 'Unlimited AI Scans', desc: 'Scan any medication label instantly' },
  { title: 'Full Analytics', desc: 'Insight trends, adherence calendar, and reports' },
  { title: 'Gamification', desc: 'XP, tiers, streaks, and milestone rewards' },
  { title: 'Emergency Vault', desc: 'Store critical health info for emergencies' },
  { title: 'Advanced Notifications', desc: 'Snooze, quiet hours, per-medication settings' },
  { title: 'PDF Health Reports', desc: 'Export your medication passport anytime' },
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const { subscribe, restore, loading: subLoading, error } = useSubscription();
  const { signOut } = useAuth();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0); // Default to first (annual)
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      const pkgs = await subscriptionService.getAvailablePackages();
      setPackages(pkgs);
    })();
  }, []);

  const handleSubscribe = async () => {
    if (packages.length === 0) return;
    setPurchasing(true);
    try {
      await subscribe(packages[selectedIdx]);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restore();
    } finally {
      setRestoring(false);
    }
  };

  const handleTerms = () => {
    Linking.openURL('https://vitalic.app/terms');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://vitalic.app/privacy');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.logo, { color: colors.cyan }]}>Vitalic</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Your Health Companion
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Start your 7-day free trial. Cancel anytime.
        </Text>

        {/* Value Props */}
        <View style={styles.propsContainer}>
          {VALUE_PROPS.map((prop, i) => (
            <View key={i} style={styles.propRow}>
              <Text style={[styles.propCheck, { color: colors.cyan }]}>✓</Text>
              <View style={styles.propText}>
                <Text style={[styles.propTitle, { color: colors.textPrimary }]}>{prop.title}</Text>
                <Text style={[styles.propDesc, { color: colors.textSecondary }]}>{prop.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan Cards */}
        {packages.length > 0 ? (
          <View style={styles.plansContainer}>
            {packages.map((pkg, i) => {
              const isSelected = i === selectedIdx;
              const isAnnual = pkg.identifier.includes('annual');
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.planCard,
                    {
                      borderColor: isSelected ? colors.cyan : colors.border,
                      backgroundColor: isSelected ? colors.bgCard : colors.bg,
                    },
                  ]}
                  onPress={() => setSelectedIdx(i)}
                  activeOpacity={0.7}
                >
                  {isAnnual && (
                    <View style={[styles.bestValueBadge, { backgroundColor: colors.cyan }]}>
                      <Text style={styles.bestValueText}>Best Value</Text>
                    </View>
                  )}
                  <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{pkg.title}</Text>
                  <Text style={[styles.planPrice, { color: colors.textPrimary }]}>{pkg.priceString}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          // Fallback plan display when RC SDK not available
          <View style={styles.plansContainer}>
            {[
              { label: 'Annual', price: '$39.99/year', note: 'Best Value — $3.33/mo' },
              { label: 'Quarterly', price: '$13.99/quarter', note: '$4.66/mo' },
              { label: 'Monthly', price: '$4.99/month', note: '' },
            ].map((plan, i) => (
              <TouchableOpacity
                key={plan.label}
                style={[
                  styles.planCard,
                  {
                    borderColor: i === selectedIdx ? colors.cyan : colors.border,
                    backgroundColor: i === selectedIdx ? colors.bgCard : colors.bg,
                  },
                ]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.7}
              >
                {i === 0 && (
                  <View style={[styles.bestValueBadge, { backgroundColor: colors.cyan }]}>
                    <Text style={styles.bestValueText}>Best Value</Text>
                  </View>
                )}
                <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{plan.label}</Text>
                <Text style={[styles.planPrice, { color: colors.textPrimary }]}>{plan.price}</Text>
                {plan.note ? <Text style={[styles.planNote, { color: colors.textSecondary }]}>{plan.note}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.cyan }]}
          onPress={handleSubscribe}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaText}>Start Free Trial</Text>
          )}
        </TouchableOpacity>

        {/* Restore + Links */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={handleTerms}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[styles.linkSep, { color: colors.textSecondary }]}>  ·  </Text>
          <TouchableOpacity onPress={handlePrivacy}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={signOut} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  logo: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 28 },
  propsContainer: { marginBottom: 28 },
  propRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  propCheck: { fontSize: 18, fontWeight: '700', marginRight: 12, marginTop: 1 },
  propText: { flex: 1 },
  propTitle: { fontSize: 15, fontWeight: '600' },
  propDesc: { fontSize: 13, marginTop: 2 },
  plansContainer: { marginBottom: 20 },
  planCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestValueText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  planTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  planPrice: { fontSize: 18, fontWeight: '700' },
  planNote: { fontSize: 12, marginTop: 2 },
  ctaButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 14 },
  linksRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  linkSep: { fontSize: 14 },
  errorText: { fontSize: 13, textAlign: 'center', marginTop: 12 },
});
