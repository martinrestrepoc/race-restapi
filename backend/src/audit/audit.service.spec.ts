import type { EntityManager, Repository } from 'typeorm';
import { ResultStatus } from '../common/enums/result-status.enum';
import { RaceResult } from '../results/entities/race-result.entity';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { NotFoundException } from '@nestjs/common';

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

  it('filters and paginates audit entries deterministically', async () => {
    const entry = {
      id: '7b560000-0000-4000-8000-000000000001',
      occurredAt: new Date('2026-08-03T12:00:00.000Z'),
    } as AuditLog;
    const queryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[entry], 21]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new AuditService(
      repository as unknown as Repository<AuditLog>,
    );
    const actorUserProfileId = 'd9385ef6-f41a-420a-a773-8bd18fbfbf10';
    const entityId = '7b560000-0000-4000-8000-000000000001';

    const result = await service.findAll({
      page: 2,
      limit: 10,
      action: ' result_corrected ',
      entityType: ' race_result ',
      actorUserProfileId,
      entityId,
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-04T00:00:00.000Z',
    });

    expect(result).toEqual({
      items: [entry],
      page: 2,
      limit: 10,
      totalItems: 21,
      totalPages: 3,
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(6);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'auditLog.action = :action',
      { action: 'RESULT_CORRECTED' },
    );
  });

  it('returns audit detail and maps an unknown identifier to not found', async () => {
    const entry = {
      id: '7b560000-0000-4000-8000-000000000001',
    } as AuditLog;
    const repository = { findOneBy: jest.fn().mockResolvedValueOnce(entry) };
    const service = new AuditService(
      repository as unknown as Repository<AuditLog>,
    );

    await expect(service.findOne(entry.id)).resolves.toBe(entry);
    repository.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findOne(crypto.randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('records previous and corrected result snapshots', async () => {
    const repository = {
      create: jest.fn((value: AuditLog) => value),
      save: jest.fn((value: AuditLog) => Promise.resolve(value)),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as EntityManager;
    const previous = {
      id: '7b560000-0000-4000-8000-000000000001',
      raceId: crypto.randomUUID(),
      registrationId: crypto.randomUUID(),
      startingPosition: 1,
      finalPosition: 2,
      rawTimeMs: 80_000,
      penaltyTimeMs: 0,
      finalTimeMs: 80_000,
      status: ResultStatus.FINISHED,
      notes: null,
    } as RaceResult;
    const corrected = { ...previous, rawTimeMs: 79_000, finalTimeMs: 79_000 };

    await new AuditService().recordResultCorrected(
      manager,
      previous,
      corrected,
      'd9385ef6-f41a-420a-a773-8bd18fbfbf10',
    );

    const createdEntry = repository.create.mock.calls[0][0];
    expect(createdEntry.action).toBe('RESULT_CORRECTED');
    expect(createdEntry.previousValues).toMatchObject({ finalTimeMs: 80_000 });
    expect(createdEntry.newValues).toMatchObject({ finalTimeMs: 79_000 });
  });
});
