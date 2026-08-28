import { useContext } from 'react';

import { ApiContext } from './api-context';

export function useApi() {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApi must be used within ApiProvider.');
  return value;
}
