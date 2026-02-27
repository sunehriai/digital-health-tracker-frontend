import { Platform } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE, ENDPOINTS } from '../api/endpoints';
import { AccountDeactivatedError, notifyDeactivation } from '../api/client';
import { createLogger } from '../../utils/logger';
import type { DateRangePreset, ReportType } from '../../domain/types';

const logger = createLogger('ExportService');

/** Map preset labels to start dates relative to today. */
function presetToStartDate(preset: DateRangePreset): string | null {
  const today = new Date();
  let start: Date;

  switch (preset) {
    case '7d':
      start = new Date(today);
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start = new Date(today);
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start = new Date(today);
      start.setDate(start.getDate() - 90);
      break;
    case '6mo':
      start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      break;
    case 'all':
      return null;
    default:
      return null;
  }

  return start.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Build the full URL for the health report endpoint with query params. */
function buildReportUrl(
  reportType: ReportType,
  dateRange: DateRangePreset,
): string {
  const params = new URLSearchParams();
  params.append('report_type', reportType);

  const endDate = todayISO();
  params.append('end_date', endDate);

  if (dateRange === 'all') {
    const start = new Date();
    start.setDate(start.getDate() - 365);
    params.append('start_date', start.toISOString().split('T')[0]);
  } else {
    const startDate = presetToStartDate(dateRange);
    if (startDate) {
      params.append('start_date', startDate);
    }
  }

  return `${API_BASE}${ENDPOINTS.EXPORT_HEALTH_REPORT}?${params.toString()}`;
}

/**
 * Check for ACCOUNT_DEACTIVATED in a fetch error response.
 * Throws AccountDeactivatedError if detected.
 */
async function checkDeactivation(response: Response): Promise<void> {
  if (response.status !== 403) return;
  try {
    const text = await response.clone().text();
    const json = JSON.parse(text);
    if (json.detail?.code === 'ACCOUNT_DEACTIVATED') {
      notifyDeactivation();
      throw new AccountDeactivatedError(json.detail.message);
    }
  } catch (e) {
    if (e instanceof AccountDeactivatedError) throw e;
  }
}

/** Parse a user-friendly error message from a failed fetch response. */
async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const json = JSON.parse(text);
    if (json.detail && typeof json.detail === 'object') {
      return json.detail.message || json.detail.code || text;
    }
    return json.detail || json.message || text;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

/** Handle non-OK fetch response: deactivation check, rate limit, generic error. */
async function handleErrorResponse(response: Response): Promise<never> {
  await checkDeactivation(response);

  if (response.status === 429) {
    throw new Error('Export limit reached. Please try again later.');
  }

  const message = await parseErrorMessage(response);
  throw new Error(message);
}

export const exportService = {
  /**
   * Download a health report PDF and open the native share sheet (or browser download).
   * Uses fetch() directly (bypasses ApiClient since response is binary).
   * Handles 403 ACCOUNT_DEACTIVATED independently (Audit 3.4).
   */
  async downloadAndShare(
    reportType: ReportType,
    dateRange: DateRangePreset,
  ): Promise<void> {
    const url = buildReportUrl(reportType, dateRange);
    const filename = `Vision_Medication_Passport_${todayISO()}.pdf`;

    logger.info('Starting report download', { reportType, dateRange });

    // Fetch the PDF — same approach for web and native
    const response = await fetch(url);

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    if (Platform.OS === 'web') {
      await this._saveWeb(response, filename);
    } else {
      await this._saveAndShareNative(response, filename);
    }
  },

  /** Web: create blob URL and trigger browser download. */
  async _saveWeb(response: Response, filename: string): Promise<void> {
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    logger.info('Report downloaded (web)', { filename });
  },

  /** Native: write PDF bytes to cache, then open share sheet. */
  async _saveAndShareNative(response: Response, filename: string): Promise<void> {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Write to cache directory
    const file = new File(Paths.cache, filename);
    file.write(bytes);

    logger.info('Report saved to cache', { filename, uri: file.uri });

    // Open native share sheet
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Health Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device.');
    }
  },

  /** Clean up stale Vision PDF files from cache directory. */
  cleanupTempFiles(): void {
    if (Platform.OS === 'web') return;

    try {
      const cacheDir = new Directory(Paths.cache);
      if (!cacheDir.exists) return;

      const entries = cacheDir.list();
      let cleaned = 0;

      for (const entry of entries) {
        if (entry instanceof File && entry.name.startsWith('Vision_') && entry.name.endsWith('.pdf')) {
          try {
            entry.delete();
            cleaned++;
          } catch { /* ignore individual delete errors */ }
        }
      }

      if (cleaned > 0) {
        logger.info('Cleaned up temp PDFs', { count: cleaned });
      }
    } catch {
      // Non-critical — ignore cleanup errors
    }
  },
};
