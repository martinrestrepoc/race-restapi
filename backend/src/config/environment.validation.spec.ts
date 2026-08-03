import { validateEnvironment } from './environment.validation';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'race_test',
  DATABASE_USERNAME: 'race_test',
  DATABASE_PASSWORD: 'test-only-password',
  DATABASE_SSL: 'false',
  KEYCLOAK_BASE_URL: 'http://localhost:8080',
  KEYCLOAK_REALM: 'race-management',
  KEYCLOAK_ISSUER: 'http://localhost:8080/realms/race-management',
  KEYCLOAK_JWKS_URI:
    'http://localhost:8080/realms/race-management/protocol/openid-connect/certs',
  KEYCLOAK_CLIENT_ID: 'race-backend',
  KEYCLOAK_AUDIENCE: 'race-backend',
};

describe('validateEnvironment', () => {
  it('parses and returns typed environment values', () => {
    expect(validateEnvironment(validEnvironment)).toEqual({
      NODE_ENV: 'test',
      PORT: 3001,
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'race_test',
      DATABASE_USERNAME: 'race_test',
      DATABASE_PASSWORD: 'test-only-password',
      DATABASE_SSL: false,
      TEAM_MAX_MEMBERS: 10,
      KEYCLOAK_BASE_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'race-management',
      KEYCLOAK_ISSUER: 'http://localhost:8080/realms/race-management',
      KEYCLOAK_JWKS_URI:
        'http://localhost:8080/realms/race-management/protocol/openid-connect/certs',
      KEYCLOAK_CLIENT_ID: 'race-backend',
      KEYCLOAK_AUDIENCE: 'race-backend',
    });
  });

  it('validates the configured team membership limit', () => {
    expect(
      validateEnvironment({ ...validEnvironment, TEAM_MAX_MEMBERS: '25' })
        .TEAM_MAX_MEMBERS,
    ).toBe(25);

    expect(() =>
      validateEnvironment({ ...validEnvironment, TEAM_MAX_MEMBERS: '0' }),
    ).toThrow(
      'Environment variable TEAM_MAX_MEMBERS must be an integer between 1 and 100',
    );
  });

  it('rejects missing required database values', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_PASSWORD: undefined,
      }),
    ).toThrow('Environment variable DATABASE_PASSWORD is required');
  });

  it('rejects invalid ports without exposing other environment values', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_PORT: 'invalid' }),
    ).toThrow(
      'Environment variable DATABASE_PORT must be an integer between 1 and 65535',
    );
  });

  it('requires the issuer to match the configured realm', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        KEYCLOAK_ISSUER: 'http://localhost:8080/realms/other-realm',
      }),
    ).toThrow(
      'Environment variable KEYCLOAK_ISSUER must equal http://localhost:8080/realms/race-management',
    );
  });

  it('validates the JWKS URI independently for container networking', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        KEYCLOAK_JWKS_URI:
          'http://keycloak:8080/realms/race-management/protocol/openid-connect/certs',
      }).KEYCLOAK_JWKS_URI,
    ).toBe(
      'http://keycloak:8080/realms/race-management/protocol/openid-connect/certs',
    );

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        KEYCLOAK_JWKS_URI: 'not-a-url',
      }),
    ).toThrow('Environment variable KEYCLOAK_JWKS_URI must be a valid URL');
  });

  it('allows audience validation to be disabled explicitly', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        KEYCLOAK_AUDIENCE: '',
      }).KEYCLOAK_AUDIENCE,
    ).toBeUndefined();
  });
});
