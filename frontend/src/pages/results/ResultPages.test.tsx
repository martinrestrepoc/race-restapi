import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Race, RaceResult, Registration } from '@/api/domain.types';
import { RootApplication } from '@/app/RootApplication';
import type { AuthClient } from '@/auth/keycloak-client';
import { formatDuration, parseDuration } from './result-view';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakClientId: 'race-frontend',
  keycloakRealm: 'race-management',
  keycloakUrl: 'http://localhost:8080',
};
const raceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const registrationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const competitorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const resultId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const race: Race = {
  createdAt: '2026-08-12T12:00:00.000Z',
  description: null,
  distanceMeters: 5000,
  finishLocation: 'Meta',
  id: raceId,
  maxParticipants: 20,
  name: 'Final del desierto',
  organizerUserProfileId: null,
  registrationDeadline: '2026-08-20T12:00:00.000Z',
  scheduledAt: '2026-08-21T12:00:00.000Z',
  startLocation: 'Salida',
  status: 'IN_PROGRESS',
  type: 'INDIVIDUAL',
  updatedAt: '2026-08-21T12:00:00.000Z',
};
const registration: Registration = {
  competitorId,
  id: registrationId,
  participantName: 'Martin',
  performedByUserProfileId: null,
  raceId,
  registeredAt: '2026-08-19T12:00:00.000Z',
  startingPosition: 4,
  status: 'APPROVED',
  teamId: null,
  updatedAt: '2026-08-19T12:00:00.000Z',
  validationNotes: null,
};
const result: RaceResult = {
  finalPosition: 1,
  finalTimeMs: 523_350,
  id: resultId,
  notes: 'Resultado inicial',
  penaltyTimeMs: 1000,
  participantName: 'Martin',
  raceId,
  rawTimeMs: 522_350,
  recordedAt: '2026-08-21T13:00:00.000Z',
  recordedByUserProfileId: null,
  registrationId,
  startingPosition: 4,
  status: 'FINISHED',
  updatedAt: '2026-08-21T13:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('results vertical slice', () => {
  it('converts human duration input to safe integer milliseconds', () => {
    expect(parseDuration('08:42.350')).toBe(522_350);
    expect(parseDuration('120:05.009')).toBe(7_205_009);
    expect(parseDuration('08:62.350')).toBeNull();
    expect(parseDuration('08:42.35')).toBeNull();
    expect(formatDuration(522_350)).toBe('08:42.350');
    expect(formatDuration(null)).toBe('—');
  });

  it('lets viewers read results but exposes no mutation controls', async () => {
    window.history.replaceState(null, '', `/races/${raceId}/results`);
    mockApi({ results: [result], role: 'VIEWER' });
    renderApplication();

    expect(
      await screen.findByRole('heading', { name: 'Final del desierto' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('08:43.350').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Martin').length).toBeGreaterThan(0);
    expect(screen.queryByText(registrationId)).not.toBeInTheDocument();
    expect(screen.queryByText('Registrar resultado')).not.toBeInTheDocument();
    expect(screen.queryByText('Corregir')).not.toBeInTheDocument();
  });

  it('passes status and pagination from the URL to the list endpoint', async () => {
    window.history.replaceState(
      null,
      '',
      `/races/${raceId}/results?status=DISQUALIFIED&page=2&limit=10`,
    );
    const fetchMock = mockApi({ role: 'VIEWER' });
    renderApplication();

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes(`/races/${raceId}/results?`),
    );
    expect(call).toBeDefined();
    const url = new URL(requestUrl(call![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '10',
      page: '2',
      status: 'DISQUALIFIED',
    });
  });

  it('records a finished result without sending finalTimeMs', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/results`);
    const fetchMock = mockApi({ role: 'RACE_ORGANIZER' });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText(/Inscripción/),
      registrationId,
    );
    await user.type(screen.getByLabelText(/Posición final/), '1');
    await user.type(screen.getByLabelText(/Tiempo bruto/), '08:42.350');
    const penalty = screen.getByLabelText(/Penalización/);
    await user.clear(penalty);
    await user.type(penalty, '00:01.000');
    await user.type(screen.getByLabelText('Notas'), '  Llegada limpia  ');
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }));

    expect(
      await screen.findByText('El resultado fue registrado correctamente.'),
    ).toBeInTheDocument();
    const post = findCall(fetchMock, `/races/${raceId}/results`, 'POST');
    expect(jsonRequestBody(post?.[1]?.body)).toEqual({
      finalPosition: 1,
      notes: 'Llegada limpia',
      penaltyTimeMs: 1000,
      rawTimeMs: 522_350,
      registrationId,
      status: 'FINISHED',
    });
    expect(jsonRequestBody(post?.[1]?.body)).not.toHaveProperty('finalTimeMs');
  });

  it('omits time and position for a non-finished result', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/results`);
    const fetchMock = mockApi({ role: 'ADMINISTRATOR' });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText(/Inscripción/),
      registrationId,
    );
    await user.selectOptions(
      screen.getByLabelText(/Resultado/),
      'DID_NOT_START',
    );
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }));

    await waitFor(() =>
      expect(
        findCall(fetchMock, `/races/${raceId}/results`, 'POST'),
      ).toBeDefined(),
    );
    const post = findCall(fetchMock, `/races/${raceId}/results`, 'POST');
    expect(jsonRequestBody(post?.[1]?.body)).toEqual({
      penaltyTimeMs: 0,
      registrationId,
      status: 'DID_NOT_START',
    });
  });

  it('pages through approved registrations beyond the API limit', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/results`);
    const fetchMock = mockApi({
      registrationTotalPages: 2,
      role: 'RACE_ORGANIZER',
    });
    renderApplication();

    await screen.findByLabelText(/Inscripción/);
    await user.click(
      screen.getByRole('button', { name: 'Ir a la página siguiente' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = new URL(requestUrl(input), 'http://localhost');
          return (
            url.pathname.endsWith(`/races/${raceId}/registrations`) &&
            url.searchParams.get('page') === '2'
          );
        }),
      ).toBe(true),
    );
  });

  it('maps a winner conflict and preserves recoverable form input', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}/results`);
    mockApi({ createConflict: true, role: 'RACE_ORGANIZER' });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText(/Inscripción/),
      registrationId,
    );
    await user.type(screen.getByLabelText(/Posición final/), '1');
    await user.type(screen.getByLabelText(/Tiempo bruto/), '09:00.000');
    await user.click(screen.getByRole('button', { name: 'Guardar resultado' }));

    expect(
      await screen.findByText(
        'El ganador debe tener el menor tiempo final de la carrera.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Inscripción/)).toHaveValue(registrationId);
    expect(screen.getByLabelText(/Posición final/)).toHaveValue(1);
    expect(screen.getByLabelText(/Tiempo bruto/)).toHaveValue('09:00.000');
  });

  it('blocks viewers from the correction route', async () => {
    window.history.replaceState(null, '', `/results/${resultId}/edit`);
    mockApi({ results: [result], role: 'VIEWER' });
    renderApplication();

    expect(
      await screen.findByRole('heading', { name: 'Permisos insuficientes' }),
    ).toBeInTheDocument();
  });

  it('requires strong confirmation before correcting an official result', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/results/${resultId}/edit`);
    const fetchMock = mockApi({
      raceStatus: 'COMPLETED',
      results: [result],
      role: 'RACE_ORGANIZER',
    });
    renderApplication();

    expect(
      await screen.findByText('Corrección de resultado oficial'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Martin · salida 4/)).toBeInTheDocument();
    expect(screen.queryByText(registrationId)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Tiempo bruto/)).toHaveValue('08:42.350');
    await user.click(
      screen.getByRole('button', { name: 'Revisar corrección' }),
    );
    expect(findCall(fetchMock, `/results/${resultId}`, 'PUT')).toBeUndefined();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'alterará las clasificaciones derivadas',
    );
    await user.click(
      screen.getByRole('button', { name: 'Guardar corrección' }),
    );

    await waitFor(() =>
      expect(findCall(fetchMock, `/results/${resultId}`, 'PUT')).toBeDefined(),
    );
    const put = findCall(fetchMock, `/results/${resultId}`, 'PUT');
    const body = jsonRequestBody(put?.[1]?.body);
    expect(body).toMatchObject({
      finalPosition: 1,
      penaltyTimeMs: 1000,
      rawTimeMs: 522_350,
      status: 'FINISHED',
    });
    expect(body).not.toHaveProperty('registrationId');
    expect(body).not.toHaveProperty('finalTimeMs');
    expect(
      await screen.findByText(
        'La corrección fue guardada correctamente.',
      ),
    ).toBeInTheDocument();
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
  createConflict?: boolean;
  raceStatus?: Race['status'];
  registrationTotalPages?: number;
  results?: RaceResult[];
  role: 'ADMINISTRATOR' | 'RACE_ORGANIZER' | 'VIEWER';
}) {
  let results = options.results ?? [];
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
      return Response.json({
        ...race,
        status: options.raceStatus ?? race.status,
      });
    if (url.pathname === `/api/v1/results/${resultId}`) {
      if (init?.method === 'PUT') {
        const body = jsonRequestBody(init.body) as Record<string, unknown>;
        const updated = { ...result, ...body };
        results = [updated];
        return Response.json(updated);
      }
      return Response.json(result);
    }
    if (
      url.pathname === `/api/v1/races/${raceId}/results` &&
      init?.method === 'POST'
    ) {
      if (options.createConflict)
        return conflict(
          'The winner must have the lowest final time',
          url.pathname,
        );
      return Response.json(result, { status: 201 });
    }
    if (url.pathname === `/api/v1/races/${raceId}/results`)
      return Response.json(paginated(results, url));
    if (url.pathname === `/api/v1/races/${raceId}/registrations`)
      return Response.json({
        ...paginated([registration], url),
        totalPages: options.registrationTotalPages ?? 1,
      });
    return Response.json(paginated([], url));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
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
      timestamp: '2026-08-25T12:00:00.000Z',
    },
    { status: 409 },
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
