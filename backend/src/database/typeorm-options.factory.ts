import { join } from 'node:path';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';
import type { EnvironmentVariables } from '../config/environment.validation';

export type DatabaseEnvironment = Pick<
  EnvironmentVariables,
  | 'DATABASE_HOST'
  | 'DATABASE_PORT'
  | 'DATABASE_NAME'
  | 'DATABASE_USERNAME'
  | 'DATABASE_PASSWORD'
  | 'DATABASE_SSL'
>;

export function createTypeOrmOptions(
  environment: DatabaseEnvironment,
): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    database: environment.DATABASE_NAME,
    username: environment.DATABASE_USERNAME,
    password: environment.DATABASE_PASSWORD,
    ssl: environment.DATABASE_SSL,
    synchronize: false,
    migrationsRun: false,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    logging: false,
  };
}
