import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for API calls
 * Usage: const { data, loading, error } = useAPI(apiFunction, params)
 */
export function useAPI(apiFunction, params = {}, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction(params);
      setData(result?.data || result);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFunction, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Custom hook for API mutations
 * Usage: const { mutate, loading, error } = useMutation(apiFunction)
 */
export function useMutation(apiFunction) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunction(...args);
        return result;
      } catch (err) {
        const errorMsg = err.message || 'Operation failed';
        setError(errorMsg);
        console.error('Mutation Error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction]
  );

  return { mutate, loading, error };
}

/**
 * Custom hook for paginated API calls
 * Usage: const { data, page, setPage, loading } = usePaginated(apiFunction)
 */
export function usePaginated(apiFunction, limit = 20) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const loadPage = useCallback(
    async (pageNum) => {
      setLoading(true);
      try {
        const result = await apiFunction({ page: pageNum, limit });
        if (pageNum === 1) {
          setData(result.data || []);
        } else {
          setData((prev) => [...prev, ...(result.data || [])]);
        }
        setTotal(result.total || 0);
        setHasMore(result.page < result.pages);
        setPage(pageNum);
      } catch (err) {
        console.error('Pagination Error:', err);
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, limit]
  );

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadPage(page + 1);
    }
  }, [page, hasMore, loading, loadPage]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, page, setPage, loading, hasMore, total, loadMore, reset };
}
