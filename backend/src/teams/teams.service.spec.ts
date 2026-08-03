import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { TeamStatus } from '../common/enums/team-status.enum';
import type { EnvironmentVariables } from '../config/environment.validation';
import { Competitor } from '../competitors/entities/competitor.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';
import { AuditService } from '../audit/audit.service';

const teamId = '5df13ac6-1dcf-4e87-bf13-52ac34d8a4d0';
const competitorId = '69406ea2-a076-40b2-98c2-adb8df983bcc';
const actorUserProfileId = 'd9385ef6-f41a-420a-a773-8bd18fbfbf10';
const createDto: CreateTeamDto = {
  name: 'Iron Striders',
  description: 'Mountain racing team',
  responsiblePerson: 'Nara Flint',
  status: TeamStatus.ACTIVE,
};

function createTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: teamId,
    ...createDto,
    description: createDto.description ?? null,
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    members: [],
    ...overrides,
  };
}

function createCompetitor(): Competitor {
  return {
    id: competitorId,
    name: 'Borin Stonehelm',
    nickname: 'Stonebolt',
    type: 'DWARF',
    dateOfBirth: '1994-06-12',
    weight: 78.5,
    height: 132.4,
    origin: 'Iron Hills',
    status: 'ACTIVE',
    registeredAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  } as Competitor;
}

describe('TeamsService', () => {
  let teamsRepository: jest.Mocked<
    Pick<Repository<Team>, 'create' | 'save' | 'findOne' | 'merge' | 'remove'>
  >;
  let teamMembersRepository: jest.Mocked<
    Pick<Repository<TeamMember>, 'exists'>
  >;
  let transaction: jest.Mock;
  let service: TeamsService;
  const auditService = {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    teamsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
    };
    teamMembersRepository = {
      exists: jest.fn(),
    };
    transaction = jest.fn();
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(2),
    } as unknown as ConfigService<EnvironmentVariables, true>;
    service = new TeamsService(
      teamsRepository as unknown as Repository<Team>,
      teamMembersRepository as unknown as Repository<TeamMember>,
      { transaction } as unknown as DataSource,
      configService,
      auditService as unknown as AuditService,
    );
  });

  it('creates and persists a team', async () => {
    const team = createTeam();
    teamsRepository.create.mockReturnValue(team);
    teamsRepository.save.mockResolvedValue(team);

    await expect(service.create(createDto, actorUserProfileId)).resolves.toBe(
      team,
    );
    expect(teamsRepository.create).toHaveBeenCalledWith({
      ...createDto,
      description: createDto.description,
    });
  });

  it('maps a duplicated team name to a conflict', async () => {
    const team = createTeam();
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    teamsRepository.create.mockReturnValue(team);
    teamsRepository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], driverError),
    );

    await expect(service.create(createDto, actorUserProfileId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects a status transition to the current status', async () => {
    teamsRepository.findOne.mockResolvedValue(createTeam());

    await expect(
      service.updateStatus(teamId, TeamStatus.ACTIVE, actorUserProfileId),
    ).rejects.toThrow(ConflictException);
    expect(teamsRepository.save).not.toHaveBeenCalled();
  });

  it('deactivates instead of deleting a team with membership history', async () => {
    const team = createTeam();
    teamsRepository.findOne.mockResolvedValue(team);
    teamsRepository.save.mockResolvedValue(team);
    teamMembersRepository.exists.mockResolvedValue(true);

    await service.remove(teamId, actorUserProfileId);

    expect(team.status).toBe(TeamStatus.INACTIVE);
    expect(teamsRepository.save).toHaveBeenCalledWith(team);
    expect(teamsRepository.remove).not.toHaveBeenCalled();
  });

  it('adds a competitor while preserving membership relations', async () => {
    const team = createTeam();
    const competitor = createCompetitor();
    const member = {
      id: crypto.randomUUID(),
      teamId,
      competitorId,
      team,
      competitor,
      joinedAt: new Date(),
      leftAt: null,
    } as TeamMember;
    const transactionalTeams = {
      findOne: jest.fn().mockResolvedValue(team),
    };
    const transactionalCompetitors = {
      findOne: jest.fn().mockResolvedValue(competitor),
    };
    const transactionalMembers = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockReturnValue(member),
      save: jest.fn().mockResolvedValue(member),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Team) return transactionalTeams;
        if (entity === Competitor) return transactionalCompetitors;
        return transactionalMembers;
      }),
    } as unknown as EntityManager;
    transaction.mockImplementation(
      async (callback: (entityManager: EntityManager) => Promise<TeamMember>) =>
        callback(manager),
    );

    await expect(
      service.addMember(teamId, competitorId, actorUserProfileId),
    ).resolves.toBe(member);
    expect(transactionalMembers.save).toHaveBeenCalledWith(member);
    expect(auditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserProfileId,
        action: 'TEAM_MEMBER_ADDED',
      }),
      manager,
    );
  });

  it('rejects adding a member to an inactive team', async () => {
    const manager = {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue(
          createTeam({
            status: TeamStatus.INACTIVE,
          }),
        ),
      })),
    } as unknown as EntityManager;
    transaction.mockImplementation(
      async (callback: (entityManager: EntityManager) => Promise<TeamMember>) =>
        callback(manager),
    );

    await expect(
      service.addMember(teamId, competitorId, actorUserProfileId),
    ).rejects.toThrow('cannot receive new members');
  });

  it('rejects a member when the team has reached its configured maximum', async () => {
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Team) {
          return { findOne: jest.fn().mockResolvedValue(createTeam()) };
        }
        if (entity === Competitor) {
          return { findOne: jest.fn().mockResolvedValue(createCompetitor()) };
        }
        return {
          findOne: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(2),
        };
      }),
    } as unknown as EntityManager;
    transaction.mockImplementation(
      async (callback: (entityManager: EntityManager) => Promise<TeamMember>) =>
        callback(manager),
    );

    await expect(
      service.addMember(teamId, competitorId, actorUserProfileId),
    ).rejects.toThrow('has reached its maximum of 2 active members');
  });

  it('returns not found when removing a membership that is not active', async () => {
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Team
          ? { existsBy: jest.fn().mockResolvedValue(true) }
          : { findOne: jest.fn().mockResolvedValue(null) },
      ),
    } as unknown as EntityManager;
    transaction.mockImplementation(
      async (callback: (entityManager: EntityManager) => Promise<void>) =>
        callback(manager),
    );

    await expect(
      service.removeMember(teamId, competitorId, actorUserProfileId),
    ).rejects.toThrow(NotFoundException);
  });
});
