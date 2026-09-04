import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Registration, Race } from '@/api/domain.types';
import { RootApplication } from '@/app/RootApplication';
import type { AuthClient } from '@/auth/keycloak-client';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakClientId: 'race-frontend',
  keycloakRealm: 'race-management',
  keycloakUrl: 'http://localhost:8080',
};
const raceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const registrationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const competitorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const teamId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const race: Race = {
  createdAt: '2026-08-12T12:00:00.000Z',
  description: null,
  distanceMeters: 5000,
  finishLocation: 'Meta',
  id: raceId,
  maxParticipants: 20,
  name: 'Carrera de prueba',
  organizerUserProfileId: null,
  registrationDeadline: '2035-08-20T12:00:00.000Z',
  scheduledAt: '2035-08-21T12:00:00.000Z',
  startLocation: 'Salida',
  status: 'OPEN_FOR_REGISTRATION',
  type: 'INDIVIDUAL',
  updatedAt: '2026-08-12T12:00:00.000Z',
};
const registration: Registration = {
  competitorId,
  id: registrationId,
  participantName: 'Competidor activo',
  performedByUserProfileId: null,
  raceId,
  registeredAt: '2026-08-19T12:00:00.000Z',
  startingPosition: null,
  status: 'PENDING',
  teamId: null,
  updatedAt: '2026-08-19T12:00:00.000Z',
  validationNotes: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('registrations vertical slice', () => {
  it('blocks viewers from the registration route', async () => {
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    mockApi({ role: 'VIEWER' });
    renderApplication();

    expect(
      await screen.findByRole('heading', { name: 'Permisos insuficientes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Inscripciones/ }),
    ).not.toBeInTheDocument();
  });

  it('passes status and pagination from the URL to the race list endpoint', async () => {
    window.history.replaceState(
      null,
      '',
      `/races/${raceId}/registrations?status=PENDING&page=2&limit=10`,
    );
    const fetchMock = mockApi({ role: 'RACE_ORGANIZER' });
    renderApplication();

    expect(await screen.findByText('Sin inscripciones')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes(`/races/${raceId}/registrations?`),
    );
    expect(call).toBeDefined();
    const url = new URL(requestUrl(call![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '10',
      page: '2',
      status: 'PENDING',
    });
  });

  it('registers exactly one compatible competitor', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    const fetchMock = mockApi({ role: 'RACE_ORGANIZER' });
    renderApplication();

    await user.click(
      await screen.findByRole('combobox', {
        name: /Buscar competidor activo/,
      }),
    );
    await user.click(
      await screen.findByRole('option', { name: 'Competidor activo' }),
    );
    expect(
      screen.getByRole('button', { name: 'Inscribir participante' }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole('button', { name: 'Inscribir participante' }),
    );
    expect(
      await screen.findByText('La solicitud de inscripción quedó pendiente.'),
    ).toBeInTheDocument();

    const post = fetchMock.mock.calls.find(
      ([input, init]) =>
        requestUrl(input).endsWith(`/races/${raceId}/registrations`) &&
        init?.method === 'POST',
    );
    expect(post).toBeDefined();
    expect(jsonRequestBody(post![1]?.body)).toEqual({ competitorId });
  });

  it('preserves the selected participant when the backend rejects a duplicate', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    mockApi({ createConflict: true, role: 'RACE_ORGANIZER' });
    renderApplication();

    const search = await screen.findByRole('combobox', {
      name: /Buscar competidor activo/,
    });
    expect(search.closest('section')).toHaveClass('overflow-visible');
    await user.click(search);
    await user.click(
      await screen.findByRole('option', { name: 'Competidor activo' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Inscribir participante' }),
    );

    expect(
      await screen.findByText(
        'El participante ya está inscrito en esta carrera.',
      ),
    ).toBeInTheDocument();
    expect(search).toHaveValue('Competidor activo');
  });

  it('approves only with a positive integer and preserves it on conflict', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    const fetchMock = mockApi({
      approveConflict: true,
      registrations: [registration],
      role: 'RACE_ORGANIZER',
    });
    renderApplication();

    expect(
      (await screen.findAllByText('Competidor activo')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(competitorId)).not.toBeInTheDocument();
    await user.click(
      (await screen.findAllByRole('button', { name: 'Aprobar' }))[0]!,
    );
    const position = screen.getByLabelText(/Posición de salida/);
    await user.type(position, '3');
    await user.click(
      screen.getByRole('button', { name: 'Confirmar aprobación' }),
    );

    expect(
      await screen.findByText(
        'La posición de salida ya está asignada en esta carrera.',
      ),
    ).toBeInTheDocument();
    expect(position).toHaveValue(3);
    const patch = fetchMock.mock.calls.find(
      ([input, init]) =>
        requestUrl(input).endsWith(
          `/registrations/${registrationId}/approve`,
        ) && init?.method === 'PATCH',
    );
    expect(jsonRequestBody(patch?.[1]?.body)).toEqual({
      startingPosition: 3,
    });
  });

  it('rejects with a required trimmed reason and confirms cancellation', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    const fetchMock = mockApi({
      registrations: [registration],
      role: 'ADMINISTRATOR',
    });
    renderApplication();

    await user.click(
      (await screen.findAllByRole('button', { name: 'Rechazar' }))[0]!,
    );
    const rejectButton = screen.getByRole('button', {
      name: 'Confirmar rechazo',
    });
    expect(rejectButton).toBeDisabled();
    await user.type(screen.getByLabelText(/Motivo/), '  No cumple  ');
    await user.click(rejectButton);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            requestUrl(input).endsWith(
              `/registrations/${registrationId}/reject`,
            ) && init?.method === 'PATCH',
        ),
      ).toBe(true),
    );
    const reject = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).endsWith(`/registrations/${registrationId}/reject`),
    );
    expect(jsonRequestBody(reject?.[1]?.body)).toEqual({
      reason: 'No cumple',
    });

    const cancelButtons = await screen.findAllByRole('button', {
      name: 'Cancelar inscripción de Competidor activo',
    });
    await user.click(cancelButtons[0]!);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false);
    await user.click(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            requestUrl(input).endsWith(`/registrations/${registrationId}`) &&
            init?.method === 'DELETE',
        ),
      ).toBe(true),
    );
  });

  it('sends only teamId when a mixed race selects a team', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    const fetchMock = mockApi({ raceType: 'MIXED', role: 'RACE_ORGANIZER' });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText('Tipo de participante'),
      'team',
    );
    await user.click(
      screen.getByRole('combobox', { name: /Buscar equipo activo/ }),
    );
    await user.click(
      await screen.findByRole('option', { name: 'Equipo activo' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Inscribir participante' }),
    );
    const post = await waitFor(() => {
      const found = fetchMock.mock.calls.find(
        ([input, init]) =>
          requestUrl(input).endsWith(`/races/${raceId}/registrations`) &&
          init?.method === 'POST',
      );
      expect(found).toBeDefined();
      return found;
    });
    expect(jsonRequestBody(post?.[1]?.body)).toEqual({ teamId });
  });

  it('opens all active participants on focus and filters while typing', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    const fetchMock = mockApi({ role: 'RACE_ORGANIZER' });
    renderApplication();

    const search = await screen.findByRole('combobox', {
      name: /Buscar competidor activo/,
    });
    await user.click(search);
    expect(
      await screen.findByRole('option', { name: 'Competidor activo' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Participante')).not.toBeInTheDocument();

    await user.type(search, 'Rápido');
    await waitFor(() => {
      const filteredCall = fetchMock.mock.calls.find(([input]) => {
        const url = new URL(requestUrl(input), 'http://localhost');
        return (
          url.pathname.endsWith('/competitors') &&
          url.searchParams.get('search') === 'Rápido'
        );
      });
      expect(filteredCall).toBeDefined();
    });
  });

  it('keeps a mouse option press from blurring the combobox before selection', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/registrations`);
    mockApi({ role: 'RACE_ORGANIZER' });
    renderApplication();

    const search = await screen.findByRole('combobox', {
      name: /Buscar competidor activo/,
    });
    await user.click(search);
    const option = await screen.findByRole('option', {
      name: 'Competidor activo',
    });

    expect(fireEvent.mouseDown(option)).toBe(false);
    fireEvent.click(option);

    expect(search).toHaveValue('Competidor activo');
    expect(
      screen.getByRole('button', { name: 'Inscribir participante' }),
    ).toBeEnabled();
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

function mockApi(options: {
  approveConflict?: boolean;
  createConflict?: boolean;
  raceType?: Race['type'];
  registrations?: Registration[];
  role: 'ADMINISTRATOR' | 'RACE_ORGANIZER' | 'VIEWER';
}) {
  const items = options.registrations ?? [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    await Promise.resolve();
    const url = new URL(requestUrl(input), 'http://localhost');
    if (url.pathname.endsWith('/auth/me'))
      return Response.json({
        email: 'user@example.test',
        roles: [options.role],
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
    if (url.pathname === `/api/v1/races/${raceId}`)
      return Response.json({ ...race, type: options.raceType ?? race.type });
    if (
      url.pathname === `/api/v1/races/${raceId}/registrations` &&
      init?.method === 'POST'
    ) {
      if (options.createConflict)
        return conflict(
          'Participant is already registered in this race',
          url.pathname,
        );
      return Response.json(registration, { status: 201 });
    }
    if (url.pathname === `/api/v1/races/${raceId}/registrations`)
      return Response.json(paginated(items, url));
    if (url.pathname === `/api/v1/registrations/${registrationId}/approve`) {
      if (options.approveConflict)
        return conflict(
          'Starting position 3 is already assigned',
          url.pathname,
        );
      return Response.json({
        ...registration,
        startingPosition: 3,
        status: 'APPROVED',
      });
    }
    if (url.pathname === `/api/v1/registrations/${registrationId}/reject`)
      return Response.json({
        ...registration,
        status: 'REJECTED',
        validationNotes: 'No cumple',
      });
    if (
      url.pathname === `/api/v1/registrations/${registrationId}` &&
      init?.method === 'DELETE'
    )
      return new Response(null, { status: 204 });
    if (url.pathname.endsWith('/competitors'))
      return Response.json(
        paginated(
          [
            {
              dateOfBirth: '2000-01-01',
              height: 150,
              id: competitorId,
              name: 'Competidor activo',
              nickname: 'Rápido',
              origin: 'EIA',
              registeredAt: '2026-08-12T12:00:00.000Z',
              status: 'ACTIVE',
              type: 'DWARF',
              updatedAt: '2026-08-12T12:00:00.000Z',
              weight: 50,
            },
          ],
          url,
        ),
      );
    if (url.pathname.endsWith('/teams'))
      return Response.json(
        paginated(
          [
            {
              createdAt: '2026-08-12T12:00:00.000Z',
              description: null,
              id: teamId,
              name: 'Equipo activo',
              responsiblePerson: 'Responsable',
              status: 'ACTIVE',
              updatedAt: '2026-08-12T12:00:00.000Z',
            },
          ],
          url,
        ),
      );
    return Response.json(paginated([], url));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function paginated(items: unknown[], url: URL) {
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const page = Number(url.searchParams.get('page') ?? 1);
  return {
    items,
    limit,
    page,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
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

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function jsonRequestBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') throw new Error('Missing JSON request body');
  return JSON.parse(body) as unknown;
}
