import { useState, useEffect, useCallback } from 'react';
import type { VitalityFeedItem } from '../../domain/types';
import { feedService } from '../../data/services/feedService';
import { medicationEvents } from '../../data/utils/medicationEvents';

export function useFeed() {
  const [feedItems, setFeedItems] = useState<VitalityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await feedService.getAll();
      setFeedItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Listen for all_data_deleted event to clear in-memory state
  useEffect(() => {
    return medicationEvents.on('all_data_deleted', () => {
      setFeedItems([]);
    });
  }, []);

  const archiveFeedItem = async (id: string) => {
    await feedService.archive(id);
    setFeedItems((prev) => prev.filter((item) => item.id !== id));
  };

  return { feedItems, loading, error, fetchFeed, archiveFeedItem };
}
