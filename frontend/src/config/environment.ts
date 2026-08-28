export interface PublicEnvironment {
  apiBaseUrl: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const REQUIRED_VARIABLES = [
  'VITE_API_BASE_URL',
  'VITE_KEYCLOAK_URL',
  'VITE_KEYCLOAK_REALM',
  'VITE_KEYCLOAK_CLIENT_ID',
] as const;

function requiredValue(source: EnvironmentSource, name: string): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable pública requerida ${name}.`);
  }

  return value;
}

function parseAbsoluteHttpUrl(value: string, name: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} debe ser una URL absoluta válida.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} debe usar el protocolo http o https.`);
  }

  return parsed.toString().replace(/\/$/, '');
}

function parseApiBaseUrl(value: string): string {
  if (value.startsWith('/')) {
    return value.replace(/\/$/, '');
  }

  return parseAbsoluteHttpUrl(value, 'VITE_API_BASE_URL');
}

export function parsePublicEnvironment(
  source: EnvironmentSource,
): PublicEnvironment {
  for (const name of REQUIRED_VARIABLES) {
    requiredValue(source, name);
  }

  return {
    apiBaseUrl: parseApiBaseUrl(requiredValue(source, 'VITE_API_BASE_URL')),
    keycloakUrl: parseAbsoluteHttpUrl(
      requiredValue(source, 'VITE_KEYCLOAK_URL'),
      'VITE_KEYCLOAK_URL',
    ),
    keycloakRealm: requiredValue(source, 'VITE_KEYCLOAK_REALM'),
    keycloakClientId: requiredValue(source, 'VITE_KEYCLOAK_CLIENT_ID'),
  };
}

export function loadPublicEnvironment(): PublicEnvironment {
  return parsePublicEnvironment(import.meta.env);
}
