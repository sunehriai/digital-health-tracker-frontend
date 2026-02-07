import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Brain, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface SmartInsightCardProps {
  title: string;
  body: string;
  onPress?: () => void;
}

export default function SmartInsightCard({ title, body, onPress }: SmartInsightCardProps) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <View style={styles.iconRow}>
          <Brain color="#A78BFA" size={14} />
          <Text style={styles.badge}>SMART INSIGHT</Text>
        </View>
        {onPress && <ChevronRight color={colors.textMuted} size={16} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { color: '#A78BFA', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
