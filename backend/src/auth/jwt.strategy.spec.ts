import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment.validation';
import { AppRole } from './enums/app-role.enum';
import { JwtStrategy } from './jwt.strategy';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

function createStrategy(): JwtStrategy {
  const values: Partial<EnvironmentVariables> = {
    KEYCLOAK_ISSUER: 'http://identity.test/realms/race-management',
    KEYCLOAK_JWKS_URI:
      'http://identity.test/realms/race-management/protocol/openid-connect/certs',
    KEYCLOAK_CLIENT_ID: 'race-backend',
    KEYCLOAK_AUDIENCE: 'race-backend',
  };
  const configService = {
    get: jest.fn((key: keyof EnvironmentVariables) => values[key]),
    getOrThrow: jest.fn((key: keyof EnvironmentVariables) => {
      const value = values[key];
      if (value === undefined) throw new Error(`Missing ${key}`);
      return value;
    }),
  } as unknown as ConfigService<EnvironmentVariables, true>;

  return new JwtStrategy(configService);
}

describe('JwtStrategy', () => {
  const strategy = createStrategy();

  it('maps only known roles from the configured API client', () => {
    const user = strategy.validate({
      sub: 'keycloak-subject',
      typ: 'Bearer',
      preferred_username: 'race-admin',
      email: 'race-admin@example.invalid',
      resource_access: {
        'race-backend': {
          roles: ['VIEWER', 'unknown-role', 'ADMINISTRATOR', 'VIEWER'],
        },
        'another-client': { roles: ['RACE_ORGANIZER'] },
      },
    });

    expect(user).toEqual({
      sub: 'keycloak-subject',
      username: 'race-admin',
      email: 'race-admin@example.invalid',
      roles: [AppRole.ADMINISTRATOR, AppRole.VIEWER],
    });
  });

  it('does not trust malformed role claims', () => {
    const user = strategy.validate({
      sub: 'keycloak-subject',
      typ: 'Bearer',
      resource_access: { 'race-backend': { roles: 'ADMINISTRATOR' } },
    });

    expect(user.roles).toEqual([]);
  });

  it.each([
    ['missing subject', { typ: 'Bearer' }],
    ['non-access token type', { sub: 'keycloak-subject', typ: 'ID' }],
  ])('rejects an invalid token payload: %s', (_caseName, payload) => {
    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });
});
