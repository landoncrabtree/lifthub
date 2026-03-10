import { useState, useEffect, useCallback } from 'react';
import { get } from '@/api/client';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(path: string | null): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (fetchPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await get<T>(fetchPath);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (path === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    fetchData(path);
  }, [path, fetchData]);

  const refetch = useCallback(() => {
    if (path) fetchData(path);
  }, [path, fetchData]);

  return { data, loading, error, refetch };
}
