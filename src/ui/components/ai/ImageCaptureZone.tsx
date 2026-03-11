/**
 * Image Capture Zone
 *
 * Component for capturing or selecting medication images.
 * Shows preview when image is selected, tap to change.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ImagePlus, X, Check } from 'lucide-react-native';
import { ImageInfo } from '../../../domain/utils/imageValidation';
import { useTheme } from '../../theme/ThemeContext';

interface ImageCaptureZoneProps {
  label: string;
  image: ImageInfo | null;
  onCapture: () => void;
  onRemove: () => void;
  isRequired?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function ImageCaptureZone({
  label,
  image,
  onCapture,
  onRemove,
  isRequired = false,
  isLoading = false,
  error = null,
}: ImageCaptureZoneProps) {
  const { colors } = useTheme();
  const hasImage = image !== null;

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        {isRequired && <Text style={styles.required}>*</Text>}
        {!isRequired && <Text style={[styles.optional, { color: colors.textMuted }]}>(optional)</Text>}
      </View>

      {/* Capture Zone */}
      <TouchableOpacity
        style={[
          styles.captureZone,
          { borderColor: colors.cyanDim, backgroundColor: colors.bgSubtle },
          hasImage && { borderStyle: 'solid' as const, borderColor: colors.cyan },
          error && styles.captureZoneError,
        ]}
        onPress={onCapture}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Processing...</Text>
          </View>
        ) : hasImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
            <View style={styles.previewOverlay}>
              <View style={[styles.checkBadge, { backgroundColor: colors.overlay, borderColor: colors.cyan }]}>
                <Check size={16} color={colors.cyan} />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.overlay }]}
              onPress={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        ) : (
          <LinearGradient
            colors={[colors.cyanDim, 'transparent']}
            style={styles.emptyContent}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.cyanDim }]}>
              <Camera size={28} color={colors.cyan} />
            </View>
            <Text style={[styles.tapText, { color: colors.textPrimary }]}>Tap to capture</Text>
            <View style={styles.optionsRow}>
              <ImagePlus size={14} color={colors.textMuted} />
              <Text style={[styles.optionText, { color: colors.textMuted }]}>or select from gallery</Text>
            </View>
          </LinearGradient>
        )}
      </TouchableOpacity>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    fontSize: 14,
    color: '#EF4444',
  },
  optional: {
    fontSize: 12,
    marginLeft: 4,
  },
  captureZone: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  captureZoneError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tapText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
});
