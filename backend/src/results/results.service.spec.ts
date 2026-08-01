import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { RaceStatus } from '../common/enums/race-status.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { ResultStatus } from '../common/enums/result-status.enum';
import { Race } from '../races/entities/race.entity';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { RaceResult } from './entities/race-result.entity';
import { ResultsService } from './results.service';

const raceId = '1315c17a-44fd-4da6-bffe-a9d85dfa794d';
const registrationId = '1d73dfe9-2291-49a9-8344-6128cbecf109';

describe('ResultsService', () => {
  const resultsRepository = {
    findOneBy: jest.fn(),
    existsBy: jest.fn(),
    findAndCount: jest.fn(),
  };
  const racesRepository = { existsBy: jest.fn() };
  const transaction = jest.fn();
  const service = new ResultsService(
    resultsRepository as unknown as Repository<RaceResult>,
    racesRepository as unknown as Repository<Race>,
    { transaction } as unknown as DataSource,
  );

  beforeEach(() => jest.clearAllMocks());

  function configureTransaction(
    race: Race,
    registration: RaceRegistration,
    overrides: Partial<Record<'exists' | 'find', jest.Mock>> = {},
  ): jest.Mocked<
    Pick<
      Repository<RaceResult>,
      'create' | 'merge' | 'save' | 'exists' | 'find'
    >
  > {
    const transactionalResults = {
      create: jest.fn((value: RaceResult) => value),
      merge: jest.fn((target: RaceResult, value: Partial<RaceResult>) =>
        Object.assign(target, value),
      ),
      save: jest.fn((value: RaceResult) => Promise.resolve(value)),
      exists: overrides.exists ?? jest.fn().mockResolvedValue(false),
      find: overrides.find ?? jest.fn().mockResolvedValue([]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Race)
          return { findOne: jest.fn().mockResolvedValue(race) };
        if (entity === RaceRegistration) {
          return { findOneBy: jest.fn().mockResolvedValue(registration) };
        }
        return transactionalResults;
      }),
    } as unknown as EntityManager;
    transaction.mockImplementation(
      async (callback: (entityManager: EntityManager) => Promise<RaceResult>) =>
        callback(manager),
    );
    return transactionalResults;
  }

  it('calculates final time for a finished participant', async () => {
    const race = { id: raceId, status: RaceStatus.IN_PROGRESS } as Race;
    const registration = {
      id: registrationId,
      raceId,
      status: RegistrationStatus.APPROVED,
      startingPosition: 3,
    } as RaceRegistration;
    configureTransaction(race, registration);
    const dto: CreateResultDto = {
      registrationId,
      status: ResultStatus.FINISHED,
      finalPosition: 1,
      rawTimeMs: 75000,
      penaltyTimeMs: 2500,
    };

    const result = await service.create(raceId, dto);

    expect(result.finalTimeMs).toBe(77500);
    expect(result.startingPosition).toBe(3);
  });

  it('rejects times and final position for a non-finished result', async () => {
    await expect(
      service.create(raceId, {
        registrationId,
        status: ResultStatus.DISQUALIFIED,
        finalPosition: 1,
        rawTimeMs: 1000,
        penaltyTimeMs: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a result for a non-approved registration', async () => {
    configureTransaction(
      { id: raceId, status: RaceStatus.IN_PROGRESS } as Race,
      {
        id: registrationId,
        raceId,
        status: RegistrationStatus.PENDING,
        startingPosition: null,
      } as RaceRegistration,
    );

    await expect(
      service.create(raceId, {
        registrationId,
        status: ResultStatus.DID_NOT_START,
        penaltyTimeMs: 0,
      }),
    ).rejects.toThrow('Only an approved registration');
  });

  it('rejects a winner whose final time is not the lowest', async () => {
    const existingWinner = {
      finalPosition: 2,
      finalTimeMs: 50000,
    } as RaceResult;
    configureTransaction(
      { id: raceId, status: RaceStatus.IN_PROGRESS } as Race,
      {
        id: registrationId,
        raceId,
        status: RegistrationStatus.APPROVED,
        startingPosition: 1,
      } as RaceRegistration,
      { find: jest.fn().mockResolvedValue([existingWinner]) },
    );

    await expect(
      service.create(raceId, {
        registrationId,
        status: ResultStatus.FINISHED,
        finalPosition: 1,
        rawTimeMs: 60000,
        penaltyTimeMs: 0,
      }),
    ).rejects.toThrow('winner must have the lowest final time');
  });
});
