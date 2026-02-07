/**
 * AI Review Card
 *
 * Shows extracted medication info with confidence indicators.
 * Offers Quick Save (high confidence) or Edit Details flow.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Edit3,
  Pill,
  Calendar,
  Clock,
  Package,
  AlertTriangle,
} from 'lucide-react-native';
import { MedicationFormData } from '../../../domain/utils/aiTransformUtils';
import { FieldStatus, ConfidenceLevel } from '../../../domain/utils/confidenceUtils';
import { ConfidenceBadge } from './ConfidenceIndicator';
import { FIELD_DISPLAY_NAMES, AI_UPLOAD_COPY } from '../../../domain/medicationConfig';
import { formatFrequencyDisplay, formatMealRelation } from '../../../domain/medicationConfig';

interface AIReviewCardProps {
  formData: MedicationFormData;
  fieldStatus: FieldStatus;
  averageConfidence: number | null;
  warnings: string[];
  canQuickSave: boolean;
  onQuickSave: () => void;
  onEditDetails: () => void;
}

export function AIReviewCard({
  formData,
  fieldStatus,
  averageConfidence,
  warnings,
  canQuickSave,
  onQuickSave,
  onEditDetails,
}: AIReviewCardProps) {
  // Group key fields for display
  const keyFields = [
    { key: 'name', label: 'Medication', value: formData.name, icon: Pill },
    { key: 'strength', label: 'Strength', value: formData.strength || '-', icon: null },
    {
      key: 'doseSize',
      label: 'Dose',
      value: `${formData.doseSize} ${formData.doseUnit}`,
      icon: null,
    },
    {
      key: 'frequency',
      label: 'Frequency',
      value: formData.frequencyType
        ? formatFrequencyDisplay(formData.frequencyType, formData.selectedDays)
        : 'Not set',
      icon: Calendar,
    },
    { key: 'initialStock', label: 'Quantity', value: `${formData.initialStock}`, icon: Package },
    {
      key: 'mealRelation',
      label: 'Meal Timing',
      value: formatMealRelation(formData.mealRelation),
      icon: Clock,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header with confidence score */}
      <View style={styles.header}>
        <Text style={styles.title}>Extracted Details</Text>
        {averageConfidence !== null && (
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>
              {Math.round(averageConfidence * 100)}% confidence
            </Text>
          </View>
        )}
      </View>

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          {warnings.map((warning, index) => (
            <View key={index} style={styles.warningRow}>
              <AlertTriangle size={14} color="#F59E0B" />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Key fields */}
      <ScrollView style={styles.fieldsContainer} showsVerticalScrollIndicator={false}>
        {keyFields.map((field) => {
          const status = fieldStatus[field.key] || 'high';
          const Icon = field.icon;

          return (
            <View key={field.key} style={styles.fieldRow}>
              <View style={styles.fieldLeft}>
                {Icon && (
                  <View style={styles.fieldIcon}>
                    <Icon size={16} color="rgba(255, 255, 255, 0.5)" />
                  </View>
                )}
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={styles.fieldValue}>{field.value}</Text>
                </View>
              </View>
              <ConfidenceBadge level={status as ConfidenceLevel} />
            </View>
          );
        })}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        {canQuickSave && (
          <TouchableOpacity onPress={onQuickSave} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00D1FF', '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quickSaveButton}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.quickSaveText}>{AI_UPLOAD_COPY.REVIEW_QUICK_SAVE}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.editButton, !canQuickSave && styles.editButtonPrimary]}
          onPress={onEditDetails}
          activeOpacity={0.7}
        >
          <Edit3 size={18} color={canQuickSave ? '#00D1FF' : '#FFFFFF'} />
          <Text
            style={[styles.editText, !canQuickSave && styles.editTextPrimary]}
          >
            {AI_UPLOAD_COPY.REVIEW_EDIT_DETAILS}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confidencePill: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#00D1FF',
    fontWeight: '500',
  },
  warningsContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#F59E0B',
    lineHeight: 18,
  },
  fieldsContainer: {
    maxHeight: 280,
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  quickSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  quickSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.3)',
  },
  editButtonPrimary: {
    backgroundColor: '#00D1FF',
    borderColor: '#00D1FF',
  },
  editText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#00D1FF',
  },
  editTextPrimary: {
    color: '#FFFFFF',
  },
});
