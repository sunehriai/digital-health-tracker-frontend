/**
 * Image Upload Screen
 *
 * Main screen for AI-powered medication scanning.
 * Handles:
 * 1. Consent modal (first-time only)
 * 2. Image capture/selection
 * 3. AI analysis
 * 4. Review/Quick Save decision
 * 5. Error handling
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Sparkles } from 'lucide-react-native';

import { useAlert } from '../context/AlertContext';
import { useAIUpload } from '../../data/contexts/AIUploadContext';
import { useAIConsent } from '../../data/hooks/useAIConsent';
import { analyzeMedicationImages } from '../../data/services/aiService';
import { ImageInfo, validateImageAsync, areLikelyDuplicates, compressImage } from '../../domain/utils/imageValidation';
import { AI_UPLOAD_COPY } from '../../domain/medicationConfig';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import ScreenshotToast from '../components/ScreenshotToast';
import { useTheme } from '../theme/ThemeContext';

import {
  AIConsentModal,
  ImageCaptureZone,
  AIAnalyzingOverlay,
  AIReviewCard,
  AIErrorDisplay,
} from '../components/ai';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ImageUploadScreen');

// Navigation types (adjust based on your navigation setup)
type RootStackParamList = {
  ImageUpload: undefined;
  ManualMedicationEntry: { mode?: 'ai' | 'manual' };
  RitualPreview: { medicationId: string };
  Cabinet: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ImageUpload'>;

export function ImageUploadScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const { showScreenshotToast, dismissScreenshotToast } = useScreenSecurity('ImageUpload');
  const {
    state,
    acceptConsent,
    declineConsent,
    setFrontImage,
    setBackImage,
    startAnalysis,
    handleAnalysisSuccess,
    handleAnalysisError,
    goToEdit,
    reset,
    canAnalyze,
    canQuickSave,
  } = useAIUpload();

  const { hasConsented, isLoading: consentLoading, grantConsent } = useAIConsent();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [imageErrors, setImageErrors] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  });

  // Handle consent state on mount
  useEffect(() => {
    if (consentLoading) return;

    if (state.phase === 'consent') {
      if (hasConsented) {
        // User already consented previously, skip modal and go to capture
        acceptConsent();
      } else {
        // Show consent modal for first-time users
        setShowConsentModal(true);
      }
    }
  }, [consentLoading, hasConsented, state.phase, acceptConsent]);

  // Handle consent acceptance
  const handleAcceptConsent = useCallback(async () => {
    try {
      await grantConsent();
      setShowConsentModal(false);
      acceptConsent();
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  }, [grantConsent, acceptConsent]);

  // Handle consent decline - go to manual entry
  const handleDeclineConsent = useCallback(() => {
    setShowConsentModal(false);
    declineConsent();
    navigation.replace('ManualMedicationEntry', { mode: 'manual' });
  }, [declineConsent, navigation]);

  // Image picker
  const pickImage = useCallback(
    async (slot: 'front' | 'back') => {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permission Required', message: 'Please allow access to your photo library to select images.', type: 'warning' });
        return;
      }

      // On web, go directly to gallery (camera not supported)
      if (Platform.OS === 'web') {
        launchGallery(slot);
        return;
      }

      // On native, show action sheet for camera vs gallery
      Alert.alert(
        slot === 'front' ? 'Front Label' : 'Back Label',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: () => launchCamera(slot),
          },
          {
            text: 'Choose from Gallery',
            onPress: () => launchGallery(slot),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    []
  );

  const launchCamera = async (slot: 'front' | 'back') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: 'Permission Required', message: 'Please allow camera access to take photos.', type: 'warning' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageSelected(slot, result.assets[0]);
    }
  };

  const launchGallery = async (slot: 'front' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageSelected(slot, result.assets[0]);
    }
  };

  const handleImageSelected = async (slot: 'front' | 'back', asset: ImagePicker.ImagePickerAsset) => {
    const rawImageInfo: ImageInfo = {
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      fileSize: asset.fileSize || 0,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName || `image_${Date.now()}.jpg`,
    };

    // Compress before validation (Android cameras produce 5-15MB+ images)
    let imageInfo: ImageInfo;
    try {
      imageInfo = await compressImage(rawImageInfo);
    } catch {
      imageInfo = rawImageInfo;
    }

    // Validate image (includes magic bytes check)
    const validation = await validateImageAsync(imageInfo);
    if (!validation.isValid) {
      setImageErrors((prev) => ({ ...prev, [slot]: validation.error }));
      return;
    }

    // Check for duplicates
    const otherImage = slot === 'front' ? state.images.back : state.images.front;
    if (areLikelyDuplicates(imageInfo, otherImage)) {
      setImageErrors((prev) => ({
        ...prev,
        [slot]: AI_UPLOAD_COPY.ERROR_DUPLICATE,
      }));
      return;
    }

    // Clear error and set image
    setImageErrors((prev) => ({ ...prev, [slot]: null }));
    if (slot === 'front') {
      setFrontImage(imageInfo);
    } else {
      setBackImage(imageInfo);
    }
  };

  const handleRemoveImage = (slot: 'front' | 'back') => {
    if (slot === 'front') {
      setFrontImage(null);
    } else {
      setBackImage(null);
    }
    setImageErrors((prev) => ({ ...prev, [slot]: null }));
  };

  // Analyze images
  const handleAnalyze = useCallback(async () => {
    logger.info('Analyze button pressed', {
      hasFrontImage: !!state.images.front,
      hasBackImage: !!state.images.back,
    });

    if (!state.images.front) {
      logger.warn('No front image selected');
      setImageErrors((prev) => ({ ...prev, front: AI_UPLOAD_COPY.ERROR_NO_IMAGE }));
      return;
    }

    logger.info('Starting AI analysis');
    startAnalysis();

    try {
      const result = await analyzeMedicationImages(state.images.front, state.images.back);

      if (result.success && result.data) {
        logger.info('Analysis successful', {
          medicationName: result.data?.medication_info?.name?.value,
        });
        handleAnalysisSuccess(result.data);
      } else {
        logger.warn('Analysis returned error', {
          error: result.error,
          errorCode: result.errorCode,
        });
        handleAnalysisError(result.error || 'Unknown error', result.errorCode || undefined);
      }
    } catch (error) {
      logger.error('Analysis failed with exception', error as Error);
      handleAnalysisError('Unexpected error occurred', 'API_ERROR');
    }
  }, [state.images, startAnalysis, handleAnalysisSuccess, handleAnalysisError]);

  // Quick save
  const handleQuickSave = useCallback(async () => {
    // TODO: Implement direct save to backend
    // For now, navigate to RitualPreview with the data
    showAlert({ title: 'Quick Save', message: 'Quick save will be implemented in integration step.', type: 'info' });
  }, []);

  // Go to edit mode
  const handleEditDetails = useCallback(() => {
    goToEdit();
    navigation.navigate('ManualMedicationEntry', { mode: 'ai' });
  }, [goToEdit, navigation]);

  // Retry analysis
  const handleRetry = useCallback(() => {
    reset();
    acceptConsent(); // Go back to capture phase
  }, [reset, acceptConsent]);

  // Go to manual entry
  const handleManualEntry = useCallback(() => {
    reset();
    navigation.replace('ManualMedicationEntry', { mode: 'manual' });
  }, [reset, navigation]);

  // Back navigation
  const handleBack = () => {
    reset();
    navigation.goBack();
  };

  // Render based on phase
  const renderContent = () => {
    // Analyzing overlay
    if (state.phase === 'analyzing') {
      return (
        <>
          {renderCaptureContent()}
          <AIAnalyzingOverlay visible />
        </>
      );
    }

    // Error state
    if (state.phase === 'error') {
      return (
        <AIErrorDisplay
          message={state.errorMessage || 'An error occurred'}
          errorCode={state.errorCode}
          onRetry={handleRetry}
          onManualEntry={handleManualEntry}
        />
      );
    }

    // Review state
    if (state.phase === 'review' && state.formData) {
      return (
        <AIReviewCard
          formData={state.formData}
          fieldStatus={state.fieldStatus}
          averageConfidence={state.averageConfidence}
          warnings={state.warnings}
          canQuickSave={canQuickSave}
          onQuickSave={handleQuickSave}
          onEditDetails={handleEditDetails}
        />
      );
    }

    // Default: capture content
    return renderCaptureContent();
  };

  const renderCaptureContent = () => (
    <View style={styles.captureContainer}>
      {/* Header icon */}
      <View style={styles.headerIcon}>
        <LinearGradient
          colors={[colors.cyanGlow, colors.cyanDim]}
          style={[styles.headerIconGradient, { borderColor: colors.cyanDim }]}
        >
          <Sparkles size={28} color={colors.cyan} />
        </LinearGradient>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{AI_UPLOAD_COPY.UPLOAD_TITLE}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Take clear photos of the packaging label
      </Text>

      {/* Image capture zones */}
      <View style={styles.imagesContainer}>
        <ImageCaptureZone
          label={AI_UPLOAD_COPY.UPLOAD_FRONT_LABEL}
          image={state.images.front}
          onCapture={() => pickImage('front')}
          onRemove={() => handleRemoveImage('front')}
          isRequired
          error={imageErrors.front}
        />

        <ImageCaptureZone
          label={AI_UPLOAD_COPY.UPLOAD_BACK_LABEL}
          image={state.images.back}
          onCapture={() => pickImage('back')}
          onRemove={() => handleRemoveImage('back')}
          error={imageErrors.back}
        />
      </View>

      {/* Analyze button */}
      <TouchableOpacity
        onPress={handleAnalyze}
        disabled={!canAnalyze}
        activeOpacity={0.8}
        style={{ width: '100%' }}
      >
        <View style={[styles.analyzeButton, { backgroundColor: canAnalyze ? colors.cyan : '#555' }, !canAnalyze && { opacity: 0.5 }]}>
          <Camera size={20} color={isDark ? '#0A0A0B' : '#FFFFFF'} />
          <Text style={[styles.analyzeButtonText, { color: isDark ? '#0A0A0B' : '#FFFFFF' }]}>{AI_UPLOAD_COPY.UPLOAD_BUTTON}</Text>
        </View>
      </TouchableOpacity>

      {/* Manual entry link */}
      <TouchableOpacity style={styles.manualLink} onPress={handleManualEntry}>
        <Text style={[styles.manualLinkText, { color: colors.textMuted }]}>Enter manually instead</Text>
      </TouchableOpacity>
    </View>
  );

  if (consentLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Medication</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      {/* Consent Modal */}
      <AIConsentModal
        visible={showConsentModal}
        onAgree={handleAcceptConsent}
        onDecline={handleDeclineConsent}
      />
      <ScreenshotToast visible={showScreenshotToast} onDismiss={dismissScreenshotToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  captureContainer: {
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  imagesContainer: {
    width: '100%',
    marginBottom: 24,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manualLink: {
    marginTop: 20,
    paddingVertical: 8,
  },
  manualLinkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
