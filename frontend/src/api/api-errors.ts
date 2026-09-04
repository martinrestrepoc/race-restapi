export interface ApiValidationDetail {
  field: string;
  message: string;
}

export interface ApiErrorEnvelope {
  details?: ApiValidationDetail[];
  error: string;
  message: string;
  path: string;
  statusCode: number;
  timestamp: string;
}

export class ApiError extends Error {
  readonly details: ApiValidationDetail[];
  readonly error: string;
  readonly fieldErrors: Readonly<Record<string, string[]>>;
  readonly path: string;
  readonly status: number;
  readonly timestamp: string;

  constructor(envelope: ApiErrorEnvelope) {
    super(safeMessage(envelope));
    this.name = 'ApiError';
    this.status = envelope.statusCode;
    this.error = envelope.error;
    this.path = envelope.path;
    this.timestamp = envelope.timestamp;
    this.details = envelope.details ?? [];
    this.fieldErrors = groupFieldErrors(this.details);
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super(
      'No fue posible completar la operación. Revisa tu conexión e intenta nuevamente.',
    );
    this.name = 'ApiNetworkError';
  }
}

export class ApiResponseError extends Error {
  constructor() {
    super(
      'No fue posible procesar la información recibida. Intenta nuevamente.',
    );
    this.name = 'ApiResponseError';
  }
}

function safeMessage(envelope: ApiErrorEnvelope): string {
  if (envelope.statusCode >= 500) {
    return 'No fue posible completar la solicitud. Intenta nuevamente.';
  }

  return envelope.message;
}

function groupFieldErrors(
  details: ApiValidationDetail[],
): Readonly<Record<string, string[]>> {
  const fields: Record<string, string[]> = {};
  for (const detail of details) {
    (fields[detail.field] ??= []).push(detail.message);
  }
  return fields;
}
