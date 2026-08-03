import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Race } from './entities/race.entity';
import { RacesController } from './races.controller';
import { RacesService } from './races.service';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { RaceResult } from '../results/entities/race-result.entity';
import { ClockService } from '../common/time/clock.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AuditModule,
    TypeOrmModule.forFeature([Race, RaceRegistration, RaceResult]),
  ],
  controllers: [RacesController],
  providers: [RacesService, ClockService],
  exports: [RacesService],
})
export class RacesModule {}
