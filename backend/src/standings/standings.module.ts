import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class StandingsModule {}
