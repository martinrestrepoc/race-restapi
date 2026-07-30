import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { CompetitorQueryDto } from './dto/competitor-query.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { Competitor } from './entities/competitor.entity';
import { TeamMember } from '../teams/entities/team-member.entity';

export interface CompetitorListResult {
  items: Competitor[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const allowedStatusTransitions: Record<
  CompetitorStatus,
  readonly CompetitorStatus[]
> = {
  [CompetitorStatus.ACTIVE]: [
    CompetitorStatus.SUSPENDED,
    CompetitorStatus.RETIRED,
  ],
  [CompetitorStatus.SUSPENDED]: [
    CompetitorStatus.ACTIVE,
    CompetitorStatus.RETIRED,
  ],
  [CompetitorStatus.RETIRED]: [],
};

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
export class CompetitorsService {
  constructor(
    @InjectRepository(Competitor)
    private readonly competitorsRepository: Repository<Competitor>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
  ) {}

  async create(dto: CreateCompetitorDto): Promise<Competitor> {
    const competitor = this.competitorsRepository.create(dto);

    return this.save(competitor);
  }

  async findAll(query: CompetitorQueryDto): Promise<CompetitorListResult> {
    const queryBuilder = this.competitorsRepository
      .createQueryBuilder('competitor')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status) {
      queryBuilder.andWhere('competitor.status = :status', {
        status: query.status,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('competitor.type = :type', { type: query.type });
    }

    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(competitor.name ILIKE :search OR competitor.nickname ILIKE :search OR competitor.origin ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(
      `competitor.${query.sortBy}`,
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy('competitor.id', 'ASC');

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<Competitor> {
    const competitor = await this.competitorsRepository.findOne({
      where: { id },
    });

    if (!competitor) {
      throw new NotFoundException(`Competitor with ID ${id} was not found`);
    }

    return competitor;
  }

  async update(id: string, dto: UpdateCompetitorDto): Promise<Competitor> {
    const competitor = await this.findOne(id);
    this.competitorsRepository.merge(competitor, dto);

    return this.save(competitor);
  }

  async updateStatus(
    id: string,
    targetStatus: CompetitorStatus,
  ): Promise<Competitor> {
    const competitor = await this.findOne(id);
    const allowedTargets = allowedStatusTransitions[competitor.status];

    if (!allowedTargets.includes(targetStatus)) {
      throw new ConflictException(
        `Competitor status cannot transition from ${competitor.status} to ${targetStatus}`,
      );
    }

    competitor.status = targetStatus;
    return this.competitorsRepository.save(competitor);
  }

  async remove(id: string): Promise<void> {
    const competitor = await this.findOne(id);
    const hasMembershipHistory = await this.teamMembersRepository.exists({
      where: { competitorId: id },
    });

    if (hasMembershipHistory) {
      if (competitor.status !== CompetitorStatus.RETIRED) {
        competitor.status = CompetitorStatus.RETIRED;
        await this.competitorsRepository.save(competitor);
      }
      return;
    }

    await this.competitorsRepository.remove(competitor);
  }

  private async save(competitor: Competitor): Promise<Competitor> {
    try {
      return await this.competitorsRepository.save(competitor);
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(
          `Competitor nickname ${competitor.nickname} is already in use`,
        );
      }

      throw error;
    }
  }
}
