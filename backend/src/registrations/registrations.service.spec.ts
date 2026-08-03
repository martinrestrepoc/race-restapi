import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { RaceStatus } from '../common/enums/race-status.enum';
import { RaceType } from '../common/enums/race-type.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { TeamStatus } from '../common/enums/team-status.enum';
import { Competitor } from '../competitors/entities/competitor.entity';
import { Race } from '../races/entities/race.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { RaceRegistration } from './entities/race-registration.entity';
import { RegistrationsService } from './registrations.service';
import { AuditService } from '../audit/audit.service';

const raceId = '0cf30ed6-b43c-4cb5-a8de-420310d66353';
const competitorId = '9aa19b2c-dfc1-4360-8852-777fdd9cd497';
const actorUserProfileId = 'd9385ef6-f41a-420a-a773-8bd18fbfbf10';

function openRace(overrides: Partial<Race> = {}): Race {
  return {
    id: raceId,
    type: RaceType.INDIVIDUAL,
    status: RaceStatus.OPEN_FOR_REGISTRATION,
    registrationDeadline: new Date('2099-08-20T12:00:00.000Z'),
    maxParticipants: 4,
    ...overrides,
  } as Race;
}

describe('RegistrationsService', () => {
  const registrations = {
    create: jest.fn(),
    save: jest.fn(),
    exists: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
  };
  const races = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    existsBy: jest.fn(),
  };
  const competitors = { findOneBy: jest.fn() };
  const teams = { findOne: jest.fn() };
  const memberships = { find: jest.fn() };
  const transaction = jest.fn();
  const clock = {
    now: jest.fn(() => new Date('2026-08-03T12:00:00.000Z')),
  };
  const auditService = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  const service = new RegistrationsService(
    registrations as unknown as Repository<RaceRegistration>,
    races as unknown as Repository<Race>,
    { transaction } as unknown as DataSource,
    clock,
    auditService as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    registrations.exists.mockResolvedValue(false);
    memberships.find.mockResolvedValue([]);
    transaction.mockImplementation(
      async (
        callback: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => Promise<unknown>,
      ) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === RaceRegistration) return registrations;
            if (entity === Race) return races;
            if (entity === Competitor) return competitors;
            if (entity === Team) return teams;
            return memberships;
          },
        }),
    );
  });

  it('requires exactly one participant type', async () => {
    await expect(
      service.create(raceId, {}, actorUserProfileId),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        raceId,
        { competitorId, teamId: crypto.randomUUID() },
        actorUserProfileId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a pending registration for an eligible competitor', async () => {
    const race = openRace();
    const competitor = {
      id: competitorId,
      status: CompetitorStatus.ACTIVE,
    } as Competitor;
    races.findOne.mockResolvedValue(race);
    competitors.findOneBy.mockResolvedValue(competitor);
    registrations.create.mockImplementation((value: RaceRegistration) => value);
    registrations.save.mockImplementation((value: RaceRegistration) =>
      Promise.resolve(value),
    );

    const result = await service.create(
      raceId,
      { competitorId },
      actorUserProfileId,
    );

    expect(result.status).toBe(RegistrationStatus.PENDING);
    expect(result.startingPosition).toBeNull();
    expect(result.performedByUserProfileId).toBe(actorUserProfileId);
    expect(auditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserProfileId,
        action: 'REGISTRATION_CREATED',
      }),
      expect.anything(),
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(races.findOne).toHaveBeenCalledWith({
      where: { id: raceId },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('uses the injected clock to close registration at the deadline', async () => {
    races.findOne.mockResolvedValue(
      openRace({ registrationDeadline: clock.now() }),
    );

    await expect(
      service.create(raceId, { competitorId }, actorUserProfileId),
    ).rejects.toThrow('window is closed');
  });

  it('rejects registration when the race window is closed', async () => {
    races.findOne.mockResolvedValue(openRace({ status: RaceStatus.CLOSED }));

    await expect(
      service.create(raceId, { competitorId }, actorUserProfileId),
    ).rejects.toThrow('window is closed');
  });

  it('rejects an inactive competitor', async () => {
    races.findOne.mockResolvedValue(openRace());
    competitors.findOneBy.mockResolvedValue({
      id: competitorId,
      status: CompetitorStatus.SUSPENDED,
    });

    await expect(
      service.create(raceId, { competitorId }, actorUserProfileId),
    ).rejects.toThrow('is not active');
  });

  it('rejects an individual participant for a team race', async () => {
    races.findOne.mockResolvedValue(openRace({ type: RaceType.TEAM }));

    await expect(
      service.create(raceId, { competitorId }, actorUserProfileId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a pending registration with a reason', async () => {
    const registration = {
      id: crypto.randomUUID(),
      status: RegistrationStatus.PENDING,
    } as RaceRegistration;
    registrations.findOne.mockResolvedValue(registration);
    registrations.save.mockImplementation((value: RaceRegistration) =>
      Promise.resolve(value),
    );

    const result = await service.reject(
      registration.id,
      'Incomplete documents',
      actorUserProfileId,
    );

    expect(result.status).toBe(RegistrationStatus.REJECTED);
    expect(result.validationNotes).toBe('Incomplete documents');
    expect(result.performedByUserProfileId).toBe(actorUserProfileId);
    expect(auditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REGISTRATION_REJECTED' }),
    );
  });

  it('lists registrations and rejects an unknown race', async () => {
    races.existsBy.mockResolvedValueOnce(false);
    await expect(
      service.findAllForRace(raceId, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const registration = {
      id: crypto.randomUUID(),
      raceId,
      status: RegistrationStatus.PENDING,
    } as RaceRegistration;
    races.existsBy.mockResolvedValueOnce(true);
    registrations.findAndCount.mockResolvedValue([[registration], 21]);

    await expect(
      service.findAllForRace(raceId, {
        page: 2,
        limit: 20,
        status: RegistrationStatus.PENDING,
      }),
    ).resolves.toEqual({
      items: [registration],
      page: 2,
      limit: 20,
      totalItems: 21,
      totalPages: 2,
    });
  });

  it('creates a pending registration for an eligible team', async () => {
    const teamId = crypto.randomUUID();
    const competitor = {
      id: competitorId,
      status: CompetitorStatus.ACTIVE,
    } as Competitor;
    const team = {
      id: teamId,
      status: TeamStatus.ACTIVE,
      members: [
        {
          competitorId,
          competitor,
          leftAt: null,
        } as TeamMember,
      ],
    } as Team;
    races.findOne.mockResolvedValue(openRace({ type: RaceType.TEAM }));
    teams.findOne.mockResolvedValue(team);
    registrations.create.mockImplementation((value: RaceRegistration) => value);
    registrations.save.mockImplementation((value: RaceRegistration) =>
      Promise.resolve(value),
    );

    const result = await service.create(raceId, { teamId }, actorUserProfileId);

    expect(result).toMatchObject({
      teamId,
      competitorId: null,
      status: RegistrationStatus.PENDING,
    });
  });

  it('rejects duplicate individual registration', async () => {
    races.findOne.mockResolvedValue(openRace());
    competitors.findOneBy.mockResolvedValue({
      id: competitorId,
      status: CompetitorStatus.ACTIVE,
    });
    registrations.exists.mockResolvedValueOnce(true);

    await expect(
      service.create(raceId, { competitorId }, actorUserProfileId),
    ).rejects.toThrow('already registered');
  });

  it('approves a pending registration with an atomic audit event', async () => {
    const registration = {
      id: crypto.randomUUID(),
      raceId,
      competitorId,
      teamId: null,
      status: RegistrationStatus.PENDING,
      startingPosition: null,
      validationNotes: null,
      performedByUserProfileId: actorUserProfileId,
    } as RaceRegistration;
    registrations.findOne.mockResolvedValue(registration);
    registrations.count.mockResolvedValue(1);
    registrations.exists.mockResolvedValue(false);
    registrations.save.mockImplementation((value: RaceRegistration) =>
      Promise.resolve(value),
    );
    races.findOne.mockResolvedValue(openRace());

    const result = await service.approve(
      registration.id,
      3,
      actorUserProfileId,
    );

    expect(result).toMatchObject({
      status: RegistrationStatus.APPROVED,
      startingPosition: 3,
    });
    expect(auditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REGISTRATION_APPROVED' }),
      expect.anything(),
    );
  });

  it('cancels an active registration and audits the transition', async () => {
    const registration = {
      id: crypto.randomUUID(),
      raceId,
      competitorId,
      teamId: null,
      status: RegistrationStatus.APPROVED,
      startingPosition: 1,
      validationNotes: null,
      performedByUserProfileId: actorUserProfileId,
      race: openRace(),
    } as RaceRegistration;
    registrations.findOne.mockResolvedValue(registration);
    registrations.save.mockImplementation((value: RaceRegistration) =>
      Promise.resolve(value),
    );

    await service.cancel(registration.id, actorUserProfileId);

    expect(registration.status).toBe(RegistrationStatus.CANCELLED);
    expect(auditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REGISTRATION_CANCELLED' }),
    );
  });

  it('rejects cancellation and rejection from terminal states', async () => {
    registrations.findOne.mockResolvedValue({
      id: crypto.randomUUID(),
      status: RegistrationStatus.REJECTED,
      race: openRace(),
    });

    await expect(
      service.cancel(crypto.randomUUID(), actorUserProfileId),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.reject(
        crypto.randomUUID(),
        'No longer valid',
        actorUserProfileId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
