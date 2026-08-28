import { describe, expect, it } from 'vitest';

import { ApiError, ApiNetworkError } from '@/api/api-errors';

import { shouldRetryQuery } from './query-client';

describe('shouldRetryQuery', () => {
  it('retries network and server errors no more than twice', () => {
    expect(shouldRetryQuery(0, new ApiNetworkError())).toBe(true);
    expect(shouldRetryQuery(1, apiError(500))).toBe(true);
    expect(shouldRetryQuery(2, apiError(500))).toBe(false);
  });

  it('does not retry client or authorization errors', () => {
    expect(shouldRetryQuery(0, apiError(400))).toBe(false);
    expect(shouldRetryQuery(0, apiError(401))).toBe(false);
    expect(shouldRetryQuery(0, apiError(409))).toBe(false);
  });
});

function apiError(status: number): ApiError {
  return new ApiError({
    error: 'Error',
    message: 'Request failed',
    path: '/api/v1/test',
    statusCode: status,
    timestamp: '2026-08-18T12:00:00.000Z',
  });
}
