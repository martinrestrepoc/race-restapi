import { RaceStatus } from '../../common/enums/race-status.enum';
import { RaceType } from '../../common/enums/race-type.enum';
import { Race } from '../entities/race.entity';

export class RaceResponseDto {
  id: string;
  name: string;
  description: string | null;
  scheduledAt: string;
  startLocation: string;
  finishLocation: string;
  distanceMeters: number;
  maxParticipants: number;
  type: RaceType;
  status: RaceStatus;
  organizerUserProfileId: string | null;
  registrationDeadline: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(race: Race): RaceResponseDto {
    return {
      id: race.id,
      name: race.name,
      description: race.description,
      scheduledAt: race.scheduledAt.toISOString(),
      startLocation: race.startLocation,
      finishLocation: race.finishLocation,
      distanceMeters: race.distanceMeters,
      maxParticipants: race.maxParticipants,
      type: race.type,
      status: race.status,
      organizerUserProfileId: race.organizerUserProfileId,
      registrationDeadline: race.registrationDeadline.toISOString(),
      createdAt: race.createdAt.toISOString(),
      updatedAt: race.updatedAt.toISOString(),
    };
  }
}
