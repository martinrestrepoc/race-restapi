import { ResultStatus } from '../../common/enums/result-status.enum';
import { RaceResult } from '../entities/race-result.entity';

export class ResultResponseDto {
  id: string;
  raceId: string;
  registrationId: string;
  startingPosition: number;
  finalPosition: number | null;
  rawTimeMs: number | null;
  penaltyTimeMs: number;
  finalTimeMs: number | null;
  status: ResultStatus;
  notes: string | null;
  recordedByUserProfileId: string | null;
  recordedAt: string;
  updatedAt: string;

  static fromEntity(result: RaceResult): ResultResponseDto {
    return {
      id: result.id,
      raceId: result.raceId,
      registrationId: result.registrationId,
      startingPosition: result.startingPosition,
      finalPosition: result.finalPosition,
      rawTimeMs: result.rawTimeMs,
      penaltyTimeMs: result.penaltyTimeMs,
      finalTimeMs: result.finalTimeMs,
      status: result.status,
      notes: result.notes,
      recordedByUserProfileId: result.recordedByUserProfileId,
      recordedAt: result.recordedAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
}
