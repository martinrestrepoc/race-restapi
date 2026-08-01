import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, QueryFailedError, Repository } from 'typeorm';
import { RaceStatus } from '../common/enums/race-status.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { ResultStatus } from '../common/enums/result-status.enum';
import { Race } from '../races/entities/race.entity';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultQueryDto } from './dto/result-query.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { RaceResult } from './entities/race-result.entity';

export interface ResultListResult {
  items: RaceResult[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === code
  );
}

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(RaceResult)
    private readonly resultsRepository: Repository<RaceResult>,
    @InjectRepository(Race)
    private readonly racesRepository: Repository<Race>,
    private readonly dataSource: DataSource,
  ) {}

  async create(raceId: string, dto: CreateResultDto): Promise<RaceResult> {
    return this.persistResult(raceId, dto.registrationId, dto, null);
  }

  async findAllForRace(
    raceId: string,
    query: ResultQueryDto,
  ): Promise<ResultListResult> {
    if (!(await this.racesRepository.existsBy({ id: raceId }))) {
      throw new NotFoundException(`Race with ID ${raceId} was not found`);
    }
    const where = query.status ? { raceId, status: query.status } : { raceId };
    const [items, totalItems] = await this.resultsRepository.findAndCount({
      where,
      order: { finalPosition: 'ASC', recordedAt: 'ASC', id: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<RaceResult> {
    const result = await this.resultsRepository.findOneBy({ id });
    if (!result)
      throw new NotFoundException(`Result with ID ${id} was not found`);
    return result;
  }

  async update(id: string, dto: UpdateResultDto): Promise<RaceResult> {
    const result = await this.findOne(id);
    return this.persistResult(
      result.raceId,
      result.registrationId,
      dto,
      result,
    );
  }

  private async persistResult(
    raceId: string,
    registrationId: string,
    dto: CreateResultDto | UpdateResultDto,
    existing: RaceResult | null,
  ): Promise<RaceResult> {
    const normalized = this.normalizeResult(dto);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const races = manager.getRepository(Race);
        const registrations = manager.getRepository(RaceRegistration);
        const results = manager.getRepository(RaceResult);
        const race = await races.findOne({
          where: { id: raceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!race)
          throw new NotFoundException(`Race with ID ${raceId} was not found`);
        const allowedRaceStatuses = existing
          ? [RaceStatus.IN_PROGRESS, RaceStatus.COMPLETED]
          : [RaceStatus.IN_PROGRESS];
        if (!allowedRaceStatuses.includes(race.status)) {
          throw new ConflictException(
            existing
              ? 'Results can be corrected only during or after the race'
              : 'Results can be recorded only while the race is in progress',
          );
        }
        const registration = await registrations.findOneBy({
          id: registrationId,
        });
        if (!registration || registration.raceId !== raceId) {
          throw new NotFoundException(
            `Registration ${registrationId} does not belong to race ${raceId}`,
          );
        }
        if (
          registration.status !== RegistrationStatus.APPROVED ||
          registration.startingPosition === null
        ) {
          throw new ConflictException(
            'Only an approved registration with a starting position can receive a result',
          );
        }
        if (
          !existing &&
          (await results.exists({ where: { registrationId } }))
        ) {
          throw new ConflictException('Registration already has a result');
        }

        if (normalized.status === ResultStatus.FINISHED) {
          const finalPosition = normalized.finalPosition!;
          const finalTimeMs = normalized.finalTimeMs!;
          const samePosition = await results.exists({
            where: existing
              ? {
                  raceId,
                  finalPosition,
                  status: ResultStatus.FINISHED,
                  id: Not(existing.id),
                }
              : {
                  raceId,
                  finalPosition,
                  status: ResultStatus.FINISHED,
                },
          });
          if (samePosition) {
            throw new ConflictException(
              `Final position ${normalized.finalPosition} is already assigned`,
            );
          }
          await this.validateWinner(
            results,
            raceId,
            finalPosition,
            finalTimeMs,
            existing?.id,
          );
        }

        const result =
          existing ??
          results.create({
            raceId,
            registrationId,
            race,
            registration,
            startingPosition: registration.startingPosition,
            recordedByUserProfileId: null,
          });
        results.merge(result, normalized);
        return results.save(result);
      });
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(
          'Registration already has a result or final position is already assigned',
        );
      }
      throw error;
    }
  }

  private normalizeResult(
    dto: CreateResultDto | UpdateResultDto,
  ): Pick<
    RaceResult,
    | 'status'
    | 'finalPosition'
    | 'rawTimeMs'
    | 'penaltyTimeMs'
    | 'finalTimeMs'
    | 'notes'
  > {
    if (dto.status === ResultStatus.FINISHED) {
      if (dto.rawTimeMs === undefined || dto.finalPosition === undefined) {
        throw new ConflictException(
          'A finished result requires rawTimeMs and finalPosition',
        );
      }
      return {
        status: dto.status,
        finalPosition: dto.finalPosition,
        rawTimeMs: dto.rawTimeMs,
        penaltyTimeMs: dto.penaltyTimeMs,
        finalTimeMs: dto.rawTimeMs + dto.penaltyTimeMs,
        notes: dto.notes ?? null,
      };
    }
    if (dto.rawTimeMs !== undefined || dto.finalPosition !== undefined) {
      throw new ConflictException(
        'Non-finished results cannot have rawTimeMs or finalPosition',
      );
    }
    if (dto.penaltyTimeMs !== 0) {
      throw new ConflictException(
        'Non-finished results cannot have penalty time',
      );
    }
    return {
      status: dto.status,
      finalPosition: null,
      rawTimeMs: null,
      penaltyTimeMs: 0,
      finalTimeMs: null,
      notes: dto.notes ?? null,
    };
  }

  private async validateWinner(
    results: Repository<RaceResult>,
    raceId: string,
    finalPosition: number,
    finalTimeMs: number,
    excludedId?: string,
  ): Promise<void> {
    const finished = await results.find({
      where: excludedId
        ? { raceId, status: ResultStatus.FINISHED, id: Not(excludedId) }
        : { raceId, status: ResultStatus.FINISHED },
    });
    const winner = finished.find((result) => result.finalPosition === 1);
    if (
      finalPosition === 1 &&
      finished.some((result) => result.finalTimeMs! < finalTimeMs)
    ) {
      throw new ConflictException('The winner must have the lowest final time');
    }
    if (winner && finalTimeMs < winner.finalTimeMs!) {
      throw new ConflictException('The winner must have the lowest final time');
    }
  }
}
