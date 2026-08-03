import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competitor } from '../competitors/entities/competitor.entity';
import { Race } from '../races/entities/race.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { RaceRegistration } from './entities/race-registration.entity';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { ClockService } from '../common/time/clock.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AuditModule,
    TypeOrmModule.forFeature([
      RaceRegistration,
      Race,
      Competitor,
      Team,
      TeamMember,
    ]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, ClockService],
  exports: [RegistrationsService, TypeOrmModule],
})
export class RegistrationsModule {}
