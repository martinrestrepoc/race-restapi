import type { EnvironmentVariables } from '../config/environment.validation';
import { createTypeOrmOptions } from './typeorm-options.factory';

const environment: EnvironmentVariables = {
  NODE_ENV: 'test',
  PORT: 3000,
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'race_test',
  DATABASE_USERNAME: 'race_test',
  DATABASE_PASSWORD: 'test-only-password',
  DATABASE_SSL: false,
};

describe('createTypeOrmOptions', () => {
  it('uses PostgreSQL and requires migrations for schema changes', () => {
    const options = createTypeOrmOptions(environment);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'race_test',
      username: 'race_test',
      password: 'test-only-password',
      ssl: false,
      synchronize: false,
      migrationsRun: false,
      migrationsTableName: 'typeorm_migrations',
    });
  });
});
