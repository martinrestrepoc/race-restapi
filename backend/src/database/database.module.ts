import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  createTypeOrmOptions,
  type DatabaseEnvironment,
} from './typeorm-options.factory';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const environment: DatabaseEnvironment = {
          DATABASE_HOST: configService.getOrThrow<string>('DATABASE_HOST'),
          DATABASE_PORT: configService.getOrThrow<number>('DATABASE_PORT'),
          DATABASE_NAME: configService.getOrThrow<string>('DATABASE_NAME'),
          DATABASE_USERNAME:
            configService.getOrThrow<string>('DATABASE_USERNAME'),
          DATABASE_PASSWORD:
            configService.getOrThrow<string>('DATABASE_PASSWORD'),
          DATABASE_SSL: configService.getOrThrow<boolean>('DATABASE_SSL'),
        };

        return {
          ...createTypeOrmOptions(environment),
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
