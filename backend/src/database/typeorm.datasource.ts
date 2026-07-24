import 'reflect-metadata';
import { config as loadEnvironmentFile } from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment.validation';
import { createTypeOrmOptions } from './typeorm-options.factory';

loadEnvironmentFile({ quiet: true });

const environment = validateEnvironment(process.env);

export default new DataSource(createTypeOrmOptions(environment));
