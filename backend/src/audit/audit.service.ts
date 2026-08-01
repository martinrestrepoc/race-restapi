import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RaceResult } from '../results/entities/race-result.entity';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  async recordResultCreated(
    manager: EntityManager,
    result: RaceResult,
  ): Promise<void> {
    await this.record(manager, 'RESULT_CREATED', result, null, result);
  }

  async recordResultCorrected(
    manager: EntityManager,
    previousResult: RaceResult,
    result: RaceResult,
  ): Promise<void> {
    await this.record(
      manager,
      'RESULT_CORRECTED',
      result,
      previousResult,
      result,
    );
  }

  private async record(
    manager: EntityManager,
    action: 'RESULT_CREATED' | 'RESULT_CORRECTED',
    result: RaceResult,
    previousResult: RaceResult | null,
    currentResult: RaceResult,
  ): Promise<void> {
    const repository = manager.getRepository(AuditLog);
    await repository.save(
      repository.create({
        actorUserProfileId: null,
        action,
        entityType: 'RACE_RESULT',
        entityId: result.id,
        description:
          action === 'RESULT_CREATED'
            ? 'Race result recorded'
            : 'Race result corrected',
        previousValues: previousResult
          ? this.resultSnapshot(previousResult)
          : null,
        newValues: this.resultSnapshot(currentResult),
      }),
    );
  }

  private resultSnapshot(result: RaceResult): Record<string, unknown> {
    return {
      raceId: result.raceId,
      registrationId: result.registrationId,
      startingPosition: result.startingPosition,
      finalPosition: result.finalPosition,
      rawTimeMs: result.rawTimeMs,
      penaltyTimeMs: result.penaltyTimeMs,
      finalTimeMs: result.finalTimeMs,
      status: result.status,
      notes: result.notes,
    };
  }
}
