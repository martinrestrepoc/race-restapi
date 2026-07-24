import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

interface ExceptionPayload {
  error?: unknown;
  message?: unknown;
  details?: unknown;
}

function isExceptionPayload(value: unknown): value is ExceptionPayload {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const payload = isExceptionPayload(exceptionResponse)
      ? exceptionResponse
      : undefined;

    if (!isHttpException) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error('Unhandled request error', stack);
    }

    const body: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      statusCode,
      error:
        typeof payload?.error === 'string'
          ? payload.error
          : (STATUS_CODES[statusCode] ?? 'Error'),
      message: this.resolveMessage(
        payload?.message ?? exceptionResponse,
        statusCode,
      ),
      path: request.originalUrl ?? request.url,
    };

    if (Array.isArray(payload?.details)) {
      body.details = payload.details;
    }

    response.status(statusCode).json(body);
  }

  private resolveMessage(value: unknown, statusCode: number): string {
    if (statusCode === 500) {
      return 'An unexpected error occurred';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .join(', ');
    }

    return STATUS_CODES[statusCode] ?? 'Request failed';
  }
}
