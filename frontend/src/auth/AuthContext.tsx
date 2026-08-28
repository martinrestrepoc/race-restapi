import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AuthApiError, loadAuthenticatedSession } from './auth-session-api';
import type { AuthenticatedUser, AuthStatus, UserProfile } from './auth.types';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthClient } from './keycloak-client';
import {
  AuthenticationExpiredError,
  getFreshAccessToken,
  initializeKeycloak,
} from './keycloak-client';

interface AuthProviderProps {
  apiBaseUrl: string;
  children: ReactNode;
  client: AuthClient;
}

export function AuthProvider({
  apiBaseUrl,
  children,
  client,
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const authenticated = await initializeKeycloak(client);
        if (!active) return;

        if (!authenticated) {
          setStatus('anonymous');
          return;
        }

        const session = await loadAuthenticatedSession(client, apiBaseUrl);
        if (!active) return;

        setUser(session.user);
        setProfile(session.profile);
        setStatus('authenticated');
      } catch (error: unknown) {
        if (!active) return;

        setUser(null);
        setProfile(null);

        if (
          error instanceof AuthenticationExpiredError ||
          (error instanceof AuthApiError && error.status === 401)
        ) {
          client.clearToken();
          setStatus('anonymous');
        } else if (error instanceof AuthApiError && error.status === 403) {
          setStatus('forbidden');
        } else {
          setStatus('error');
        }
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, client]);

  const login = useCallback(
    async (returnTo = '/') => {
      const safeReturnTo = sanitizeReturnTo(returnTo);
      await client.login({
        redirectUri: new URL(safeReturnTo, window.location.origin).toString(),
      });
    },
    [client],
  );

  const logout = useCallback(async () => {
    await client.logout({
      redirectUri: new URL('/login', window.location.origin).toString(),
    });
  }, [client]);

  const getAccessToken = useCallback(
    () => getFreshAccessToken(client),
    [client],
  );

  const handleUnauthorized = useCallback(() => {
    client.clearToken();
    setUser(null);
    setProfile(null);
    setStatus('anonymous');
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      getAccessToken,
      handleUnauthorized,
      login,
      logout,
      profile,
      roles: user?.roles ?? [],
      status,
      user,
    }),
    [getAccessToken, handleUnauthorized, login, logout, profile, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function sanitizeReturnTo(returnTo: string): string {
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/';

  const url = new URL(returnTo, window.location.origin);
  for (const parameter of oidcResponseParameters) {
    url.searchParams.delete(parameter);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

const oidcResponseParameters = [
  'code',
  'error',
  'error_description',
  'error_uri',
  'iss',
  'session_state',
  'state',
] as const;
