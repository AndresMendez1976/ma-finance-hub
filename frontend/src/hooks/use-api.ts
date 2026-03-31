'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const result = await api.get<T>(path);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
