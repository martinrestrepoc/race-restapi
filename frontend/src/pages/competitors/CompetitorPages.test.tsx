import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RootApplication } from '@/app/RootApplication';
import type { AuthClient } from '@/auth/keycloak-client';
import { competitorFormSchema } from './CompetitorFormPage';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakClientId: 'race-frontend',
  keycloakRealm: 'race-management',
  keycloakUrl: 'http://localhost:8080',
};

const competitor = {
  dateOfBirth: '2001-02-03',
  height: 174.5,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Ayla Stonefoot',
  nickname: 'GraniteDash',
  origin: 'Medellín',
  registeredAt: '2026-08-12T12:00:00.000Z',
  status: 'ACTIVE',
  type: 'DWARF',
  updatedAt: '2026-08-12T12:00:00.000Z',
  weight: 68.25,
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('competitor vertical slice', () => {
  it('matches strict date and two-decimal measurement validation', () => {
    const validInput = {
      dateOfBirth: '2001-02-03',
      height: 132.29,
      name: 'Ayla Stonefoot',
      nickname: 'GraniteDash',
      origin: 'Medellín',
      status: 'ACTIVE',
      type: 'DWARF',
      weight: 68.29,
    };

    expect(competitorFormSchema.safeParse(validInput).success).toBe(true);
    expect(
      competitorFormSchema.safeParse({
        ...validInput,
        dateOfBirth: '2001-02-30',
      }).success,
    ).toBe(false);
    expect(
      competitorFormSchema.safeParse({ ...validInput, weight: 68.291 }).success,
    ).toBe(false);
  });

  it('keeps API-supported filters in the URL and renders an empty response', async () => {
    window.history.replaceState(
      null,
      '',
      '/competitors?status=ACTIVE&type=DWARF&sortBy=name&sortOrder=asc&page=2&limit=10',
    );
    const fetchMock = mockApi('VIEWER');

    renderApplication();

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByText('Nuevo competidor')).not.toBeInTheDocument();
    const listCall = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('/competitors?'),
    );
    expect(listCall).toBeDefined();
    const url = new URL(requestUrl(listCall![0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      limit: '10',
      page: '2',
      sortBy: 'name',
      sortOrder: 'asc',
      status: 'ACTIVE',
      type: 'DWARF',
    });
  });

  it('blocks a viewer from the creation route', async () => {
    window.history.replaceState(null, '', '/competitors/new');
    mockApi('VIEWER');
    renderApplication();

    expect(
      await screen.findByRole('heading', { name: 'Permisos insuficientes' }),
    ).toBeInTheDocument();
  });

  it('validates fields and maps a duplicate nickname conflict', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/competitors/new');
    mockApi('ADMINISTRATOR', { duplicateNickname: true });
    renderApplication();

    await user.click(
      await screen.findByRole('button', { name: 'Guardar competidor' }),
    );
    expect(
      await screen.findByText('El nombre es obligatorio.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('El peso debe ser mayor que cero.'),
    ).toBeInTheDocument();

    await fillValidForm(user);
    await user.click(
      screen.getByRole('button', { name: 'Guardar competidor' }),
    );

    expect(
      await screen.findByText('Este apodo ya está en uso.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('already in use');
  });

  it('creates a valid competitor and opens its detail', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/competitors/new');
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication();

    await fillValidForm(user);
    await user.click(
      screen.getByRole('button', { name: 'Guardar competidor' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Ayla Stonefoot' }),
    ).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(post).toBeDefined();
    const requestBody = post?.[1]?.body;
    expect(typeof requestBody).toBe('string');
    if (typeof requestBody !== 'string') throw new Error('Missing JSON body');
    expect(JSON.parse(requestBody)).toMatchObject({
      dateOfBirth: '2001-02-03',
      height: 174.5,
      name: 'Ayla Stonefoot',
      nickname: 'GraniteDash',
      origin: 'Medellín',
      status: 'ACTIVE',
      type: 'DWARF',
      weight: 68.25,
    });
  });

  it('requires confirmation before calling DELETE', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', `/competitors/${competitor.id}`);
    const fetchMock = mockApi('ADMINISTRATOR');
    renderApplication();

    await user.click(
      await screen.findByRole('button', { name: 'Eliminar o retirar' }),
    );
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'El backend decidirá si',
    );

    await user.click(
      screen.getByRole('button', { name: 'Confirmar operación' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
      ).toBe(true),
    );
    expect(
      await screen.findByRole('heading', { name: 'Competidores' }),
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

function mockApi(
  role: 'ADMINISTRATOR' | 'VIEWER',
  options: { duplicateNickname?: boolean } = {},
) {
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
    if (url.pathname === `/api/v1/competitors/${competitor.id}`) {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      return Response.json(competitor);
    }
    if (url.pathname.endsWith('/competitors') && init?.method === 'POST') {
      if (options.duplicateNickname)
        return Response.json(
          {
            error: 'Conflict',
            message: 'Competitor nickname GraniteDash is already in use',
            path: '/api/v1/competitors',
            statusCode: 409,
            timestamp: '2026-08-18T12:00:00.000Z',
          },
          { status: 409 },
        );
      return Response.json(competitor, { status: 201 });
    }
    if (url.pathname.endsWith('/competitors'))
      return Response.json(paginated([]));
    return Response.json(paginated([]));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Nuevo competidor' });
  await user.type(screen.getByLabelText(/^Nombre/), competitor.name);
  await user.type(screen.getByLabelText(/^Apodo/), competitor.nickname);
  await user.type(
    screen.getByLabelText(/^Fecha de nacimiento/),
    competitor.dateOfBirth,
  );
  await user.type(screen.getByLabelText(/^Origen/), competitor.origin);
  await user.clear(screen.getByLabelText(/^Peso/));
  await user.type(screen.getByLabelText(/^Peso/), String(competitor.weight));
  await user.clear(screen.getByLabelText(/^Altura/));
  await user.type(screen.getByLabelText(/^Altura/), String(competitor.height));
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
