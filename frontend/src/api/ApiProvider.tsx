import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth/use-auth';
import { createApplicationQueryClient } from '@/query/query-client';

import { createApiClient } from './api-client';
import { ApiContext } from './api-context';
import { createResourceApi } from './resource-api';

export function ApiProvider({
  baseUrl,
  children,
}: {
  baseUrl: string;
  children: ReactNode;
}) {
  const { getAccessToken, handleUnauthorized, status } = useAuth();
  const [queryClient] = useState(createApplicationQueryClient);

  useEffect(() => {
    if (status !== 'authenticated') queryClient.clear();
  }, [queryClient, status]);
  const value = useMemo(() => {
    const client = createApiClient({
      baseUrl,
      getAccessToken,
      onUnauthorized: handleUnauthorized,
    });
    return { client, resources: createResourceApi(client) };
  }, [baseUrl, getAccessToken, handleUnauthorized]);

  return (
    <ApiContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}
