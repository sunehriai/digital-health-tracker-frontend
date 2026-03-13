/**
 * AppearanceScreen — Tier 2 theme picker.
 *
 * Three customization axes:
 * 1. "Color Theme" — 2-column grid of 6 palettes
 * 2. "Surface Lens" — 3 card surface recipes (Glass, Depth, Minimal)
 * 3. "Icon Pack" — 3 icon style variants
 * 4. "Live Preview" — shows all three axes combined
 */
import React, { useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Pill, Bell, Heart, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGamification } from '../hooks/useGamification';
import {
  THEME_PALETTES,
  ICON_PACKS,
  LENS_LABELS,
  LENS_DESCRIPTIONS,
  computeCardStyle,
  type ThemeId,
  type IconPackId,
  type LensId,
} from '../theme/themeDefinitions';
import ColorThemeSwatch from '../components/ColorThemeSwatch';
import IconPackPreview from '../components/IconPackPreview';
import type { RootStackScreenProps } from '../navigation/types';

const THEME_IDS: ThemeId[] = ['default', 'arctic', 'amethyst', 'solar', 'botanical', 'rose'];
const ICON_PACK_IDS: IconPackId[] = ['outlined', 'filled', 'rounded'];
const LENS_IDS: LensId[] = ['glass', 'depth', 'minimal'];

export default function AppearanceScreen({ navigation }: RootStackScreenProps<'Appearance'>) {
  const { colors, themeId, lensId, iconPackId, iconStyle, cardStyle, setTheme, setLens, setIconPack } = useTheme();
  const { currentTier } = useGamification();

  // Tier guard — redirect Tier 1 users immediately (no flash)
  useLayoutEffect(() => {
    if (currentTier < 2) {
      if (!navigation.canGoBack()) {
        navigation.navigate('MainTabs', { screen: 'Home' });
        return;
      }
      navigation.goBack();
    }
  }, [currentTier, navigation]);

  if (currentTier < 2) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Appearance</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Color Theme ──────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>COLOR THEME</Text>
        <View style={styles.themeGrid}>
          {THEME_IDS.map((id, index) => {
            if (index % 2 !== 0) return null;
            const nextId = THEME_IDS[index + 1];
            return (
              <View key={id} style={styles.themeRow}>
                <ColorThemeSwatch
                  themeId={id}
                  isSelected={themeId === id}
                  onPress={() => setTheme(id)}
                />
                {nextId ? (
                  <ColorThemeSwatch
                    themeId={nextId}
                    isSelected={themeId === nextId}
                    onPress={() => setTheme(nextId)}
                  />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            );
          })}
        </View>

        {/* ── Surface Lens ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 28 }]}>SURFACE LENS</Text>
        <View style={styles.lensRow}>
          {LENS_IDS.map((id) => {
            const isSelected = lensId === id;
            const previewStyle = computeCardStyle(id, colors);
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.lensCard,
                  previewStyle,
                  isSelected && { borderColor: colors.cyan },
                ]}
                activeOpacity={0.7}
                onPress={() => setLens(id)}
              >
                <View style={styles.lensCardInner}>
                  <Text style={[styles.lensLabel, { color: isSelected ? colors.cyan : colors.textPrimary }]}>
                    {LENS_LABELS[id]}
                  </Text>
                  <Text style={[styles.lensDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {LENS_DESCRIPTIONS[id]}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.cyan }]}>
                    <Check color="#000" size={12} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Icon Pack ────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 28 }]}>ICON PACK</Text>
        <View style={styles.iconPackRow}>
          {ICON_PACK_IDS.map((id) => (
            <IconPackPreview
              key={id}
              packId={id}
              isSelected={iconPackId === id}
              onPress={() => setIconPack(id)}
            />
          ))}
        </View>

        {/* ── Live Preview ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 28 }]}>LIVE PREVIEW</Text>
        <View style={[cardStyle, styles.previewPadding]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>Vitamin D3</Text>
            <View style={[styles.previewBadge, { backgroundColor: colors.cyanDim }]}>
              <Text style={[styles.previewBadgeText, { color: colors.cyan }]}>Active</Text>
            </View>
          </View>
          <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
            1000 IU · Once daily with breakfast
          </Text>
          <View style={styles.previewIconRow}>
            <Pill color={colors.cyan} size={20} strokeWidth={iconStyle.strokeWidth} fill={iconStyle.fill === 'currentColor' ? colors.cyan : 'none'} />
            <Bell color={colors.textMuted} size={20} strokeWidth={iconStyle.strokeWidth} fill={iconStyle.fill === 'currentColor' ? colors.textMuted : 'none'} />
            <Heart color={colors.error} size={20} strokeWidth={iconStyle.strokeWidth} fill={iconStyle.fill === 'currentColor' ? colors.error : 'none'} />
          </View>
          <View style={[styles.previewProgressTrack, { backgroundColor: colors.bgElevated }]}>
            <View style={[styles.previewProgressFill, { backgroundColor: colors.cyan, width: '72%' }]} />
          </View>
          <Text style={[styles.previewStock, { color: colors.textMuted }]}>
            65 of 90 remaining
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Theme grid — 2 columns
  themeGrid: { gap: 10 },
  themeRow: { flexDirection: 'row', gap: 10 },

  // Surface lens row
  lensRow: { gap: 10 },
  lensCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lensCardInner: { flex: 1, gap: 2 },
  lensLabel: { fontSize: 14, fontWeight: '600' },
  lensDesc: { fontSize: 11, fontWeight: '500' },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Icon pack row — 3 columns
  iconPackRow: { flexDirection: 'row', gap: 10 },

  // Live preview
  previewPadding: { padding: 16 },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: { fontSize: 16, fontWeight: '600' },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  previewBadgeText: { fontSize: 11, fontWeight: '700' },
  previewSubtitle: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  previewIconRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  previewProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  previewProgressFill: { height: '100%', borderRadius: 3 },
  previewStock: { fontSize: 11, fontWeight: '500', marginTop: 8 },
});
