import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competitor } from './entities/competitor.entity';
import { CompetitorsController } from './competitors.controller';
import { CompetitorsService } from './competitors.service';
import { TeamMember } from '../teams/entities/team-member.entity';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AuditModule,
    TypeOrmModule.forFeature([Competitor, TeamMember, RaceRegistration]),
  ],
  controllers: [CompetitorsController],
  providers: [CompetitorsService],
  exports: [CompetitorsService],
})
export class CompetitorsModule {}
