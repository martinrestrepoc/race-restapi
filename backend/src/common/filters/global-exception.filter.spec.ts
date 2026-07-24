import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  it('returns the documented error envelope for HTTP exceptions', () => {
    const now = new Date('2026-07-24T15:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          originalUrl: '/api/v1/competitors/missing',
        }),
        getResponse: () => ({ status, json }),
      }),
    } as unknown as ArgumentsHost;

    new GlobalExceptionFilter().catch(
      new NotFoundException('Competitor was not found'),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      timestamp: now.toISOString(),
      statusCode: 404,
      error: 'Not Found',
      message: 'Competitor was not found',
      path: '/api/v1/competitors/missing',
    });
    jest.useRealTimers();
  });
});
