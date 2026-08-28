import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ApiError, ApiNetworkError, ApiResponseError } from './api-errors';
import { createApiClient } from './api-client';
import type { PaginatedResponse, Race } from './domain.types';

const baseUrl = 'http://api.test/api/v1';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function createClient(
  overrides: {
    getAccessToken?: () => Promise<string>;
    onUnauthorized?: () => void;
  } = {},
) {
  return createApiClient({
    baseUrl,
    getAccessToken:
      overrides.getAccessToken ?? vi.fn().mockResolvedValue('fresh-token'),
    onUnauthorized: overrides.onUnauthorized,
  });
}

describe('ApiClient with MSW', () => {
  it('adds a fresh bearer token, serializes queries, and parses pagination', async () => {
    server.use(
      http.get(`${baseUrl}/races`, ({ request }) => {
        const url = new URL(request.url);
        expect(request.headers.get('authorization')).toBe('Bearer fresh-token');
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('search')).toBe('carrera nocturna');
        expect(url.searchParams.has('status')).toBe(false);
        return HttpResponse.json({
          items: [],
          limit: 20,
          page: 2,
          totalItems: 0,
          totalPages: 0,
        });
      }),
    );

    const result = await createClient().get<PaginatedResponse<Race>>('races', {
      query: { page: 2, search: 'carrera nocturna', status: undefined },
    });

    expect(result).toEqual({
      items: [],
      limit: 20,
      page: 2,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('returns undefined for a successful 204 response', async () => {
    server.use(
      http.delete(
        `${baseUrl}/competitors/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(
      createClient().delete('competitors/competitor-id'),
    ).resolves.toBeUndefined();
  });

  it('maps validation details to field errors', async () => {
    server.use(
      http.post(`${baseUrl}/competitors`, () =>
        HttpResponse.json(
          {
            details: [
              { field: 'weight', message: 'weight must be positive' },
              {
                field: 'weight',
                message: 'weight must have at most 2 decimals',
              },
            ],
            error: 'Bad Request',
            message: 'Request validation failed',
            path: '/api/v1/competitors',
            statusCode: 400,
            timestamp: '2026-08-18T12:00:00.000Z',
          },
          { status: 400 },
        ),
      ),
    );

    const error = await createClient()
      .post('competitors', { weight: -1 })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      fieldErrors: {
        weight: [
          'weight must be positive',
          'weight must have at most 2 decimals',
        ],
      },
      message: 'Request validation failed',
      status: 400,
    });
  });

  it.each([
    [403, 'No tienes permiso'],
    [404, 'Race not found'],
    [409, 'Nickname already exists'],
  ])(
    'preserves a safe API rejection for status %i',
    async (status, message) => {
      server.use(
        http.get(`${baseUrl}/races`, () =>
          HttpResponse.json(
            {
              error: status === 403 ? 'Forbidden' : 'Conflict',
              message,
              path: '/api/v1/races',
              statusCode: status,
              timestamp: '2026-08-18T12:00:00.000Z',
            },
            { status },
          ),
        ),
      );

      await expect(createClient().get('races')).rejects.toMatchObject({
        message,
        status,
      });
    },
  );

  it('clears the application session after a 401 response', async () => {
    const onUnauthorized = vi.fn();
    server.use(
      http.get(
        `${baseUrl}/users`,
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(
      createClient({ onUnauthorized }).get('users'),
    ).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('replaces unsafe server messages with generic feedback', async () => {
    server.use(
      http.get(`${baseUrl}/races`, () =>
        HttpResponse.json(
          {
            error: 'Internal Server Error',
            message: 'sensitive database implementation detail',
            path: '/api/v1/races',
            statusCode: 500,
            timestamp: '2026-08-18T12:00:00.000Z',
          },
          { status: 500 },
        ),
      ),
    );

    await expect(createClient().get('races')).rejects.toMatchObject({
      message:
        'El servicio no pudo completar la solicitud. Intenta nuevamente.',
      status: 500,
    });
  });

  it('distinguishes connectivity failure from an API rejection', async () => {
    server.use(http.get(`${baseUrl}/races`, () => HttpResponse.error()));
    await expect(createClient().get('races')).rejects.toBeInstanceOf(
      ApiNetworkError,
    );
  });

  it('rejects malformed successful JSON responses', async () => {
    server.use(
      http.get(
        `${baseUrl}/races`,
        () =>
          new HttpResponse('not-json', {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    await expect(createClient().get('races')).rejects.toBeInstanceOf(
      ApiResponseError,
    );
  });

  it('deduplicates concurrent token refresh requests', async () => {
    let resolveToken: ((token: string) => void) | undefined;
    const getAccessToken = vi.fn(
      () => new Promise<string>((resolve) => (resolveToken = resolve)),
    );
    server.use(
      http.get(`${baseUrl}/races`, () => HttpResponse.json({ ok: true })),
    );
    const client = createClient({ getAccessToken });

    const first = client.get('races');
    const second = client.get('races');
    expect(getAccessToken).toHaveBeenCalledOnce();
    resolveToken?.('shared-token');

    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
  });

  it('preserves request cancellation instead of reporting a network failure', async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            );
            return;
          }
          init?.signal?.addEventListener('abort', () =>
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            ),
          );
        }),
    );
    const client = createApiClient({
      baseUrl,
      fetch: request,
      getAccessToken: vi.fn().mockResolvedValue('fresh-token'),
    });

    const pending = client.get('races', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
