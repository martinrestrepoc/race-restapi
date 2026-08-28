import { z } from 'zod';

import type { AuthenticatedSession } from './auth.types';
import { appRoles } from './auth.types';
import type { AuthClient } from './keycloak-client';
import { getFreshAccessToken } from './keycloak-client';

const authMeSchema = z.object({
  sub: z.string().min(1),
  username: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  roles: z.array(z.enum(appRoles)),
});

const userProfileSchema = z.object({
  id: z.uuid(),
  keycloakUserId: z.string().min(1),
  emailSnapshot: z.string().nullable(),
  displayName: z.string().min(1),
  status: z.enum(['ACTIVE', 'DISABLED']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class AuthApiError extends Error {
  constructor(readonly status: number) {
    super('The authentication API rejected the session request.');
    this.name = 'AuthApiError';
  }
}

export async function loadAuthenticatedSession(
  client: AuthClient,
  apiBaseUrl: string,
  request: typeof fetch = fetch,
): Promise<AuthenticatedSession> {
  const token = await getFreshAccessToken(client);
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [user, profile] = await Promise.all([
    requestAndParse(
      `${withoutTrailingSlash(apiBaseUrl)}/auth/me`,
      headers,
      authMeSchema,
      request,
    ),
    requestAndParse(
      `${withoutTrailingSlash(apiBaseUrl)}/users/me`,
      headers,
      userProfileSchema,
      request,
    ),
  ]);

  return { profile, user };
}

async function requestAndParse<Output>(
  url: string,
  headers: Record<string, string>,
  schema: z.ZodType<Output>,
  request: typeof fetch,
): Promise<Output> {
  const response = await request(url, {
    cache: 'no-store',
    headers,
    method: 'GET',
  });

  if (!response.ok) {
    throw new AuthApiError(response.status);
  }

  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error('The authentication API returned an invalid response.');
  }

  return parsed.data;
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}
