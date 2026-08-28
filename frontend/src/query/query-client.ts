import { QueryClient } from '@tanstack/react-query';

import { ApiError, ApiNetworkError } from '@/api/api-errors';

export function createApplicationQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        staleTime: 30 * 1000,
      },
    },
  });
}

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiNetworkError) return true;
  return error instanceof ApiError && error.status >= 500;
}
