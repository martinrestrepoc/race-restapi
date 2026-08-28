import { describe, expect, it, vi } from 'vitest';

import type { AuthClient } from './keycloak-client';
import {
  AuthenticationExpiredError,
  getFreshAccessToken,
  initializeKeycloak,
} from './keycloak-client';

function createClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    authenticated: false,
    clearToken: vi.fn(),
    init: vi.fn().mockResolvedValue(false),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    updateToken: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe('Keycloak client lifecycle', () => {
  it('initializes each client only once with standard flow and PKCE S256', async () => {
    const client = createClient();

    await Promise.all([initializeKeycloak(client), initializeKeycloak(client)]);

    expect(client.init).toHaveBeenCalledTimes(1);
    expect(client.init).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: 'standard',
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        responseMode: 'query',
      }),
    );
  });

  it('refreshes and returns the in-memory access token', async () => {
    const client = createClient({ token: 'access-token' });

    await expect(getFreshAccessToken(client)).resolves.toBe('access-token');
    expect(client.updateToken).toHaveBeenCalledWith(30);
  });

  it('clears the client when refresh fails', async () => {
    const client = createClient({
      updateToken: vi.fn().mockRejectedValue(new Error('offline')),
    });

    await expect(getFreshAccessToken(client)).rejects.toBeInstanceOf(
      AuthenticationExpiredError,
    );
    expect(client.clearToken).toHaveBeenCalledOnce();
  });
});
