import type { EntityManager, Repository } from 'typeorm';
import { ResultStatus } from '../common/enums/result-status.enum';
import { RaceResult } from '../results/entities/race-result.entity';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  it('records the authenticated profile as result audit actor', async () => {
    const repository = {
      create: jest.fn((value: AuditLog) => value),
      save: jest.fn((value: AuditLog) => Promise.resolve(value)),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as EntityManager;
    const result = {
      id: '7b560000-0000-4000-8000-000000000001',
      raceId: '1315c17a-44fd-4da6-bffe-a9d85dfa794d',
      registrationId: '1d73dfe9-2291-49a9-8344-6128cbecf109',
      startingPosition: 1,
      finalPosition: 1,
      rawTimeMs: 75000,
      penaltyTimeMs: 0,
      finalTimeMs: 75000,
      status: ResultStatus.FINISHED,
      notes: null,
    } as RaceResult;
    const actorUserProfileId = 'd9385ef6-f41a-420a-a773-8bd18fbfbf10';

    await new AuditService().recordResultCreated(
      manager,
      result,
      actorUserProfileId,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserProfileId,
        action: 'RESULT_CREATED',
        entityId: result.id,
      }),
    );
  });

  it('removes secret-like fields from generic audit snapshots', async () => {
    const repository = {
      create: jest.fn((value: AuditLog) => value),
      save: jest.fn((value: AuditLog) => Promise.resolve(value)),
    };
    const service = new AuditService(
      repository as unknown as Repository<AuditLog>,
    );

    await service.recordEvent({
      actorUserProfileId: 'd9385ef6-f41a-420a-a773-8bd18fbfbf10',
      action: 'SAFE_EVENT',
      entityType: 'USER_PROFILE',
      entityId: '7b560000-0000-4000-8000-000000000001',
      newValues: {
        displayName: 'race-admin',
        accessToken: 'must-not-be-stored',
        clientSecret: 'must-not-be-stored',
      },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        newValues: { displayName: 'race-admin' },
      }),
    );
  });
});
