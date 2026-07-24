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
    });
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
});
