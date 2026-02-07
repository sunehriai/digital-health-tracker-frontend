import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, ChevronRight, User, Settings, Bell, Shield, LogOut } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

const SECTIONS = [
  { id: 'PersonalInfo' as const, icon: User, label: 'Personal Information', desc: 'Name, contact details, emergency contact' },
  { id: 'PrivacySecurity' as const, icon: Shield, label: 'Privacy & Security', desc: 'Biometric lock, data export' },
  { id: 'NotificationPrefs' as const, icon: Bell, label: 'Notifications', desc: 'Privacy mode, critical alerts, nudges' },
  { id: 'AppPreferences' as const, icon: Settings, label: 'App Preferences', desc: 'Density, theme, motion settings' },
] as const;

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuth();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const initials = user?.display_name
    ? user.display_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account & settings</Text>
        </View>

        {/* User info card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.display_name || 'Vision User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Emergency vault */}
        <TouchableOpacity
          style={styles.vaultCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EmergencyVault')}
        >
          <View style={styles.vaultRow}>
            <View style={styles.vaultIcon}>
              <Lock color="#000" size={24} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vaultTitle}>Access Emergency Vault</Text>
              <Text style={styles.vaultSubtitle}>Critical medical information</Text>
            </View>
            <ChevronRight color="#FFAA00" size={24} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Settings sections */}
        <View style={styles.sectionsList}>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <TouchableOpacity
                key={section.id}
                style={styles.sectionItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(section.id)}
              >
                <View style={styles.sectionRow}>
                  <View style={styles.sectionIcon}>
                    <Icon color={colors.cyan} size={20} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                    <Text style={styles.sectionDesc}>{section.desc}</Text>
                  </View>
                  <ChevronRight color="#8E9196" size={20} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>ACCOUNT STATISTICS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>127</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>98%</Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.vitality_streak ?? 0}</Text>
              <Text style={styles.statLabel}>Streak Days</Text>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <LogOut color="#8E9196" size={20} strokeWidth={2} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

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
          <Text style={[styles.versionText, isLongPressing && { color: colors.cyan }]}>Version 1.0.4</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080A0F' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { marginBottom: 24 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginBottom: 24,
    backgroundColor: '#121721', borderRadius: 24, borderWidth: 1, borderColor: '#1E2633',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.cyan,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#000', fontSize: 24, fontWeight: '700' },
  userName: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 2 },
  userEmail: { color: '#8E9196', fontSize: 14 },
  vaultCard: {
    marginBottom: 24, borderRadius: 24, padding: 20, overflow: 'hidden',
    backgroundColor: 'rgba(26,26,26,0.8)', borderWidth: 2, borderColor: '#FFAA00',
  },
  vaultRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vaultIcon: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFAA00',
  },
  vaultTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  vaultSubtitle: { color: '#FFAA00', fontSize: 12, fontWeight: '600' },
  sectionsList: { gap: 12, marginBottom: 24 },
  sectionItem: {
    backgroundColor: '#121721', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1E2633',
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,216,255,0.1)',
  },
  sectionLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sectionDesc: { color: '#8E9196', fontSize: 12, marginTop: 2 },
  statsCard: {
    backgroundColor: '#121721', borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: '#1E2633',
  },
  statsTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.cyan, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: '#8E9196', fontSize: 10 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24,
  },
  signOutText: { color: '#8E9196', fontSize: 14, fontWeight: '600' },
  versionBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  versionBtnActive: { backgroundColor: 'rgba(0,216,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,216,255,0.3)' },
  versionText: { color: '#8E9196', fontSize: 11, letterSpacing: 0.5 },
});
