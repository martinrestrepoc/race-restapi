import { RegistrationStatus } from '../../common/enums/registration-status.enum';
import { RaceRegistration } from '../entities/race-registration.entity';

export class RegistrationResponseDto {
  id: string;
  raceId: string;
  competitorId: string | null;
  teamId: string | null;
  status: RegistrationStatus;
  startingPosition: number | null;
  validationNotes: string | null;
  performedByUserProfileId: string | null;
  registeredAt: string;
  updatedAt: string;

  static fromEntity(registration: RaceRegistration): RegistrationResponseDto {
    return {
      id: registration.id,
      raceId: registration.raceId,
      competitorId: registration.competitorId,
      teamId: registration.teamId,
      status: registration.status,
      startingPosition: registration.startingPosition,
      validationNotes: registration.validationNotes,
      performedByUserProfileId: registration.performedByUserProfileId,
      registeredAt: registration.registeredAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    };
  }
}
