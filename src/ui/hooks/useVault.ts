import { useState, useEffect, useCallback } from 'react';
import type { EmergencyVault, EmergencyVaultUpsert } from '../../domain/types';
import { vaultService } from '../../data/services/vaultService';
import { medicationEvents } from '../../data/utils/medicationEvents';

export function useVault() {
  const [vault, setVault] = useState<EmergencyVault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vaultService.get();
      setVault(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vault');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Listen for all_data_deleted event to clear in-memory state
  useEffect(() => {
    return medicationEvents.on('all_data_deleted', () => {
      setVault(null);
    });
  }, []);

  const updateVault = async (data: EmergencyVaultUpsert) => {
    const updated = await vaultService.update(data);
    setVault(updated);
    return updated;
  };

  return { vault, loading, error, fetchVault, updateVault };
}
