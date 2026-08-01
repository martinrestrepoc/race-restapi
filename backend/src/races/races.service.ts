import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaceStatus } from '../common/enums/race-status.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { CreateRaceDto } from './dto/create-race.dto';
import { RaceQueryDto } from './dto/race-query.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { Race } from './entities/race.entity';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { RaceResult } from '../results/entities/race-result.entity';

export interface RaceListResult {
  items: Race[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const allowedStatusTransitions: Record<RaceStatus, readonly RaceStatus[]> = {
  [RaceStatus.DRAFT]: [RaceStatus.OPEN_FOR_REGISTRATION, RaceStatus.CANCELLED],
  [RaceStatus.OPEN_FOR_REGISTRATION]: [RaceStatus.CLOSED, RaceStatus.CANCELLED],
  [RaceStatus.CLOSED]: [RaceStatus.IN_PROGRESS, RaceStatus.CANCELLED],
  [RaceStatus.IN_PROGRESS]: [RaceStatus.COMPLETED, RaceStatus.CANCELLED],
  [RaceStatus.COMPLETED]: [],
  [RaceStatus.CANCELLED]: [],
};

@Injectable()
export class RacesService {
  constructor(
    @InjectRepository(Race)
    private readonly racesRepository: Repository<Race>,
    @InjectRepository(RaceRegistration)
    private readonly registrationsRepository: Repository<RaceRegistration>,
    @InjectRepository(RaceResult)
    private readonly resultsRepository: Repository<RaceResult>,
  ) {}

  async create(dto: CreateRaceDto): Promise<Race> {
    this.validateSchedule(dto.scheduledAt, dto.registrationDeadline, true);
    const race = this.racesRepository.create({
      ...dto,
      description: dto.description ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      registrationDeadline: new Date(dto.registrationDeadline),
      status: RaceStatus.DRAFT,
      organizerUserProfileId: null,
    });
    return this.racesRepository.save(race);
  }

  async findAll(query: RaceQueryDto): Promise<RaceListResult> {
    const queryBuilder = this.racesRepository
      .createQueryBuilder('race')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status) {
      queryBuilder.andWhere('race.status = :status', { status: query.status });
    }
    if (query.type) {
      queryBuilder.andWhere('race.type = :type', { type: query.type });
    }
    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(race.name ILIKE :search OR race.description ILIKE :search OR race.startLocation ILIKE :search OR race.finishLocation ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    queryBuilder.orderBy(
      `race.${query.sortBy}`,
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy('race.id', 'ASC');

    const [items, totalItems] = await queryBuilder.getManyAndCount();
    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<Race> {
    const race = await this.racesRepository.findOneBy({ id });
    if (!race) {
      throw new NotFoundException(`Race with ID ${id} was not found`);
    }
    return race;
  }

  async update(id: string, dto: UpdateRaceDto): Promise<Race> {
    const race = await this.findOne(id);
    if (
      race.status === RaceStatus.COMPLETED ||
      race.status === RaceStatus.CANCELLED
    ) {
      throw new ConflictException(
        `Race in status ${race.status} cannot be edited`,
      );
    }
    this.validateSchedule(dto.scheduledAt, dto.registrationDeadline, false);
    this.racesRepository.merge(race, {
      ...dto,
      description: dto.description ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      registrationDeadline: new Date(dto.registrationDeadline),
    });
    return this.racesRepository.save(race);
  }

  async updateStatus(id: string, targetStatus: RaceStatus): Promise<Race> {
    const race = await this.findOne(id);
    if (!allowedStatusTransitions[race.status].includes(targetStatus)) {
      throw new ConflictException(
        `Race status cannot transition from ${race.status} to ${targetStatus}`,
      );
    }
    if (targetStatus === RaceStatus.OPEN_FOR_REGISTRATION) {
      this.validateSchedule(
        race.scheduledAt.toISOString(),
        race.registrationDeadline.toISOString(),
        true,
      );
    }
    if (targetStatus === RaceStatus.IN_PROGRESS) {
      const approvedParticipants = await this.registrationsRepository.count({
        where: { raceId: race.id, status: RegistrationStatus.APPROVED },
      });
      if (approvedParticipants < 2) {
        throw new ConflictException(
          'A race requires at least two approved participants to start',
        );
      }
    }
    if (targetStatus === RaceStatus.COMPLETED) {
      const [approvedParticipants, recordedResults] = await Promise.all([
        this.registrationsRepository.count({
          where: { raceId: race.id, status: RegistrationStatus.APPROVED },
        }),
        this.resultsRepository.count({ where: { raceId: race.id } }),
      ]);
      if (
        approvedParticipants === 0 ||
        recordedResults !== approvedParticipants
      ) {
        throw new ConflictException(
          'Every approved participant requires a result before completing the race',
        );
      }
    }
    race.status = targetStatus;
    return this.racesRepository.save(race);
  }

  async remove(id: string): Promise<void> {
    const race = await this.findOne(id);
    const hasRegistrations = await this.registrationsRepository.exists({
      where: { raceId: id },
    });
    if (race.status === RaceStatus.DRAFT && !hasRegistrations) {
      await this.racesRepository.remove(race);
      return;
    }
    if (
      race.status === RaceStatus.COMPLETED ||
      race.status === RaceStatus.CANCELLED
    ) {
      throw new ConflictException(
        `Race in status ${race.status} cannot be deleted`,
      );
    }
    race.status = RaceStatus.CANCELLED;
    await this.racesRepository.save(race);
  }

  private validateSchedule(
    scheduledAtValue: string,
    deadlineValue: string,
    requireFutureStart: boolean,
  ): void {
    const scheduledAt = new Date(scheduledAtValue);
    const deadline = new Date(deadlineValue);
    if (requireFutureStart && scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }
    if (deadline.getTime() >= scheduledAt.getTime()) {
      throw new BadRequestException(
        'registrationDeadline must be earlier than scheduledAt',
      );
    }
  }
}
