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
  const hasImage = image !== null;

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isRequired && <Text style={styles.required}>*</Text>}
        {!isRequired && <Text style={styles.optional}>(optional)</Text>}
      </View>

      {/* Capture Zone */}
      <TouchableOpacity
        style={[
          styles.captureZone,
          hasImage && styles.captureZoneWithImage,
          error && styles.captureZoneError,
        ]}
        onPress={onCapture}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00D1FF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : hasImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
            <View style={styles.previewOverlay}>
              <View style={styles.checkBadge}>
                <Check size={16} color="#00D1FF" />
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <LinearGradient
            colors={['rgba(0, 209, 255, 0.05)', 'rgba(0, 209, 255, 0.02)']}
            style={styles.emptyContent}
          >
            <View style={styles.iconContainer}>
              <Camera size={28} color="#00D1FF" />
            </View>
            <Text style={styles.tapText}>Tap to capture</Text>
            <View style={styles.optionsRow}>
              <ImagePlus size={14} color="rgba(255, 255, 255, 0.4)" />
              <Text style={styles.optionText}>or select from gallery</Text>
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
    color: '#FFFFFF',
  },
  required: {
    fontSize: 14,
    color: '#EF4444',
  },
  optional: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 4,
  },
  captureZone: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 209, 255, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  captureZoneWithImage: {
    borderStyle: 'solid',
    borderColor: 'rgba(0, 209, 255, 0.5)',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.5)',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tapText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
});
