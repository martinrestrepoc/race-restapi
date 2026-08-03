import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { RaceStatus } from '../common/enums/race-status.enum';
import { RaceType } from '../common/enums/race-type.enum';
import { Race } from './entities/race.entity';
import { RacesService } from './races.service';
import { AuditService } from '../audit/audit.service';

describe('RacesService', () => {
  const actorUserProfileId = 'd9385ef6-f41a-420a-a773-8bd18fbfbf10';
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };
  const registrationsRepository = {
    count: jest.fn(),
    exists: jest.fn(),
  };
  const resultsRepository = { count: jest.fn() };
  const clock = {
    now: jest.fn(() => new Date('2026-08-03T12:00:00.000Z')),
  };
  const auditService = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  const service = new RacesService(
    repository as unknown as Repository<Race>,
    registrationsRepository as unknown as Repository<never>,
    resultsRepository as unknown as Repository<never>,
    clock,
    auditService as unknown as AuditService,
  );
  const dto = {
    name: 'Gran carrera EIA',
    description: 'Fecha inaugural',
    scheduledAt: '2099-08-20T15:00:00.000Z',
    startLocation: 'Bloque A',
    finishLocation: 'Bloque B',
    distanceMeters: 1500,
    maxParticipants: 10,
    type: RaceType.MIXED,
    registrationDeadline: '2099-08-19T15:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    registrationsRepository.exists.mockResolvedValue(false);
  });

  it('creates a draft race with normalized dates', async () => {
    repository.create.mockImplementation((value: Race) => value);
    repository.save.mockImplementation((value: Race) => value);

    const result = await service.create(dto, actorUserProfileId);

    expect(result.status).toBe(RaceStatus.DRAFT);
    expect(result.scheduledAt).toBeInstanceOf(Date);
    expect(result.organizerUserProfileId).toBe(actorUserProfileId);
    expect(auditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserProfileId,
        action: 'RACE_CREATED',
      }),
    );
  });

  it('rejects a race scheduled in the past', async () => {
    await expect(
      service.create(
        { ...dto, scheduledAt: '2020-08-20T15:00:00.000Z' },
        actorUserProfileId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a deadline that is not earlier than the start', async () => {
    await expect(
      service.create(
        {
          ...dto,
          registrationDeadline: '2099-08-21T15:00:00.000Z',
        },
        actorUserProfileId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a documented status transition', async () => {
    const race = {
      id: 'race-id',
      status: RaceStatus.DRAFT,
      scheduledAt: new Date(dto.scheduledAt),
      registrationDeadline: new Date(dto.registrationDeadline),
    } as Race;
    repository.findOneBy.mockResolvedValue(race);
    repository.save.mockImplementation((value: Race) => value);

    const result = await service.updateStatus(
      race.id,
      RaceStatus.OPEN_FOR_REGISTRATION,
      actorUserProfileId,
    );

    expect(result.status).toBe(RaceStatus.OPEN_FOR_REGISTRATION);
  });

  it('rejects a transition from a terminal status', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 'race-id',
      status: RaceStatus.COMPLETED,
    });

    await expect(
      service.updateStatus('race-id', RaceStatus.DRAFT, actorUserProfileId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows full edits only while the race is a draft', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 'race-id',
      status: RaceStatus.OPEN_FOR_REGISTRATION,
    });

    await expect(
      service.update('race-id', dto, actorUserProfileId),
    ).rejects.toThrow('cannot be edited');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('requires two approved registrations before starting', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 'race-id',
      status: RaceStatus.CLOSED,
    });
    registrationsRepository.count.mockResolvedValue(1);

    await expect(
      service.updateStatus(
        'race-id',
        RaceStatus.IN_PROGRESS,
        actorUserProfileId,
      ),
    ).rejects.toThrow('at least two approved participants');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('requires a result for every approved participant before completion', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 'race-id',
      status: RaceStatus.IN_PROGRESS,
    });
    registrationsRepository.count.mockResolvedValue(2);
    resultsRepository.count.mockResolvedValue(1);

    await expect(
      service.updateStatus('race-id', RaceStatus.COMPLETED, actorUserProfileId),
    ).rejects.toThrow('Every approved participant requires a result');
  });

  it('physically removes a draft race', async () => {
    const race = { id: 'race-id', status: RaceStatus.DRAFT } as Race;
    repository.findOneBy.mockResolvedValue(race);

    await service.remove(race.id, actorUserProfileId);

    expect(repository.remove).toHaveBeenCalledWith(race);
  });

  it('cancels a non-draft active race instead of removing it', async () => {
    const race = {
      id: 'race-id',
      status: RaceStatus.OPEN_FOR_REGISTRATION,
    } as Race;
    repository.findOneBy.mockResolvedValue(race);
    repository.save.mockImplementation((value: Race) => value);

    await service.remove(race.id, actorUserProfileId);

    expect(race.status).toBe(RaceStatus.CANCELLED);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
