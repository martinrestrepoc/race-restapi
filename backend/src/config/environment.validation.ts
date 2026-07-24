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

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return {
    NODE_ENV: readNodeEnvironment(config),
    PORT: readInteger(config, 'PORT', 3000),
    DATABASE_HOST: readRequiredString(config, 'DATABASE_HOST'),
    DATABASE_PORT: readInteger(config, 'DATABASE_PORT', 5432),
    DATABASE_NAME: readRequiredString(config, 'DATABASE_NAME'),
    DATABASE_USERNAME: readRequiredString(config, 'DATABASE_USERNAME'),
    DATABASE_PASSWORD: readRequiredString(config, 'DATABASE_PASSWORD'),
    DATABASE_SSL: readBoolean(config, 'DATABASE_SSL', false),
  };
}
