import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RootApplication } from '@/app/RootApplication';
import type { AuthClient } from '@/auth/keycloak-client';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakClientId: 'race-frontend',
  keycloakRealm: 'race-management',
  keycloakUrl: 'http://localhost:8080',
};

const teamId = '33333333-3333-4333-8333-333333333333';
const activeCompetitor = competitor(
  '44444444-4444-4444-8444-444444444444',
  'Ayla Stonefoot',
  'GraniteDash',
);
const historicalCompetitor = competitor(
  '55555555-5555-4555-8555-555555555555',
  'Bramble Swift',
  'DustRunner',
);
const candidateCompetitor = competitor(
  '66666666-6666-4666-8666-666666666666',
  'Cora Ember',
  'FireStep',
);

const team = {
  createdAt: '2026-08-12T12:00:00.000Z',
  description: 'Equipo de resistencia',
  id: teamId,
  name: 'Night Riders',
  responsiblePerson: 'Mara Torres',
  status: 'ACTIVE',
  updatedAt: '2026-08-12T12:00:00.000Z',
};

const activeMember = {
  competitor: activeCompetitor,
  id: '77777777-7777-4777-8777-777777777777',
  joinedAt: '2026-08-12T13:00:00.000Z',
  leftAt: null,
};

const historicalMember = {
  competitor: historicalCompetitor,
  id: '88888888-8888-4888-8888-888888888888',
  joinedAt: '2026-07-01T13:00:00.000Z',
  leftAt: '2026-08-01T13:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('teams and memberships vertical slice', () => {
  it('keeps supported team filters in the URL and hides mutations from viewers', async () => {
    window.history.replaceState(
      null,
      '',
      '/teams?status=ACTIVE&sortBy=name&sortOrder=asc&page=2&limit=10',
    );
    const fetchMock = mockApi('VIEWER');
    renderApplication();

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByText('Nuevo equipo')).not.toBeInTheDocument();
    const listCall = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('/teams?'),
    );
    expect(listCall).toBeDefined();
    const url = new URL(requestUrl(listCall![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      limit: '10',
      page: '2',
      sortBy: 'name',
      sortOrder: 'asc',
      status: 'ACTIVE',
    });
  });

  it('shows current and historical memberships as separate read-only sections', async () => {
    window.history.replaceState(null, '', `/teams/${teamId}`);
    mockApi('VIEWER');
    renderApplication();

    const currentSection = (
      await screen.findByRole('heading', { name: 'Integrantes actuales' })
    ).closest('section');
    const historySection = screen
      .getByRole('heading', { name: 'Historial de membresías' })
      .closest('section');
    expect(currentSection).not.toBeNull();
    expect(historySection).not.toBeNull();
    expect(
      within(currentSection!).getAllByText('Ayla Stonefoot'),
    ).not.toHaveLength(0);
    expect(
      within(currentSection!).queryByText('Bramble Swift'),
    ).not.toBeInTheDocument();
    expect(
      within(historySection!).getAllByText('Bramble Swift'),
    ).not.toHaveLength(0);
    expect(screen.queryByText('Agregar integrante')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Finalizar' }),
    ).not.toBeInTheDocument();
  });

  it('blocks a viewer from creating teams', async () => {
    window.history.replaceState(null, '', '/teams/new');
    mockApi('VIEWER');
    renderApplication();
    expect(
      await screen.findByRole('heading', { name: 'Permisos insuficientes' }),
    ).toBeInTheDocument();
  });

  it('maps duplicate team names to the form field', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/teams/new');
    mockApi('ADMINISTRATOR', { duplicateName: true });
    renderApplication();

    await user.click(
      await screen.findByRole('button', { name: 'Guardar equipo' }),
    );
    expect(
      await screen.findByText('El nombre es obligatorio.'),
    ).toBeInTheDocument();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Guardar equipo' }));
    expect(
      await screen.findByText('Este nombre de equipo ya está en uso.'),
    ).toBeInTheDocument();
  });

  it('creates a valid team and opens its detail', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/teams/new');
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Guardar equipo' }));
    expect(
      await screen.findByRole('heading', { name: 'Night Riders' }),
    ).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(post).toBeDefined();
    const body = post?.[1]?.body;
    expect(typeof body).toBe('string');
    if (typeof body !== 'string') throw new Error('Missing JSON body');
    expect(JSON.parse(body)).toEqual({
      description: 'Equipo de resistencia',
      name: 'Night Riders',
      responsiblePerson: 'Mara Torres',
      status: 'ACTIVE',
    });
  });

  it('surfaces a backend capacity conflict in understandable feedback', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/teams/${teamId}`);
    mockApi('ADMINISTRATOR', { capacityConflict: true });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText('Competidor'),
      candidateCompetitor.id,
    );
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(
      await screen.findByText(
        'El equipo alcanzó el máximo de integrantes activos.',
      ),
    ).toBeInTheDocument();
  });

  it('surfaces an active membership conflict', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/teams/${teamId}`);
    mockApi('ADMINISTRATOR', { membershipConflict: true });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText('Competidor'),
      candidateCompetitor.id,
    );
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(
      await screen.findByText(
        'El competidor ya pertenece a otro equipo activo.',
      ),
    ).toBeInTheDocument();
  });

  it('invalidates the detail after adding a member', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/teams/${teamId}`);
    mockApi('ADMINISTRATOR');
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText('Competidor'),
      candidateCompetitor.id,
    );
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    const currentSection = screen
      .getByRole('heading', { name: 'Integrantes actuales' })
      .closest('section');
    expect(currentSection).not.toBeNull();
    expect(
      await within(currentSection!).findAllByText('Cora Ember'),
    ).not.toHaveLength(0);
  });

  it('requires confirmation before ending an active membership', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/teams/${teamId}`);
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication();

    const finalizeButtons = await screen.findAllByRole('button', {
      name: 'Finalizar',
    });
    await user.click(finalizeButtons[0]!);
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          init?.method === 'DELETE' && requestUrl(input).includes('/members/'),
      ),
    ).toBe(false);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'permanecerá en el historial',
    );
    await user.click(
      screen.getByRole('button', { name: 'Finalizar membresía' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            init?.method === 'DELETE' &&
            requestUrl(input).includes('/members/'),
        ),
      ).toBe(true),
    );
  });
});

function renderApplication() {
  render(
    <RootApplication authClient={createClient()} environment={environment} />,
  );
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

function mockApi(
  role: 'ADMINISTRATOR' | 'VIEWER',
  options: {
    capacityConflict?: boolean;
    duplicateName?: boolean;
    membershipConflict?: boolean;
  } = {},
) {
  let candidateAdded = false;
  let activeRemoved = false;
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
      return Response.json({
        createdAt: '2026-08-12T12:00:00.000Z',
        displayName: 'Test User',
        emailSnapshot: 'user@example.test',
        id: '11111111-1111-4111-8111-111111111111',
        keycloakUserId: 'user-sub',
        status: 'ACTIVE',
        updatedAt: '2026-08-12T12:00:00.000Z',
      });
    if (url.pathname === `/api/v1/teams/${teamId}`) {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      return Response.json({
        ...team,
        members: [
          ...(activeRemoved ? [] : [activeMember]),
          historicalMember,
          ...(candidateAdded
            ? [
                {
                  competitor: candidateCompetitor,
                  id: '99999999-9999-4999-8999-999999999999',
                  joinedAt: '2026-08-19T12:00:00.000Z',
                  leftAt: null,
                },
              ]
            : []),
        ],
      });
    }
    if (
      url.pathname ===
      `/api/v1/teams/${teamId}/members/${candidateCompetitor.id}`
    ) {
      if (options.capacityConflict)
        return conflict(
          `Team ${teamId} has reached its maximum of 10 active members`,
          url.pathname,
        );
      if (options.membershipConflict)
        return conflict(
          `Competitor ${candidateCompetitor.id} already belongs to an active team`,
          url.pathname,
        );
      candidateAdded = true;
      return Response.json({
        competitor: candidateCompetitor,
        id: '99999999-9999-4999-8999-999999999999',
        joinedAt: '2026-08-19T12:00:00.000Z',
        leftAt: null,
      });
    }
    if (
      url.pathname ===
        `/api/v1/teams/${teamId}/members/${activeCompetitor.id}` &&
      init?.method === 'DELETE'
    ) {
      activeRemoved = true;
      return new Response(null, { status: 204 });
    }
    if (url.pathname.endsWith('/competitors'))
      return Response.json(paginated([candidateCompetitor]));
    if (url.pathname.endsWith('/teams') && init?.method === 'POST') {
      if (options.duplicateName)
        return conflict(
          'Team name Night Riders is already in use',
          url.pathname,
        );
      return Response.json(team, { status: 201 });
    }
    if (url.pathname.endsWith('/teams')) return Response.json(paginated([]));
    return Response.json(paginated([]));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Nuevo equipo' });
  await user.type(screen.getByLabelText(/^Nombre/), team.name);
  await user.type(
    screen.getByLabelText(/^Persona responsable/),
    team.responsiblePerson,
  );
  await user.type(screen.getByLabelText('Descripción'), team.description);
}

function conflict(message: string, path: string) {
  return Response.json(
    {
      error: 'Conflict',
      message,
      path,
      statusCode: 409,
      timestamp: '2026-08-19T12:00:00.000Z',
    },
    { status: 409 },
  );
}

function competitor(id: string, name: string, nickname: string) {
  return {
    dateOfBirth: '2001-02-03',
    height: 174.5,
    id,
    name,
    nickname,
    origin: 'Medellín',
    registeredAt: '2026-08-12T12:00:00.000Z',
    status: 'ACTIVE',
    type: 'DWARF',
    updatedAt: '2026-08-12T12:00:00.000Z',
    weight: 68.25,
  };
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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
