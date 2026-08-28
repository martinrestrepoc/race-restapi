import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RootApplication } from '@/app/RootApplication';
import type { RaceStatus } from '@/api/domain.types';
import type { AuthClient } from '@/auth/keycloak-client';
import { localDateTimeToIso, toLocalDateTimeInput } from './race-view';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakClientId: 'race-frontend',
  keycloakRealm: 'race-management',
  keycloakUrl: 'http://localhost:8080',
};
const raceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const futureStart = '2035-10-12T14:00';
const futureDeadline = '2035-10-10T14:00';
const race = {
  createdAt: '2026-08-12T12:00:00.000Z',
  description: 'Desafío de montaña',
  distanceMeters: 5000.25,
  finishLocation: 'Meta norte',
  id: raceId,
  maxParticipants: 20,
  name: 'Reto de montaña',
  organizerUserProfileId: '11111111-1111-4111-8111-111111111111',
  registrationDeadline: localDateTimeToIso(futureDeadline),
  scheduledAt: localDateTimeToIso(futureStart),
  startLocation: 'Plaza central',
  status: 'DRAFT',
  type: 'INDIVIDUAL',
  updatedAt: '2026-08-12T12:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('races vertical slice', () => {
  it('round-trips API UTC date-times through the browser local input', () => {
    const iso = localDateTimeToIso(futureStart);
    expect(iso.endsWith('Z')).toBe(true);
    expect(toLocalDateTimeInput(iso)).toBe(futureStart);
  });

  it('keeps supported filters in the URL and gives viewers a read-only list', async () => {
    window.history.replaceState(
      null,
      '',
      '/races?status=DRAFT&type=INDIVIDUAL&sortBy=name&sortOrder=desc&page=2&limit=10',
    );
    const fetchMock = mockApi('VIEWER');
    renderApplication();

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByText('Nueva carrera')).not.toBeInTheDocument();
    const listCall = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('/races?'),
    );
    expect(listCall).toBeDefined();
    const url = new URL(requestUrl(listCall![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      limit: '10',
      page: '2',
      sortBy: 'name',
      sortOrder: 'desc',
      status: 'DRAFT',
      type: 'INDIVIDUAL',
    });
  });

  it('keeps lifecycle actions hidden from viewers', async () => {
    window.history.replaceState(null, '', `/races/${raceId}`);
    mockApi('VIEWER');
    renderApplication();

    expect(
      await screen.findByRole('heading', { name: 'Reto de montaña' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acceso de consulta')).toBeInTheDocument();
    expect(screen.queryByText('Ciclo de vida')).not.toBeInTheDocument();
    expect(screen.queryByText('Inscripciones')).not.toBeInTheDocument();
    expect(screen.getByText('Resultados')).toBeInTheDocument();
  });

  it('validates past schedules and deadline ordering before creation', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/races/new');
    mockApi('RACE_ORGANIZER');
    renderApplication();

    await fillForm(user, '2020-10-12T14:00', '2020-10-13T14:00');
    await user.click(screen.getByRole('button', { name: 'Guardar carrera' }));
    expect(
      await screen.findByText(
        'El cierre debe ser anterior al inicio de la carrera.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Cierre de inscripciones/), {
      target: { value: '2020-10-10T14:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar carrera' }));
    expect(
      await screen.findByText('La fecha programada debe estar en el futuro.'),
    ).toBeInTheDocument();
  });

  it('lets an organizer create a race and sends UTC ISO values', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/races/new');
    const fetchMock = mockApi('RACE_ORGANIZER');
    renderApplication();

    await fillForm(user, futureStart, futureDeadline);
    await user.click(screen.getByRole('button', { name: 'Guardar carrera' }));
    expect(
      await screen.findByRole('heading', { name: 'Reto de montaña' }),
    ).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    const body = post?.[1]?.body;
    expect(typeof body).toBe('string');
    if (typeof body !== 'string') throw new Error('Missing JSON body');
    expect(JSON.parse(body)).toMatchObject({
      registrationDeadline: localDateTimeToIso(futureDeadline),
      scheduledAt: localDateTimeToIso(futureStart),
    });
    expect(JSON.parse(body)).not.toHaveProperty('status');
  });

  it('offers only documented transitions and sends an optional cancellation reason', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}`);
    const fetchMock = mockApi('RACE_ORGANIZER');
    renderApplication();

    const transition = await screen.findByLabelText('Siguiente estado');
    expect(withinOptions(transition)).toEqual([
      '',
      'OPEN_FOR_REGISTRATION',
      'CANCELLED',
    ]);
    await user.selectOptions(transition, 'CANCELLED');
    await user.type(screen.getByLabelText('Motivo opcional'), 'Lluvia intensa');
    await user.click(
      screen.getByRole('button', { name: 'Aplicar transición' }),
    );
    await user.click(screen.getByRole('button', { name: 'Cambiar estado' }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH'),
      ).toBe(true),
    );
    const patchCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    const body = patchCall?.[1]?.body;
    expect(typeof body).toBe('string');
    if (typeof body !== 'string') throw new Error('Missing JSON body');
    expect(JSON.parse(body)).toEqual({
      reason: 'Lluvia intensa',
      status: 'CANCELLED',
    });
  });

  it('surfaces the participant requirement when starting a closed race', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}`);
    mockApi('RACE_ORGANIZER', { startConflict: true, status: 'CLOSED' });
    renderApplication();

    await user.selectOptions(
      await screen.findByLabelText('Siguiente estado'),
      'IN_PROGRESS',
    );
    await user.click(
      screen.getByRole('button', { name: 'Aplicar transición' }),
    );
    await user.click(screen.getByRole('button', { name: 'Cambiar estado' }));
    expect(
      await screen.findByText(
        'Se necesitan al menos dos participantes aprobados para iniciar la carrera.',
      ),
    ).toBeInTheDocument();
  });

  it('does not allow direct editing or lifecycle actions for terminal races', async () => {
    window.history.replaceState(null, '', `/races/${raceId}/edit`);
    mockApi('RACE_ORGANIZER', { status: 'COMPLETED' });
    renderApplication();
    expect(
      await screen.findByText('Edición no disponible'),
    ).toBeInTheDocument();

    cleanup();
    window.history.replaceState(null, '', `/races/${raceId}`);
    renderApplication();
    expect(
      await screen.findByText(/es un estado terminal/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancelar carrera/ }),
    ).not.toBeInTheDocument();
  });

  it('requires confirmation before delete-or-cancel', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/races/${raceId}`);
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication();

    await user.click(
      await screen.findByRole('button', { name: 'Eliminar o cancelar' }),
    );
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'según su estado',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar operación' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
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
  role: 'ADMINISTRATOR' | 'RACE_ORGANIZER' | 'VIEWER',
  options: {
    startConflict?: boolean;
    status?: RaceStatus;
  } = {},
) {
  let currentStatus = options.status ?? race.status;
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
    if (
      url.pathname === `/api/v1/races/${raceId}/status` &&
      init?.method === 'PATCH'
    ) {
      if (typeof init.body !== 'string') throw new Error('Missing JSON body');
      const body = JSON.parse(init.body) as { status: typeof currentStatus };
      if (options.startConflict)
        return conflict(
          'A race requires at least two approved participants to start',
          url.pathname,
        );
      currentStatus = body.status;
      return Response.json({ ...race, status: currentStatus });
    }
    if (url.pathname === `/api/v1/races/${raceId}`) {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      return Response.json({ ...race, status: currentStatus });
    }
    if (url.pathname.endsWith('/races') && init?.method === 'POST')
      return Response.json(race, { status: 201 });
    if (url.pathname.endsWith('/races')) return Response.json(paginated([]));
    return Response.json(paginated([]));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  start: string,
  deadline: string,
) {
  await screen.findByRole('heading', { name: 'Nueva carrera' });
  await user.type(screen.getByLabelText(/^Nombre/), race.name);
  fireEvent.change(screen.getByLabelText(/^Inicio programado/), {
    target: { value: start },
  });
  fireEvent.change(screen.getByLabelText(/^Cierre de inscripciones/), {
    target: { value: deadline },
  });
  await user.type(
    screen.getByLabelText(/^Lugar de salida/),
    race.startLocation,
  );
  await user.type(
    screen.getByLabelText(/^Lugar de llegada/),
    race.finishLocation,
  );
  await user.clear(screen.getByLabelText(/^Distancia/));
  await user.type(
    screen.getByLabelText(/^Distancia/),
    String(race.distanceMeters),
  );
  await user.clear(screen.getByLabelText(/^Capacidad máxima/));
  await user.type(
    screen.getByLabelText(/^Capacidad máxima/),
    String(race.maxParticipants),
  );
  await user.type(screen.getByLabelText('Descripción'), race.description);
}

function withinOptions(element: HTMLElement) {
  return Array.from(element.querySelectorAll('option')).map(
    (option) => option.value,
  );
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

function paginated(items: unknown[]) {
  return {
    items,
    limit: 20,
    page: 1,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
