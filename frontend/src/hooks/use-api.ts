'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, ApiError, extractArray } from '@/lib/api';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const result = await api.get<unknown>(path);
      // If T is expected to be an array, safely extract it from paginated responses
      if (Array.isArray(result)) {
        setData(result as T);
      } else if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>) && Array.isArray((result as Record<string, unknown>).data)) {
        setData((result as Record<string, unknown>).data as T);
      } else {
        setData(result as T);
      }
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
