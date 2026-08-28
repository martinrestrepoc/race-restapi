import {
  ApiError,
  ApiNetworkError,
  ApiResponseError,
  type ApiErrorEnvelope,
  type ApiValidationDetail,
} from './api-errors';
import { serializeQuery, type QueryParameters } from './query-string';

type RequestBody = BodyInit | object;

export interface ApiRequestOptions {
  authenticated?: boolean | undefined;
  body?: RequestBody | undefined;
  headers?: HeadersInit | undefined;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  query?: QueryParameters | undefined;
  signal?: AbortSignal | undefined;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch | undefined;
  getAccessToken: () => Promise<string>;
  onUnauthorized?: (() => Promise<void> | void) | undefined;
}

export interface ApiClient {
  delete: <T = void>(
    path: string,
    options?: Omit<ApiRequestOptions, 'method'>,
  ) => Promise<T>;
  get: <T>(
    path: string,
    options?: Omit<ApiRequestOptions, 'method'>,
  ) => Promise<T>;
  patch: <T>(
    path: string,
    body?: RequestBody,
    options?: Omit<ApiRequestOptions, 'body' | 'method'>,
  ) => Promise<T>;
  post: <T>(
    path: string,
    body?: RequestBody,
    options?: Omit<ApiRequestOptions, 'body' | 'method'>,
  ) => Promise<T>;
  put: <T>(
    path: string,
    body?: RequestBody,
    options?: Omit<ApiRequestOptions, 'body' | 'method'>,
  ) => Promise<T>;
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const requestImplementation = options.fetch ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  let activeTokenRequest: Promise<string> | undefined;

  async function getToken(): Promise<string> {
    if (!activeTokenRequest) {
      const current = options.getAccessToken();
      activeTokenRequest = current;
      const clearCurrentRequest = () => {
        if (activeTokenRequest === current) activeTokenRequest = undefined;
      };
      void current.then(clearCurrentRequest, clearCurrentRequest);
    }
    return activeTokenRequest;
  }

  async function request<T>(
    path: string,
    requestOptions: ApiRequestOptions = {},
  ): Promise<T> {
    const {
      authenticated = true,
      body,
      headers: suppliedHeaders,
      method = 'GET',
      query,
      signal,
    } = requestOptions;
    const headers = new Headers(suppliedHeaders);
    headers.set('Accept', 'application/json');

    if (authenticated) {
      headers.set('Authorization', `Bearer ${await getToken()}`);
    }

    const serializedBody = serializeBody(body, headers);
    let response: Response;
    try {
      response = await requestImplementation(
        `${baseUrl}/${path.replace(/^\//, '')}${serializeQuery(query)}`,
        {
          cache: 'no-store',
          headers,
          method,
          ...(serializedBody === undefined ? {} : { body: serializedBody }),
          ...(signal === undefined ? {} : { signal }),
        },
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError')
        throw error;
      throw new ApiNetworkError();
    }

    if (!response.ok) {
      if (response.status === 401) await options.onUnauthorized?.();
      throw await parseApiError(response);
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiResponseError();
    }
  }

  return {
    delete: (path, requestOptions) =>
      request(path, { ...requestOptions, method: 'DELETE' }),
    get: (path, requestOptions) => request(path, requestOptions),
    patch: (path, body, requestOptions) =>
      request(path, { ...requestOptions, body, method: 'PATCH' }),
    post: (path, body, requestOptions) =>
      request(path, { ...requestOptions, body, method: 'POST' }),
    put: (path, body, requestOptions) =>
      request(path, { ...requestOptions, body, method: 'PUT' }),
    request,
  };
}

function serializeBody(
  body: RequestBody | undefined,
  headers: Headers,
): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
}

async function parseApiError(response: Response): Promise<ApiError> {
  const fallback: ApiErrorEnvelope = {
    error: response.statusText || 'Error',
    message: defaultStatusMessage(response.status),
    path: '',
    statusCode: response.status,
    timestamp: new Date().toISOString(),
  };

  try {
    const value: unknown = await response.json();
    if (!isObject(value)) return new ApiError(fallback);
    return new ApiError({
      ...fallback,
      ...(typeof value.error === 'string' ? { error: value.error } : {}),
      ...(typeof value.message === 'string' ? { message: value.message } : {}),
      ...(typeof value.path === 'string' ? { path: value.path } : {}),
      ...(typeof value.timestamp === 'string'
        ? { timestamp: value.timestamp }
        : {}),
      details: parseValidationDetails(value.details),
    });
  } catch {
    return new ApiError(fallback);
  }
}

function parseValidationDetails(value: unknown): ApiValidationDetail[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (detail): detail is ApiValidationDetail =>
      isObject(detail) &&
      typeof detail.field === 'string' &&
      typeof detail.message === 'string',
  );
}

function defaultStatusMessage(status: number): string {
  if (status === 401) return 'La sesión ya no es válida.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'El recurso solicitado no existe.';
  if (status === 409)
    return 'La operación entra en conflicto con el estado actual.';
  return status >= 500
    ? 'El servicio no pudo completar la solicitud.'
    : 'La solicitud no pudo completarse.';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
