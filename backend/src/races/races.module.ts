import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Race } from './entities/race.entity';
import { RacesController } from './races.controller';
import { RacesService } from './races.service';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { RaceResult } from '../results/entities/race-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Race, RaceRegistration, RaceResult])],
  controllers: [RacesController],
  providers: [RacesService],
  exports: [RacesService],
})
export class RacesModule {}
