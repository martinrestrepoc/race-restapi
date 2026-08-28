import { createContext } from 'react';

import type { ApiClient } from './api-client';
import type { ResourceApi } from './resource-api';

export interface ApiContextValue {
  client: ApiClient;
  resources: ResourceApi;
}

export const ApiContext = createContext<ApiContextValue | undefined>(undefined);
