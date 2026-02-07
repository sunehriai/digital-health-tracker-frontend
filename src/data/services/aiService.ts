/**
 * AI Service
 *
 * Handles communication with the AI analysis backend endpoint.
 * Supports image upload for medication label extraction.
 */

import { apiClient } from '../api/client';
import { ENDPOINTS, API_BASE } from '../api/endpoints';
import { GeminiResponse } from '../../domain/utils/aiTransformUtils';
import { validateGeminiResponse, hasErrorCode } from '../../domain/utils/geminiValidation';
import { ImageInfo } from '../../domain/utils/imageValidation';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AIService');

// ============================================================
// TYPES
// ============================================================

export interface AIProviderMetadata {
  provider: 'gemini' | 'vertex' | 'mock';
  model_name: string;
  supports_multi_image: boolean;
  max_images: number;
}

export interface ImageUploadRequest {
  front_image_base64: string;
  back_image_base64: string | null;
  front_mime_type: string;
  back_mime_type: string | null;
}

export interface AIAnalysisResult {
  success: boolean;
  data: GeminiResponse | null;
  error: string | null;
  errorCode: string | null;
}

// ============================================================
// IMAGE CONVERSION
// ============================================================

/**
 * Convert an image URI to base64 string.
 * Works with both file:// URIs (native) and blob/data URIs (web).
 */
async function imageUriToBase64(uri: string): Promise<string> {
  // If it's already base64, return as-is
  if (uri.startsWith('data:')) {
    // Extract just the base64 part after the comma
    const base64Part = uri.split(',')[1];
    return base64Part || uri;
  }

  // For file:// URIs (React Native), use fetch to get blob
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get MIME type from ImageInfo or infer from URI.
 */
function getMimeType(imageInfo: ImageInfo): string {
  if (imageInfo.mimeType) return imageInfo.mimeType;

  // Infer from filename
  const ext = imageInfo.fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/jpeg'; // Default assumption
  }
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * Get AI provider metadata.
 * Useful for displaying provider info or checking capabilities.
 */
export async function getAIProviderMetadata(): Promise<AIProviderMetadata> {
  return apiClient.request<AIProviderMetadata>(ENDPOINTS.AI_PROVIDER_METADATA);
}

/**
 * Analyze medication images using AI.
 *
 * @param frontImage - Required front image info
 * @param backImage - Optional back image info
 * @returns Analysis result with either data or error
 */
export async function analyzeMedicationImages(
  frontImage: ImageInfo,
  backImage: ImageInfo | null
): Promise<AIAnalysisResult> {
  logger.info('Starting medication image analysis', {
    frontImageUri: frontImage.uri?.substring(0, 50) + '...',
    hasBackImage: !!backImage,
  });

  try {
    // Convert images to base64
    logger.debug('Converting front image to base64');
    const frontBase64 = await imageUriToBase64(frontImage.uri);
    logger.debug('Front image converted', { base64Length: frontBase64.length });
    const frontMimeType = getMimeType(frontImage);

    let backBase64: string | null = null;
    let backMimeType: string | null = null;

    if (backImage) {
      backBase64 = await imageUriToBase64(backImage.uri);
      backMimeType = getMimeType(backImage);
    }

    // Prepare request
    const request: ImageUploadRequest = {
      front_image_base64: frontBase64,
      back_image_base64: backBase64,
      front_mime_type: frontMimeType,
      back_mime_type: backMimeType,
    };

    // Make API call
    logger.info('Making API call to analyze images', { endpoint: ENDPOINTS.AI_ANALYZE });
    const rawResponse = await apiClient.request<unknown>(ENDPOINTS.AI_ANALYZE, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    logger.debug('Raw response received', {
      responsePreview: JSON.stringify(rawResponse)?.substring(0, 200)
    });

    // Check for hard error code first
    const errorCode = hasErrorCode(rawResponse);
    if (errorCode) {
      logger.warn('AI scan returned error code', { errorCode });
      return {
        success: false,
        data: null,
        error: getErrorMessageForCode(errorCode),
        errorCode,
      };
    }

    // Validate response structure
    const validation = validateGeminiResponse(rawResponse);

    if (!validation.isValid) {
      logger.error('Response validation failed', new Error('Validation failed'), {
        errors: validation.errors,
      });
      return {
        success: false,
        data: null,
        error: 'Invalid response from AI service. Please try again.',
        errorCode: 'PARSE_ERROR',
      };
    }

    const medicationName = validation.data?.medication_info?.name?.value || 'Unknown';
    logger.info('AI analysis completed successfully', { medicationName });

    return {
      success: true,
      data: validation.data,
      error: null,
      errorCode: null,
    };
  } catch (error) {
    logger.error('AI analysis failed', error as Error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Unable to analyze image. Please try again.';

    return {
      success: false,
      data: null,
      error: errorMessage,
      errorCode: 'API_ERROR',
    };
  }
}

/**
 * Get user-friendly error message for error codes.
 */
function getErrorMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    'MULTIPLE_PRODUCTS': 'Multiple medications detected. Please photograph one medication at a time.',
    'UNSUPPORTED_LANGUAGE': 'We currently only support English labels. Please enter this medication manually.',
    'PRODUCT_MISMATCH': 'The front and back images appear to be from different products. Please try again.',
    'NOT_PACKAGING': 'We detected a document instead of medication packaging. Please enter details manually.',
    'UNSUPPORTED_FORMAT': 'This format is not yet supported. Please enter details manually.',
    'API_ERROR': 'Unable to analyze the image. Please try again or enter details manually.',
    'PARSE_ERROR': 'Unable to process the AI response. Please try again or enter details manually.',
  };

  return messages[code] || 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error code indicates a "hard" error (user must restart).
 * Includes API/network errors where retry or manual entry are the options.
 */
export function isHardError(errorCode: string | null): boolean {
  if (!errorCode) return false;
  return ['MULTIPLE_PRODUCTS', 'UNSUPPORTED_LANGUAGE', 'PRODUCT_MISMATCH', 'API_ERROR', 'PARSE_ERROR'].includes(errorCode);
}

/**
 * Check if an error code indicates a "soft" error (can proceed to manual entry).
 */
export function isSoftError(errorCode: string | null): boolean {
  if (!errorCode) return false;
  return ['NOT_PACKAGING', 'UNSUPPORTED_FORMAT'].includes(errorCode);
}
