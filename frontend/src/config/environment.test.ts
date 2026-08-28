import { describe, expect, it } from 'vitest';

import { parsePublicEnvironment } from './environment';

const validEnvironment = {
  VITE_API_BASE_URL: '/api/v1',
  VITE_KEYCLOAK_URL: 'http://localhost:8080',
  VITE_KEYCLOAK_REALM: 'race-management',
  VITE_KEYCLOAK_CLIENT_ID: 'race-frontend',
};

describe('parsePublicEnvironment', () => {
  it('parses the documented public configuration', () => {
    expect(parsePublicEnvironment(validEnvironment)).toEqual({
      apiBaseUrl: '/api/v1',
      keycloakUrl: 'http://localhost:8080',
      keycloakRealm: 'race-management',
      keycloakClientId: 'race-frontend',
    });
  });

  it('rejects a missing required value with an understandable message', () => {
    expect(() =>
      parsePublicEnvironment({
        ...validEnvironment,
        VITE_KEYCLOAK_REALM: ' ',
      }),
    ).toThrow('Falta la variable pública requerida VITE_KEYCLOAK_REALM.');
  });

  it('rejects non-http Keycloak URLs', () => {
    expect(() =>
      parsePublicEnvironment({
        ...validEnvironment,
        VITE_KEYCLOAK_URL: 'file:///tmp/keycloak',
      }),
    ).toThrow('VITE_KEYCLOAK_URL debe usar el protocolo http o https.');
  });
});
