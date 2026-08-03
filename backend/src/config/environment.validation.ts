export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface EnvironmentVariables extends Record<string, unknown> {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: boolean;
  TEAM_MAX_MEMBERS: number;
  KEYCLOAK_BASE_URL: string;
  KEYCLOAK_REALM: string;
  KEYCLOAK_ISSUER: string;
  KEYCLOAK_JWKS_URI: string;
  KEYCLOAK_CLIENT_ID: string;
  KEYCLOAK_AUDIENCE: string | undefined;
}

function readRequiredString(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value.trim();
}

function readInteger(
  config: Record<string, unknown>,
  key: string,
  defaultValue: number,
): number {
  const rawValue = config[key] ?? defaultValue;
  let value = Number.NaN;

  if (typeof rawValue === 'number') {
    value = rawValue;
  } else if (typeof rawValue === 'string') {
    value = Number.parseInt(rawValue, 10);
  }

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(
      `Environment variable ${key} must be an integer between 1 and 65535`,
    );
  }

  return value;
}

function readBoolean(
  config: Record<string, unknown>,
  key: string,
  defaultValue: boolean,
): boolean {
  const rawValue = config[key] ?? defaultValue;

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${key} must be true or false`);
}

function readPositiveInteger(
  config: Record<string, unknown>,
  key: string,
  defaultValue: number,
  maximum: number,
): number {
  const rawValue = config[key] ?? defaultValue;
  const value =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string'
        ? Number(rawValue)
        : Number.NaN;

  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(
      `Environment variable ${key} must be an integer between 1 and ${maximum}`,
    );
  }

  return value;
}

function readNodeEnvironment(config: Record<string, unknown>): NodeEnvironment {
  const value = config.NODE_ENV ?? 'development';

  if (
    typeof value !== 'string' ||
    !NODE_ENVIRONMENTS.includes(value as NodeEnvironment)
  ) {
    throw new Error(
      `Environment variable NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}`,
    );
  }

  return value as NodeEnvironment;
}

function readRequiredUrl(config: Record<string, unknown>, key: string): string {
  const value = readRequiredString(config, key);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL`);
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      `Environment variable ${key} must be an HTTP(S) URL without credentials, query, or fragment`,
    );
  }

  return url.toString().replace(/\/$/, '');
}

function readOptionalString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return readRequiredString(config, key);
}

function readKeycloakRealm(config: Record<string, unknown>): string {
  const realm = readRequiredString(config, 'KEYCLOAK_REALM');

  if (!/^[A-Za-z0-9._-]+$/.test(realm)) {
    throw new Error(
      'Environment variable KEYCLOAK_REALM may contain only letters, numbers, dots, underscores, and hyphens',
    );
  }

  return realm;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const keycloakBaseUrl = readRequiredUrl(config, 'KEYCLOAK_BASE_URL');
  const keycloakRealm = readKeycloakRealm(config);
  const expectedIssuer = `${keycloakBaseUrl}/realms/${keycloakRealm}`;
  const keycloakIssuer = readRequiredUrl(config, 'KEYCLOAK_ISSUER');

  if (keycloakIssuer !== expectedIssuer) {
    throw new Error(
      `Environment variable KEYCLOAK_ISSUER must equal ${expectedIssuer}`,
    );
  }

  const keycloakJwksUri = readRequiredUrl(config, 'KEYCLOAK_JWKS_URI');

  return {
    NODE_ENV: readNodeEnvironment(config),
    PORT: readInteger(config, 'PORT', 3000),
    DATABASE_HOST: readRequiredString(config, 'DATABASE_HOST'),
    DATABASE_PORT: readInteger(config, 'DATABASE_PORT', 5432),
    DATABASE_NAME: readRequiredString(config, 'DATABASE_NAME'),
    DATABASE_USERNAME: readRequiredString(config, 'DATABASE_USERNAME'),
    DATABASE_PASSWORD: readRequiredString(config, 'DATABASE_PASSWORD'),
    DATABASE_SSL: readBoolean(config, 'DATABASE_SSL', false),
    TEAM_MAX_MEMBERS: readPositiveInteger(config, 'TEAM_MAX_MEMBERS', 10, 100),
    KEYCLOAK_BASE_URL: keycloakBaseUrl,
    KEYCLOAK_REALM: keycloakRealm,
    KEYCLOAK_ISSUER: keycloakIssuer,
    KEYCLOAK_JWKS_URI: keycloakJwksUri,
    KEYCLOAK_CLIENT_ID: readRequiredString(config, 'KEYCLOAK_CLIENT_ID'),
    KEYCLOAK_AUDIENCE: readOptionalString(config, 'KEYCLOAK_AUDIENCE'),
  };
}
