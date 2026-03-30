import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, TextInput, findNodeHandle, UIManager, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, ChevronRight, User, Settings, Bell, Shield, Map, Search, X, UserCog, BarChart2, HelpCircle, CreditCard } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useOnboarding } from '../hooks/useOnboarding';
import UpgradePromptModal from '../components/UpgradePromptModal';
import PremiumBadge from '../components/PremiumBadge';

import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../navigation/types';

const SECTIONS = [
  { id: 'EmergencyVault' as const, icon: Lock, label: 'Emergency Vault', desc: 'Critical medical information' },
  { id: 'MyJourney' as const, icon: Map, label: 'My Journey', desc: 'View your tier progression' },
  { id: 'MyAdherence' as const, icon: BarChart2, label: 'My Adherence', desc: 'Monthly adherence heat map' },
  { id: 'AccountSettings' as const, icon: UserCog, label: 'Account', desc: 'Password, email, data deletion, sign out' },
  { id: 'PrivacySecurity' as const, icon: Shield, label: 'Privacy & Security', desc: 'Biometric lock, data export' },
  { id: 'NotificationPrefs' as const, icon: Bell, label: 'Notifications', desc: 'Privacy mode, critical alerts, nudges' },
  { id: 'AppPreferences' as const, icon: Settings, label: 'App Preferences', desc: 'Density, theme, motion settings' },
] as const;

// Searchable index of all settings options across all sub-screens
const ALL_SETTINGS_OPTIONS = [
  // Personal Information
  { label: 'Full Name', desc: 'Edit your display name', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Date of Birth', desc: 'Set your date of birth', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Gender', desc: 'Set your gender', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Primary Health Goal', desc: 'Heart health, weight, wellness', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Blood Type', desc: 'Set your blood type', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Weight', desc: 'Set your weight', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Primary Physician', desc: 'Your doctor\'s name', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Allergies', desc: 'Manage your allergies', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Chronic Conditions', desc: 'Manage chronic conditions', screen: 'PersonalInfo' as const, category: 'Profile' },
  { label: 'Emergency Contact', desc: 'Name, phone, relationship', screen: 'PersonalInfo' as const, category: 'Profile' },
  // My Journey
  { label: 'My Journey', desc: 'View your tier progression', screen: 'MyJourney' as const, category: 'My Journey' },
  { label: 'My Adherence', desc: 'Monthly adherence heat map', screen: 'MyAdherence' as const, category: 'My Adherence' },
  // Emergency Vault
  { label: 'Emergency Vault', desc: 'Critical medical information', screen: 'EmergencyVault' as const, category: 'Emergency Vault' },
  // Privacy & Security
  { label: 'Face ID / Biometric Lock', desc: 'Secure app with biometrics', screen: 'PrivacySecurity' as const, category: 'Privacy & Security' },
  { label: 'Auto-Lock', desc: 'Lock after inactivity', screen: 'PrivacySecurity' as const, category: 'Privacy & Security' },
  { label: 'Export Health Data', desc: 'Generate PDF summary', screen: 'PrivacySecurity' as const, category: 'Privacy & Security' },
  { label: 'Privacy Policy', desc: 'Review data practices', screen: 'PrivacySecurity' as const, category: 'Privacy & Security' },
  { label: 'Data Encryption', desc: 'AES-256 encryption status', screen: 'PrivacySecurity' as const, category: 'Privacy & Security' },
  { label: 'Screen Security', desc: 'Block screenshots & recording', screen: 'PrivacySecurity' as const, category: 'Privacy & Security' },
  // Notifications
  { label: 'Dose Reminders', desc: 'Medication dose notifications', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Advance Reminder', desc: 'Remind before dose time', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Snooze', desc: 'Snooze dose reminders', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Snooze Duration', desc: 'Time before re-alerting', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Refill Alerts', desc: 'Low stock notifications', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Alert Threshold', desc: 'Days of supply warning', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Streak Milestones', desc: 'Streak achievement alerts', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Tier Advancement', desc: 'Tier-up celebration alerts', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Waiver Prompts', desc: 'Streak protection reminders', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Comeback Boost', desc: 'Boost availability alerts', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Safety Alerts', desc: 'Allergy and interaction warnings', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Prescription End Alerts', desc: 'Medication end date reminders', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'System Alerts', desc: 'App updates and system messages', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Quiet Hours', desc: 'Silence non-critical notifications', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Critical Bypass', desc: 'Critical meds bypass quiet hours', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  { label: 'Per-Medication Settings', desc: 'Override alerts per medication', screen: 'NotificationPrefs' as const, category: 'Notifications' },
  // App Preferences
  { label: 'Reduced Motion', desc: 'Minimize animations', screen: 'AppPreferences' as const, category: 'App Preferences' },
  { label: 'Haptic Feedback', desc: 'Vibration on interactions', screen: 'AppPreferences' as const, category: 'App Preferences' },
  { label: 'Appearance', desc: 'Color themes and icon packs', screen: 'AppPreferences' as const, category: 'App Preferences' },
  { label: 'Color Theme', desc: 'Color themes and icon packs', screen: 'AppPreferences' as const, category: 'App Preferences' },
  { label: 'Icon Pack', desc: 'Color themes and icon packs', screen: 'AppPreferences' as const, category: 'App Preferences' },
  // Account
  { label: 'Change Password', desc: 'Send a password reset email', screen: 'AccountSettings' as const, category: 'Account' },
  { label: 'Change Email', desc: 'Update your login email', screen: 'AccountSettings' as const, category: 'Account' },
  { label: 'Delete All Data', desc: 'Remove all health data', screen: 'AccountSettings' as const, category: 'Account' },
  { label: 'Delete Account', desc: 'Permanently delete your account', screen: 'AccountSettings' as const, category: 'Account' },
  { label: 'Sign Out', desc: 'Sign out of your account', screen: 'AccountSettings' as const, category: 'Account' },
] as const;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { subscriptionEnabled, isFree } = useSubscription();
  const [showVaultUpgrade, setShowVaultUpgrade] = useState(false);
  const isVaultLocked = isFree && subscriptionEnabled;
  const { resetAll, setTargetRect, isTourActive, tourStep } = useOnboarding();
  const vaultRef = useRef<View>(null);

  const handleTakeAppTour = useCallback(async () => {
    await resetAll();
    navigation.navigate('MainTabs', { screen: 'Home' } as any);
  }, [resetAll, navigation]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('profile_photo_uri').then((uri) => {
        setProfilePhoto(uri);
      });
    }, [])
  );

  // Measure vault element after tab transition settles (onLayout + measureInWindow
  // can return stale y-coordinates on Android during navigation transitions)
  useEffect(() => {
    if (!isTourActive || tourStep !== 3 || !vaultRef.current) return;
    const t = setTimeout(() => {
      vaultRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) setTargetRect(3, { x, y, width: w, height: h });
      });
    }, 350);
    return () => clearTimeout(t);
  }, [isTourActive, tourStep, setTargetRect]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ALL_SETTINGS_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.desc.toLowerCase().includes(q) ||
        opt.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Settings Header */}
        <Text style={[styles.settingsHeading, { color: colors.textPrimary }]}>Settings</Text>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search settings..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {isSearching ? (
          <View style={styles.searchResults}>
            {filteredResults.length === 0 ? (
              <Text style={styles.noResults}>No settings found for "{searchQuery}"</Text>
            ) : (
              filteredResults.map((result, index) => (
                <TouchableOpacity
                  key={`${result.screen}-${index}`}
                  style={[styles.searchResultItem, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSearchQuery('');
                    navigation.navigate(result.screen);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchResultLabel, { color: colors.textPrimary }]}>{result.label}</Text>
                    <Text style={styles.searchResultDesc}>{result.desc}</Text>
                  </View>
                  <View style={styles.searchResultBadge}>
                    <Text style={[styles.searchResultBadgeText, { color: colors.cyan }]}>{result.category}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Hero Profile Section */}
            <TouchableOpacity
              style={[styles.heroSection, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PersonalInfo')}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={[styles.heroAvatar, { borderColor: colors.cyan }]} />
              ) : (
                <View style={[styles.heroAvatarPlaceholder, { borderColor: colors.cyan, backgroundColor: colors.bgElevated }]}>
                  <User color={colors.textMuted} size={36} />
                </View>
              )}
              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: colors.textPrimary }]}>{user?.display_name || 'Vitalic User'}</Text>
                <Text style={styles.heroSubtitle}>View and edit profile</Text>
              </View>
              <ChevronRight color="#8E9196" size={20} strokeWidth={2} />
            </TouchableOpacity>

            {/* All Sections */}
            <View style={styles.sectionsList}>
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isVault = section.id === 'EmergencyVault';
                return (
                  <TouchableOpacity
                    key={section.id}
                    ref={isVault ? vaultRef as any : undefined}
                    style={[styles.sectionItem, { backgroundColor: colors.bgElevated, borderColor: colors.border }, isVault && styles.sectionItemVault]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isVault && isVaultLocked) {
                        setShowVaultUpgrade(true);
                      } else {
                        navigation.navigate(section.id);
                      }
                    }}
                  >
                    <View style={styles.sectionRow}>
                      <View style={[styles.sectionIcon, isVault && styles.sectionIconVault]}>
                        <Icon color={isVault ? '#FFAA00' : colors.cyan} size={20} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{section.label}</Text>
                          {isVault && isVaultLocked && <PremiumBadge size={12} color="#FFAA00" />}
                        </View>
                        <Text style={styles.sectionDesc}>{section.desc}</Text>
                      </View>
                      <ChevronRight color={isVault ? '#FFAA00' : '#8E9196'} size={20} strokeWidth={2} />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Manage Subscription — only when subscription flag is on */}
              {subscriptionEnabled && (
                <TouchableOpacity
                  style={[styles.sectionItem, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const url = Platform.select({
                      android: 'https://play.google.com/store/account/subscriptions',
                      ios: 'https://apps.apple.com/account/subscriptions',
                    });
                    if (url) Linking.openURL(url);
                  }}
                >
                  <View style={styles.sectionRow}>
                    <View style={styles.sectionIcon}>
                      <CreditCard color={colors.cyan} size={20} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Manage Subscription</Text>
                      <Text style={styles.sectionDesc}>View or change your plan</Text>
                    </View>
                    <ChevronRight color="#8E9196" size={20} strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Take App Tour */}
              <TouchableOpacity
                style={[styles.sectionItem, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={handleTakeAppTour}
              >
                <View style={styles.sectionRow}>
                  <View style={styles.sectionIcon}>
                    <HelpCircle color={colors.cyan} size={20} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Take App Tour</Text>
                    <Text style={styles.sectionDesc}>Replay the welcome walkthrough</Text>
                  </View>
                  <ChevronRight color="#8E9196" size={20} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Version (admin entry point) */}
            <TouchableOpacity
              style={[styles.versionBtn, isLongPressing && styles.versionBtnActive]}
              onPressIn={() => {
                setIsLongPressing(true);
                longPressTimer.current = setTimeout(() => {
                  setIsLongPressing(false);
                  navigation.navigate('Admin');
                }, 3000);
              }}
              onPressOut={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                setIsLongPressing(false);
              }}
            >
              <Text style={[styles.versionText, isLongPressing && { color: colors.cyan }]}>v{Constants.expoConfig?.version ?? '1.0.0'} (build {__DEV__ ? new Date().toLocaleString() : Constants.expoConfig?.version})</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      <UpgradePromptModal
        visible={showVaultUpgrade}
        featureName="Emergency Vault"
        description="Store critical medical info — allergies, conditions, emergency contacts — accessible when it matters most."
        onUpgrade={() => {
          setShowVaultUpgrade(false);
          navigation.navigate('Paywall');
        }}
        onDismiss={() => setShowVaultUpgrade(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  // Settings Header
  settingsHeading: {
    fontSize: 28,
    fontWeight: '700',
    paddingTop: 16,
    marginBottom: 16,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
    borderWidth: 0,
  } as any,

  // Search Results
  searchResults: {
    marginBottom: 14,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  searchResultLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultDesc: {
    color: '#8E9196',
    fontSize: 12,
    marginTop: 2,
  },
  searchResultBadge: {
    backgroundColor: 'rgba(0,216,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  searchResultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noResults: {
    color: '#8E9196',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Hero Profile
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
  },
  heroAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#8E9196',
    fontSize: 14,
    marginTop: 4,
  },

  // Sections
  sectionsList: { gap: 10, marginBottom: 28 },
  sectionItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,216,255,0.1)',
  },
  sectionItemVault: {
    borderColor: '#FFAA00',
    borderLeftWidth: 3,
  },
  sectionIconVault: {
    backgroundColor: 'rgba(255, 170, 0, 0.12)',
  },
  sectionLabel: { fontSize: 14, fontWeight: '600' },
  sectionDesc: { color: '#8E9196', fontSize: 12, marginTop: 2 },

  // Version
  versionBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  versionBtnActive: { backgroundColor: 'rgba(0,216,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,216,255,0.3)' },
  versionText: { color: '#8E9196', fontSize: 11, letterSpacing: 0.5 },
});
