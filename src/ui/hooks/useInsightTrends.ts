import { useState, useEffect, useCallback, useRef } from 'react';
import type { InsightTrendsResponse } from '../../domain/types';
import { insightTrendsService } from '../../data/services/insightTrendsService';
import { offlineCache } from '../../data/utils/offlineCache';

const CACHE_KEY = 'insight_trends';

export function useInsightTrends() {
  const [data, setData] = useState<InsightTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const dataRef = useRef<InsightTrendsResponse | null>(null);

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

    // 2. Always fetch fresh from server (with refresh=true to bypass server cache)
    try {
      const fresh = await insightTrendsService.getTrends(true);
      setData(fresh);
      dataRef.current = fresh;
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

  return { data, loading, error, isOnline, refresh };
}
