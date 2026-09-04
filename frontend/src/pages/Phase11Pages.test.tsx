import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '@/auth/keycloak-client';
import { RootApplication } from '@/app/RootApplication';
import { localDateTimeToIso } from './races/race-view';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakClientId: 'race-frontend',
  keycloakRealm: 'race-management',
  keycloakUrl: 'http://localhost:8080',
};
const currentProfileId = '11111111-1111-4111-8111-111111111111';
const otherProfileId = '22222222-2222-4222-8222-222222222222';
const auditId = '33333333-3333-4333-8333-333333333333';
const competitorId = '44444444-4444-4444-8444-444444444444';
const teamId = '55555555-5555-4555-8555-555555555555';

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('phase 11 pages', () => {
  it('renders backend standings and forwards supported filters', async () => {
    window.history.replaceState(
      null,
      '',
      '/standings?search=sol&type=CAMEL&status=ACTIVE&sortBy=totalPoints&sortOrder=desc&page=2&limit=10',
    );
    const fetchMock = mockApi('VIEWER');
    renderApplication(createClient());

    expect(
      (await screen.findAllByText('Sol del desierto')).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('#1').length).toBeGreaterThan(0);
    const call = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('/standings/competitors?'),
    );
    const url = new URL(requestUrl(call![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      limit: '10',
      page: '2',
      search: 'sol',
      sortBy: 'totalPoints',
      sortOrder: 'desc',
      status: 'ACTIVE',
      type: 'CAMEL',
    });
  });

  it('switches to the independent team standings endpoint', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/standings');
    const fetchMock = mockApi('RACE_ORGANIZER');
    renderApplication(createClient());

    await screen.findAllByText('Sol del desierto');
    await user.click(screen.getByRole('tab', { name: 'Equipos' }));
    expect((await screen.findAllByText('Equipo arena')).length).toBeGreaterThan(
      0,
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        requestUrl(input).includes('/standings/teams?'),
      ),
    ).toBe(true);
  });

  it('blocks non-administrators from users and audit', async () => {
    window.history.replaceState(null, '', '/users');
    mockApi('VIEWER');
    renderApplication(createClient());
    expect(
      await screen.findByRole('heading', { name: 'Permisos insuficientes' }),
    ).toBeInTheDocument();
  });

  it('prevents administrators from disabling their own profile', async () => {
    window.history.replaceState(null, '', `/users/${currentProfileId}`);
    mockApi('ADMINISTRATOR');
    renderApplication(createClient());

    const button = await screen.findByRole('button', {
      name: 'Deshabilitar perfil',
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText('No puedes deshabilitar tu propio perfil activo.'),
    ).toBeInTheDocument();
  });

  it('changes another local profile status only after confirmation', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/users/${otherProfileId}`);
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication(createClient());

    await user.click(
      await screen.findByRole('button', { name: 'Deshabilitar perfil' }),
    );
    expect(
      findCall(fetchMock, `/users/${otherProfileId}/status`, 'PATCH'),
    ).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Deshabilitar' }));
    await waitFor(() =>
      expect(
        findCall(fetchMock, `/users/${otherProfileId}/status`, 'PATCH'),
      ).toBeDefined(),
    );
    const patchCall = findCall(
      fetchMock,
      `/users/${otherProfileId}/status`,
      'PATCH',
    );
    expect(jsonRequestBody(patchCall?.[1]?.body)).toEqual({
      status: 'DISABLED',
    });
  });

  it('converts the visible audit filters to the expected query', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/audit');
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication(createClient());

    await screen.findByRole('heading', { name: 'Auditoría' });
    await user.selectOptions(
      screen.getByLabelText('Acción'),
      'RESULT_CORRECTED',
    );
    await user.selectOptions(screen.getByLabelText('Elemento'), 'RACE_RESULT');
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-08-24T08:00' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-08-24T18:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          requestUrl(input).includes('action=RESULT_CORRECTED'),
        ),
      ).toBe(true),
    );
    const call = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('action=RESULT_CORRECTED'),
    );
    const url = new URL(requestUrl(call![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      action: 'RESULT_CORRECTED',
      entityType: 'RACE_RESULT',
      from: localDateTimeToIso('2026-08-24T08:00'),
      to: localDateTimeToIso('2026-08-24T18:00'),
    });
  });

  it('renders audit snapshots as escaped text', async () => {
    window.history.replaceState(null, '', `/audit/${auditId}`);
    mockApi('ADMINISTRATOR');
    const { container } = render(
      <RootApplication authClient={createClient()} environment={environment} />,
    );

    expect(
      await screen.findByText(/<img src=x onerror=alert\(1\)>/),
    ).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText(competitorId)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Editar|Eliminar/ }),
    ).not.toBeInTheDocument();
  });

  it('shows account information without exposing internal identifiers', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/profile');
    const client = createClient();
    mockApi('RACE_ORGANIZER');
    renderApplication(client);

    expect(
      await screen.findByRole('heading', { name: 'Mi perfil' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Organizador de carreras').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('user-sub')).not.toBeInTheDocument();
    expect(screen.queryByText(currentProfileId)).not.toBeInTheDocument();
    const logoutButtons = screen.getAllByRole('button', {
      name: 'Cerrar sesión',
    });
    await user.click(logoutButtons.at(-1)!);
    expect(client.logout).toHaveBeenCalledOnce();
  });
});

function renderApplication(client: AuthClient) {
  render(<RootApplication authClient={client} environment={environment} />);
}

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

function mockApi(role: 'ADMINISTRATOR' | 'RACE_ORGANIZER' | 'VIEWER') {
  let otherStatus = 'ACTIVE';
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    await Promise.resolve();
    const url = new URL(requestUrl(input), 'http://localhost');
    if (url.pathname.endsWith('/auth/me'))
      return Response.json({
        email: 'user@example.test',
        roles: [role],
        sub: 'user-sub',
        username: 'test-user',
      });
    if (url.pathname.endsWith('/users/me'))
      return Response.json(profile(currentProfileId, 'ACTIVE'));
    if (url.pathname === `/api/v1/users/${otherProfileId}/status`) {
      const body = jsonRequestBody(init?.body) as { status: string };
      otherStatus = body.status;
      return Response.json(profile(otherProfileId, otherStatus));
    }
    if (url.pathname === `/api/v1/users/${currentProfileId}`)
      return Response.json(profile(currentProfileId, 'ACTIVE'));
    if (url.pathname === `/api/v1/users/${otherProfileId}`)
      return Response.json(profile(otherProfileId, otherStatus));
    if (url.pathname === '/api/v1/users')
      return Response.json(
        paginated([profile(otherProfileId, otherStatus)], url),
      );
    if (url.pathname === `/api/v1/audit-logs/${auditId}`)
      return Response.json(auditEntry());
    if (url.pathname === '/api/v1/audit-logs')
      return Response.json(paginated([], url));
    if (url.pathname === '/api/v1/standings/competitors')
      return Response.json(paginated([competitorStanding()], url));
    if (url.pathname === '/api/v1/standings/teams')
      return Response.json(paginated([teamStanding()], url));
    if (url.pathname === '/api/v1/standings')
      return Response.json({
        competitors: paginated([competitorStanding()], url),
        pointsTable: [
          { points: 10, position: 1 },
          { points: 7, position: 2 },
        ],
        teams: paginated([teamStanding()], url),
        zeroPointResultStatuses: [
          'DID_NOT_START',
          'DID_NOT_FINISH',
          'DISQUALIFIED',
        ],
      });
    return Response.json(paginated([], url));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function profile(id: string, status: string) {
  return {
    createdAt: '2026-08-12T12:00:00.000Z',
    displayName: id === currentProfileId ? 'Test User' : 'Otra persona',
    emailSnapshot: 'user@example.test',
    id,
    keycloakUserId: id === currentProfileId ? 'user-sub' : 'other-sub',
    status,
    updatedAt: '2026-08-25T12:00:00.000Z',
  };
}

function competitorStanding() {
  return {
    bestFinalTimeMs: null,
    competitorId,
    name: 'Sol del desierto',
    nickname: 'Sol',
    position: 1,
    racesCompleted: 2,
    secondPlaces: 1,
    status: 'ACTIVE',
    totalPoints: 17,
    type: 'CAMEL',
    wins: 1,
  };
}

function teamStanding() {
  return {
    bestFinalTimeMs: 500_000,
    name: 'Equipo arena',
    position: 1,
    racesCompleted: 1,
    secondPlaces: 0,
    status: 'ACTIVE',
    teamId,
    totalPoints: 10,
    wins: 1,
  };
}

function auditEntry() {
  return {
    action: 'RESULT_CORRECTED',
    actorUserProfileId: currentProfileId,
    description: 'Result corrected',
    entityId: competitorId,
    entityType: 'RACE_RESULT',
    id: auditId,
    newValues: {
      competitorId,
      html: '<img src=x onerror=alert(1)>',
    },
    occurredAt: '2026-08-25T12:00:00.000Z',
    previousValues: { status: 'FINISHED' },
  };
}

function paginated(items: unknown[], url: URL) {
  return {
    items,
    limit: Number(url.searchParams.get('limit') ?? 20),
    page: Number(url.searchParams.get('page') ?? 1),
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
}

function findCall(
  fetchMock: ReturnType<typeof mockApi>,
  pathSuffix: string,
  method: string,
) {
  return fetchMock.mock.calls.find(
    ([input, init]) =>
      requestUrl(input).endsWith(pathSuffix) && init?.method === method,
  );
}

function jsonRequestBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') throw new Error('Missing JSON request body');
  return JSON.parse(body) as unknown;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
