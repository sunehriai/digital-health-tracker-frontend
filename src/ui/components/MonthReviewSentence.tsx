import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { MonthSummary } from '../../domain/types';
import { generateReviewSentence } from '../../domain/utils/monthReviewGenerator';

interface MonthReviewSentenceProps {
  summary: MonthSummary | null;
  yearMonth: string;
}

export default function MonthReviewSentence({
  summary,
  yearMonth,
}: MonthReviewSentenceProps) {
  const { colors } = useTheme();

  const sentence = summary
    ? generateReviewSentence(summary, yearMonth)
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[styles.sentence, { color: colors.textSecondary }]}>
        {sentence ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  sentence: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
