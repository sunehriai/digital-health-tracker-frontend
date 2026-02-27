import { useState, useEffect, useCallback } from 'react';
import { exportService } from '../../data/services/exportService';
import { AccountDeactivatedError } from '../../data/api/client';
import type { DateRangePreset, ReportType } from '../../domain/types';

export function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup stale temp PDFs on mount
  useEffect(() => {
    exportService.cleanupTempFiles();
  }, []);

  const generateAndShare = useCallback(
    async (reportType: ReportType, dateRange: DateRangePreset) => {
      setLoading(true);
      setError(null);

      try {
        await exportService.downloadAndShare(reportType, dateRange);
      } catch (err) {
        // AccountDeactivatedError is handled globally via listener — don't show as UI error
        if (err instanceof AccountDeactivatedError) {
          throw err;
        }

        const message = err instanceof Error ? err.message : 'Failed to generate report';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { loading, error, generateAndShare, clearError };
}
