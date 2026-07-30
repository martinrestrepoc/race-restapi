import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import type { EnvironmentVariables } from '../config/environment.validation';
import { SortOrder } from '../common/enums/sort-order.enum';
import { TeamStatus } from '../common/enums/team-status.enum';
import { Competitor } from '../competitors/entities/competitor.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';

export interface TeamListResult {
  items: Team[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === code
  );
}

@Injectable()
export class TeamsService {
  private readonly maximumMembers: number;

  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    private readonly dataSource: DataSource,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maximumMembers = configService.getOrThrow<number>('TEAM_MAX_MEMBERS');
  }

  async create(dto: CreateTeamDto): Promise<Team> {
    const team = this.teamsRepository.create({
      ...dto,
      description: dto.description ?? null,
    });

    return this.save(team);
  }

  async findAll(query: TeamQueryDto): Promise<TeamListResult> {
    const queryBuilder = this.teamsRepository
      .createQueryBuilder('team')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status) {
      queryBuilder.andWhere('team.status = :status', { status: query.status });
    }

    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(team.name ILIKE :search OR team.description ILIKE :search OR team.responsiblePerson ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(
      `team.${query.sortBy}`,
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy('team.id', 'ASC');

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: { members: { competitor: true } },
      order: { members: { joinedAt: 'DESC' } },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} was not found`);
    }

    return team;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);
    this.teamsRepository.merge(team, {
      ...dto,
      description: dto.description ?? null,
    });

    return this.save(team);
  }

  async updateStatus(id: string, targetStatus: TeamStatus): Promise<Team> {
    const team = await this.findOne(id);

    if (team.status === targetStatus) {
      throw new ConflictException(
        `Team status cannot transition from ${team.status} to ${targetStatus}`,
      );
    }

    team.status = targetStatus;
    return this.teamsRepository.save(team);
  }

  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    const hasMembershipHistory = await this.teamMembersRepository.exists({
      where: { teamId: id },
    });

    if (hasMembershipHistory) {
      if (team.status !== TeamStatus.INACTIVE) {
        team.status = TeamStatus.INACTIVE;
        await this.teamsRepository.save(team);
      }
      return;
    }

    await this.teamsRepository.remove(team);
  }

  async addMember(teamId: string, competitorId: string): Promise<TeamMember> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const teamsRepository = manager.getRepository(Team);
        const competitorsRepository = manager.getRepository(Competitor);
        const membersRepository = manager.getRepository(TeamMember);
        const team = await teamsRepository.findOne({
          where: { id: teamId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!team) {
          throw new NotFoundException(`Team with ID ${teamId} was not found`);
        }

        if (team.status !== TeamStatus.ACTIVE) {
          throw new ConflictException(
            `Inactive team ${teamId} cannot receive new members`,
          );
        }

        const competitor = await competitorsRepository.findOne({
          where: { id: competitorId },
        });
        if (!competitor) {
          throw new NotFoundException(
            `Competitor with ID ${competitorId} was not found`,
          );
        }

        const activeMembership = await membersRepository.findOne({
          where: { competitorId, leftAt: IsNull() },
        });
        if (activeMembership) {
          const message =
            activeMembership.teamId === teamId
              ? `Competitor ${competitorId} is already an active member of team ${teamId}`
              : `Competitor ${competitorId} already belongs to another active team`;
          throw new ConflictException(message);
        }

        const activeMemberCount = await membersRepository.count({
          where: { teamId, leftAt: IsNull() },
        });
        if (activeMemberCount >= this.maximumMembers) {
          throw new ConflictException(
            `Team ${teamId} has reached its maximum of ${this.maximumMembers} active members`,
          );
        }

        const member = membersRepository.create({
          teamId,
          competitorId,
          team,
          competitor,
          leftAt: null,
        });

        return membersRepository.save(member);
      });
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(
          `Competitor ${competitorId} already belongs to an active team`,
        );
      }

      throw error;
    }
  }

  async removeMember(teamId: string, competitorId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const teamsRepository = manager.getRepository(Team);
      const membersRepository = manager.getRepository(TeamMember);
      const teamExists = await teamsRepository.existsBy({ id: teamId });

      if (!teamExists) {
        throw new NotFoundException(`Team with ID ${teamId} was not found`);
      }

      const membership = await membersRepository.findOne({
        where: { teamId, competitorId, leftAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!membership) {
        throw new NotFoundException(
          `Competitor ${competitorId} is not an active member of team ${teamId}`,
        );
      }

      membership.leftAt = new Date();
      await membersRepository.save(membership);
    });
  }

  private async save(team: Team): Promise<Team> {
    try {
      return await this.teamsRepository.save(team);
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(`Team name ${team.name} is already in use`);
      }

      throw error;
    }
  }
}
