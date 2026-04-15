import { useState, useEffect, useCallback, useRef } from 'react';
import type { InsightTrendsResponse } from '../../domain/types';
import { insightTrendsService } from '../../data/services/insightTrendsService';
import { offlineCache } from '../../data/utils/offlineCache';

const CACHE_KEY = 'insight_trends';

const STALE_THRESHOLD_MS = 60_000; // 60 seconds — re-fetch if data is older than this on focus

export function useInsightTrends() {
  const [data, setData] = useState<InsightTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const dataRef = useRef<InsightTrendsResponse | null>(null);
  const lastFetchedAtRef = useRef<number>(0);

  const fetchTrends = useCallback(async (refresh = false) => {
    // 1. Show cache immediately as placeholder while fetching
    if (!refresh) {
      const cached = await offlineCache.get<InsightTrendsResponse>(CACHE_KEY);
      if (cached && Array.isArray(cached.day_of_week)) {
        setData(cached);
        dataRef.current = cached;
        setLoading(false);
      }
    }

    // 2. Fetch from server — use cache on initial mount, bypass only on explicit refresh
    try {
      const fresh = await insightTrendsService.getTrends(refresh);
      setData(fresh);
      dataRef.current = fresh;
      lastFetchedAtRef.current = Date.now();
      offlineCache.set(CACHE_KEY, fresh);
      setIsOnline(true);
      setError(null);
    } catch {
      setIsOnline(false);
      if (!dataRef.current) {
        setError('Could not load insights — connect to retry');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => fetchTrends(true), [fetchTrends]);

  /** Re-fetch only if data is older than STALE_THRESHOLD_MS. Safe to call on every screen focus. */
  const refreshIfStale = useCallback(() => {
    if (Date.now() - lastFetchedAtRef.current > STALE_THRESHOLD_MS) {
      fetchTrends(true);
    }
  }, [fetchTrends]);

  return { data, loading, error, isOnline, refresh, refreshIfStale };
}
