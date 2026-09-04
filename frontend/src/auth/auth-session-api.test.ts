import { describe, expect, it, vi } from 'vitest';

import { AuthApiError, loadAuthenticatedSession } from './auth-session-api';
import type { AuthClient } from './keycloak-client';

const userResponse = {
  sub: 'keycloak-user',
  username: 'admin',
  email: 'admin@example.test',
  roles: ['ADMINISTRATOR'],
};

const profileResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  keycloakUserId: 'keycloak-user',
  emailSnapshot: 'admin@example.test',
  displayName: 'Demo Administrator',
  status: 'ACTIVE',
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

function createClient(): AuthClient {
  return {
    authenticated: true,
    clearToken: vi.fn(),
    init: vi.fn().mockResolvedValue(true),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    token: 'access-token',
    updateToken: vi.fn().mockResolvedValue(false),
  };
}

describe('loadAuthenticatedSession', () => {
  it('loads validated identity and local profile using the bearer token', async () => {
    const request = vi.fn<typeof fetch>((input, init) => {
      const url = requestUrl(input);
      const body = url.endsWith('/auth/me') ? userResponse : profileResponse;

      expect(init?.headers).toEqual({
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
      });
      return Promise.resolve(Response.json(body));
    });

    await expect(
      loadAuthenticatedSession(createClient(), '/api/v1', request),
    ).resolves.toEqual({
      user: userResponse,
      profile: profileResponse,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown role values instead of trusting them', async () => {
    const request = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      return Promise.resolve(
        Response.json(
          url.endsWith('/auth/me')
            ? { ...userResponse, roles: ['SUPER_ADMIN'] }
            : profileResponse,
        ),
      );
    });

    await expect(
      loadAuthenticatedSession(createClient(), '/api/v1', request),
    ).rejects.toThrow('No fue posible validar la sesión.');
  });

  it('preserves authentication API status without exposing its response body', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ secret: 'must-not-surface' }), {
        status: 403,
      }),
    );

    await expect(
      loadAuthenticatedSession(createClient(), '/api/v1', request),
    ).rejects.toEqual(new AuthApiError(403));
  });
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
