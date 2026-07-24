import { join } from 'node:path';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';
import type { EnvironmentVariables } from '../config/environment.validation';

export function createTypeOrmOptions(
  environment: EnvironmentVariables,
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
