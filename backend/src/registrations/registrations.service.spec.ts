import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { RaceStatus } from '../common/enums/race-status.enum';
import { RaceType } from '../common/enums/race-type.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { Competitor } from '../competitors/entities/competitor.entity';
import { Race } from '../races/entities/race.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { RaceRegistration } from './entities/race-registration.entity';
import { RegistrationsService } from './registrations.service';

const raceId = '0cf30ed6-b43c-4cb5-a8de-420310d66353';
const competitorId = '9aa19b2c-dfc1-4360-8852-777fdd9cd497';

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
  };
  const races = { findOneBy: jest.fn(), existsBy: jest.fn() };
  const competitors = { findOneBy: jest.fn() };
  const teams = { findOne: jest.fn() };
  const memberships = { find: jest.fn() };
  const transaction = jest.fn();
  const service = new RegistrationsService(
    registrations as unknown as Repository<RaceRegistration>,
    races as unknown as Repository<Race>,
    competitors as unknown as Repository<Competitor>,
    teams as unknown as Repository<Team>,
    memberships as unknown as Repository<TeamMember>,
    { transaction } as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    registrations.exists.mockResolvedValue(false);
    memberships.find.mockResolvedValue([]);
  });

  it('requires exactly one participant type', async () => {
    await expect(service.create(raceId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create(raceId, { competitorId, teamId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a pending registration for an eligible competitor', async () => {
    const race = openRace();
    const competitor = {
      id: competitorId,
      status: CompetitorStatus.ACTIVE,
    } as Competitor;
    races.findOneBy.mockResolvedValue(race);
    competitors.findOneBy.mockResolvedValue(competitor);
    registrations.create.mockImplementation((value: RaceRegistration) => value);
    registrations.save.mockImplementation((value: RaceRegistration) =>
      Promise.resolve(value),
    );

    const result = await service.create(raceId, { competitorId });

    expect(result.status).toBe(RegistrationStatus.PENDING);
    expect(result.startingPosition).toBeNull();
  });

  it('rejects registration when the race window is closed', async () => {
    races.findOneBy.mockResolvedValue(openRace({ status: RaceStatus.CLOSED }));

    await expect(service.create(raceId, { competitorId })).rejects.toThrow(
      'window is closed',
    );
  });

  it('rejects an inactive competitor', async () => {
    races.findOneBy.mockResolvedValue(openRace());
    competitors.findOneBy.mockResolvedValue({
      id: competitorId,
      status: CompetitorStatus.SUSPENDED,
    });

    await expect(service.create(raceId, { competitorId })).rejects.toThrow(
      'is not active',
    );
  });

  it('rejects an individual participant for a team race', async () => {
    races.findOneBy.mockResolvedValue(openRace({ type: RaceType.TEAM }));

    await expect(
      service.create(raceId, { competitorId }),
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
    );

    expect(result.status).toBe(RegistrationStatus.REJECTED);
    expect(result.validationNotes).toBe('Incomplete documents');
  });
});
