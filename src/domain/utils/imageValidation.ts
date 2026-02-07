/**
 * Image validation utilities for AI medication upload.
 *
 * Validates image format, size, and dimensions before upload.
 */

// ============================================================
// CONSTRAINTS
// ============================================================

export const IMAGE_CONSTRAINTS = {
  // Accepted formats
  ACCEPTED_FORMATS: ['jpg', 'jpeg', 'png'] as const,
  ACCEPTED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png'] as const,

  // Rejected formats (with specific error messages)
  REJECTED_FORMATS: {
    pdf: 'PDFs aren\'t supported. Please photograph the label instead.',
    mp4: 'Please upload a photo, not a video.',
    mov: 'Please upload a photo, not a video.',
    gif: 'GIFs aren\'t supported. Please upload a still photo.',
    webp: 'WebP format isn\'t supported. Please use JPG or PNG.',
  } as const,

  // Size limits
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB

  // Dimension limits
  MAX_DIMENSION_PX: 4000,
  TARGET_DIMENSION_PX: 1200, // Resize to this for upload

  // Compression
  COMPRESSION_QUALITY: 0.8,
} as const;

// ============================================================
// TYPES
// ============================================================

export type AcceptedFormat = typeof IMAGE_CONSTRAINTS.ACCEPTED_FORMATS[number];
export type RejectedFormat = keyof typeof IMAGE_CONSTRAINTS.REJECTED_FORMATS;

export interface ImageValidationResult {
  isValid: boolean;
  error: string | null;
  errorType: 'format' | 'size' | 'dimensions' | null;
}

export interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  fileName: string;
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Get file extension from filename or URI.
 */
export function getFileExtension(fileNameOrUri: string): string {
  const parts = fileNameOrUri.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Check if a file format is accepted.
 */
export function isAcceptedFormat(extension: string): boolean {
  return IMAGE_CONSTRAINTS.ACCEPTED_FORMATS.includes(
    extension.toLowerCase() as AcceptedFormat
  );
}

/**
 * Check if a MIME type is accepted.
 */
export function isAcceptedMimeType(mimeType: string): boolean {
  return IMAGE_CONSTRAINTS.ACCEPTED_MIME_TYPES.includes(
    mimeType.toLowerCase() as typeof IMAGE_CONSTRAINTS.ACCEPTED_MIME_TYPES[number]
  );
}

/**
 * Get rejection message for a specific format.
 */
export function getRejectionMessage(extension: string): string {
  const ext = extension.toLowerCase() as RejectedFormat;
  if (ext in IMAGE_CONSTRAINTS.REJECTED_FORMATS) {
    return IMAGE_CONSTRAINTS.REJECTED_FORMATS[ext];
  }
  return 'Format not supported. Please upload a clear photo of the label.';
}

/**
 * Validate image format by extension.
 */
export function validateFormat(fileName: string): ImageValidationResult {
  const extension = getFileExtension(fileName);

  if (isAcceptedFormat(extension)) {
    return { isValid: true, error: null, errorType: null };
  }

  return {
    isValid: false,
    error: getRejectionMessage(extension),
    errorType: 'format',
  };
}

/**
 * Validate image file size.
 */
export function validateFileSize(sizeInBytes: number): ImageValidationResult {
  if (sizeInBytes <= IMAGE_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
    return { isValid: true, error: null, errorType: null };
  }

  const sizeMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
  return {
    isValid: false,
    error: `Image is too large (${sizeMB}MB). Maximum size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB}MB.`,
    errorType: 'size',
  };
}

/**
 * Validate image dimensions.
 */
export function validateDimensions(width: number, height: number): ImageValidationResult {
  const maxDim = Math.max(width, height);

  if (maxDim <= IMAGE_CONSTRAINTS.MAX_DIMENSION_PX) {
    return { isValid: true, error: null, errorType: null };
  }

  return {
    isValid: false,
    error: `Image is too large (${width}x${height}). Maximum dimension is ${IMAGE_CONSTRAINTS.MAX_DIMENSION_PX}px.`,
    errorType: 'dimensions',
  };
}

/**
 * Validate an image fully (format, size, dimensions).
 */
export function validateImage(imageInfo: ImageInfo): ImageValidationResult {
  // Check format
  const formatResult = validateFormat(imageInfo.fileName);
  if (!formatResult.isValid) return formatResult;

  // Check MIME type if available
  if (imageInfo.mimeType && !isAcceptedMimeType(imageInfo.mimeType)) {
    return {
      isValid: false,
      error: getRejectionMessage(getFileExtension(imageInfo.fileName)),
      errorType: 'format',
    };
  }

  // Check file size
  const sizeResult = validateFileSize(imageInfo.fileSize);
  if (!sizeResult.isValid) return sizeResult;

  // Check dimensions
  const dimensionsResult = validateDimensions(imageInfo.width, imageInfo.height);
  if (!dimensionsResult.isValid) return dimensionsResult;

  return { isValid: true, error: null, errorType: null };
}

// ============================================================
// MAGIC BYTES VALIDATION
// ============================================================

/**
 * Validate image content by checking magic bytes.
 * This catches renamed malicious files that have fake extensions.
 *
 * @param uri - File URI to read
 * @returns Validation result
 */
export async function validateMagicBytes(uri: string): Promise<ImageValidationResult> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 3) {
      return {
        isValid: false,
        error: 'File is too small to be a valid image.',
        errorType: 'format',
      };
    }

    // Check JPEG magic bytes: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { isValid: true, error: null, errorType: null };
    }

    // Check PNG magic bytes: 89 50 4E 47 (first 4 bytes)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { isValid: true, error: null, errorType: null };
    }

    return {
      isValid: false,
      error: 'File content doesn\'t match a valid JPEG or PNG image.',
      errorType: 'format',
    };
  } catch {
    // If we can't read the file, let the backend handle validation
    return { isValid: true, error: null, errorType: null };
  }
}

/**
 * Validate an image fully including magic bytes (async version).
 * Use this for complete validation before upload.
 */
export async function validateImageAsync(imageInfo: ImageInfo): Promise<ImageValidationResult> {
  // Run sync validations first (fast)
  const syncResult = validateImage(imageInfo);
  if (!syncResult.isValid) return syncResult;

  // Then check magic bytes (requires file read)
  const magicBytesResult = await validateMagicBytes(imageInfo.uri);
  if (!magicBytesResult.isValid) return magicBytesResult;

  return { isValid: true, error: null, errorType: null };
}

// ============================================================
// RESIZE HELPERS
// ============================================================

/**
 * Check if an image needs resizing.
 */
export function needsResize(width: number, height: number): boolean {
  return Math.max(width, height) > IMAGE_CONSTRAINTS.TARGET_DIMENSION_PX;
}

/**
 * Calculate new dimensions for resizing.
 * Maintains aspect ratio with longest side = TARGET_DIMENSION_PX.
 */
export function calculateResizeDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  if (!needsResize(width, height)) {
    return { width, height };
  }

  const target = IMAGE_CONSTRAINTS.TARGET_DIMENSION_PX;

  if (width > height) {
    return {
      width: target,
      height: Math.round((height / width) * target),
    };
  } else {
    return {
      width: Math.round((width / height) * target),
      height: target,
    };
  }
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================

/**
 * Check if two images are likely duplicates.
 * Uses filename and size as a simple heuristic.
 */
export function areLikelyDuplicates(
  image1: { fileName: string; fileSize: number } | null,
  image2: { fileName: string; fileSize: number } | null
): boolean {
  if (!image1 || !image2) return false;

  return (
    image1.fileName === image2.fileName &&
    image1.fileSize === image2.fileSize
  );
}
