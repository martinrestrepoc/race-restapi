import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '@/auth/keycloak-client';

import { RootApplication } from './RootApplication';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'race-management',
  keycloakClientId: 'race-frontend',
};

const userResponse = {
  sub: 'viewer-sub',
  username: 'viewer',
  email: 'viewer@example.test',
  roles: ['VIEWER'],
};

const profileResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  keycloakUserId: 'viewer-sub',
  emailSnapshot: 'viewer@example.test',
  displayName: 'Demo Viewer',
  status: 'ACTIVE',
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

function createClient(authenticated: boolean): AuthClient {
  return {
    authenticated,
    clearToken: vi.fn(),
    init: vi.fn().mockResolvedValue(authenticated),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    ...(authenticated ? { token: 'access-token' } : {}),
    updateToken: vi.fn().mockResolvedValue(false),
  };
}

function mockSession(profile = profileResponse, domainResponses = false) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = new URL(requestUrl(input), 'http://localhost');
    if (url.pathname.endsWith('/auth/me'))
      return Promise.resolve(Response.json(userResponse));
    if (url.pathname.endsWith('/users/me'))
      return Promise.resolve(Response.json(profile));

    if (domainResponses && url.pathname.endsWith('/standings')) {
      return Promise.resolve(
        Response.json({
          competitors: paginated([
            {
              bestFinalTimeMs: 72_450,
              competitorId: 'competitor-1',
              name: 'Ayla Stonefoot',
              nickname: 'GraniteDash',
              position: 1,
              racesCompleted: 1,
              secondPlaces: 0,
              status: 'ACTIVE',
              totalPoints: 10,
              type: 'DWARF',
              wins: 1,
            },
          ]),
          pointsTable: [{ points: 10, position: 1 }],
          teams: paginated([]),
          zeroPointResultStatuses: [
            'DISQUALIFIED',
            'DID_NOT_FINISH',
            'DID_NOT_START',
          ],
        }),
      );
    }
    if (domainResponses && url.pathname.endsWith('/competitors')) {
      return Promise.resolve(
        Response.json({ ...paginated([]), totalItems: 9 }),
      );
    }
    if (domainResponses && url.pathname.endsWith('/races')) {
      if (url.searchParams.get('status') === 'IN_PROGRESS')
        return Promise.resolve(Response.json(paginated([])));
      if (url.searchParams.get('status') === 'COMPLETED')
        return Promise.resolve(
          Response.json(
            paginated([
              race(
                'completed-race',
                'Carrera inaugural',
                'COMPLETED',
                '2026-07-20T14:00:00.000Z',
              ),
            ]),
          ),
        );
      return Promise.resolve(
        Response.json(
          paginated([
            race(
              'future-race',
              'Reto de montaña',
              'OPEN_FOR_REGISTRATION',
              '2035-10-12T14:00:00.000Z',
            ),
          ]),
        ),
      );
    }
    if (domainResponses && url.pathname.includes('/results')) {
      return Promise.resolve(
        Response.json(
          paginated([
            {
              finalPosition: 1,
              finalTimeMs: 72_450,
              id: 'result-1',
              notes: null,
              penaltyTimeMs: 0,
              raceId: 'completed-race',
              rawTimeMs: 72_450,
              recordedAt: '2026-07-20T14:30:00.000Z',
              recordedByUserProfileId: null,
              registrationId: 'registration-1',
              startingPosition: 1,
              status: 'FINISHED',
              updatedAt: '2026-07-20T14:30:00.000Z',
            },
          ]),
        ),
      );
    }

    return Promise.resolve(Response.json(paginated([])));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('RootApplication authentication and routing boundaries', () => {
  it('redirects anonymous users to login and starts Keycloak explicitly', async () => {
    const user = userEvent.setup();
    const client = createClient(false);
    render(<RootApplication authClient={client} environment={environment} />);

    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    );
    expect(client.login).toHaveBeenCalledWith({
      redirectUri: 'http://localhost:3000/',
    });
  });

  it('removes OIDC response parameters from the login return URI', async () => {
    const user = userEvent.setup();
    const client = createClient(false);
    window.history.replaceState(
      null,
      '',
      '/?error=login_required&state=oidc-state&iss=http%3A%2F%2Flocalhost%3A8080',
    );
    render(<RootApplication authClient={client} environment={environment} />);

    await user.click(
      await screen.findByRole('button', { name: 'Iniciar sesión' }),
    );
    expect(client.login).toHaveBeenCalledWith({
      redirectUri: 'http://localhost:3000/',
    });
  });

  it('renders real dashboard responses and viewer-safe navigation', async () => {
    const client = createClient(true);
    const fetchMock = mockSession(profileResponse, true);
    render(<RootApplication authClient={client} environment={environment} />);

    expect(await screen.findByText('Demo Viewer')).toBeInTheDocument();
    expect(screen.getByText('Consultor')).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', {
      name: 'Navegación principal',
    });
    expect(
      within(navigation).queryByRole('button', { name: 'Administración' }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Panel general' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText('Reto de montaña')).not.toHaveLength(0);
    expect(await screen.findAllByText('Ayla Stonefoot')).not.toHaveLength(0);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        requestUrl(input).includes('/registrations'),
      ),
    ).toBe(false);
  });

  it('routes a disabled local profile away from domain content', async () => {
    const client = createClient(true);
    mockSession({ ...profileResponse, status: 'DISABLED' });
    render(<RootApplication authClient={client} environment={environment} />);

    expect(
      await screen.findByRole('heading', { name: 'Acceso deshabilitado' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Panel general' }),
    ).not.toBeInTheDocument();
  });

  it('blocks viewer access to administrator routes', async () => {
    const client = createClient(true);
    mockSession(profileResponse, true);
    window.history.replaceState(null, '', '/users');
    render(<RootApplication authClient={client} environment={environment} />);

    expect(
      await screen.findByRole('heading', { name: 'Permisos insuficientes' }),
    ).toBeInTheDocument();
  });

  it('clears an API-rejected session and returns to login', async () => {
    const client = createClient(true);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 401 })),
    );
    render(<RootApplication authClient={client} environment={environment} />);

    await waitFor(() => expect(client.clearToken).toHaveBeenCalled());
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
  });
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function paginated(items: unknown[]) {
  return {
    items,
    limit: 20,
    page: 1,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
}

function race(id: string, name: string, status: string, scheduledAt: string) {
  return {
    createdAt: '2026-07-01T12:00:00.000Z',
    description: null,
    distanceMeters: 5000,
    finishLocation: 'Meta',
    id,
    maxParticipants: 12,
    name,
    organizerUserProfileId: null,
    registrationDeadline: '2035-10-10T23:59:59.000Z',
    scheduledAt,
    startLocation: 'Salida',
    status,
    type: 'INDIVIDUAL',
    updatedAt: '2026-07-01T12:00:00.000Z',
  };
}
