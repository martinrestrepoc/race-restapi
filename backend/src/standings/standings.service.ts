import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SortOrder } from '../common/enums/sort-order.enum';
import {
  CompetitorStandingsQueryDto,
  StandingsQueryDto,
  StandingsSortField,
  TeamStandingsQueryDto,
} from './dto/standings-query.dto';
import {
  CompetitorStandingResponseDto,
  OverallStandingsResponseDto,
  TeamStandingResponseDto,
} from './dto/standings-response.dto';
import {
  POINTS_BY_POSITION,
  pointsSql,
  ZERO_POINT_RESULT_STATUSES,
} from './standings-scoring';

interface RawStandingRow {
  participant_id: string;
  name: string;
  participant_status: string;
  nickname?: string;
  participant_type?: string;
  total_points: number | string;
  wins: number | string;
  second_places: number | string;
  races_completed: number | string;
  best_final_time_ms: number | string | null;
  position: number | string;
  total_items: number | string;
}

const SORT_COLUMNS: Record<StandingsSortField, string> = {
  [StandingsSortField.POSITION]: 'position',
  [StandingsSortField.NAME]: 'lower(name)',
  [StandingsSortField.TOTAL_POINTS]: 'total_points',
  [StandingsSortField.WINS]: 'wins',
  [StandingsSortField.SECOND_PLACES]: 'second_places',
  [StandingsSortField.RACES_COMPLETED]: 'races_completed',
  [StandingsSortField.BEST_FINAL_TIME_MS]: 'best_final_time_ms',
};

@Injectable()
export class StandingsService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverall(
    query: StandingsQueryDto,
  ): Promise<OverallStandingsResponseDto> {
    const [competitors, teams] = await Promise.all([
      this.getCompetitors(query),
      this.getTeams(query),
    ]);

    return {
      pointsTable: Object.entries(POINTS_BY_POSITION).map(
        ([position, points]) => ({ position: Number(position), points }),
      ),
      zeroPointResultStatuses: [...ZERO_POINT_RESULT_STATUSES],
      competitors,
      teams,
    };
  }

  async getCompetitors(
    query: CompetitorStandingsQueryDto,
  ): Promise<PaginatedResponseDto<CompetitorStandingResponseDto>> {
    const filters: string[] = [];
    const parameters: unknown[] = [];
    this.addSearchFilter(filters, parameters, query.search, [
      'name',
      'nickname',
    ]);
    this.addFilter(filters, parameters, 'participant_status', query.status);
    this.addFilter(filters, parameters, 'participant_type', query.type);

    const rows = await this.runQuery(
      `
        SELECT
          competitor.id AS participant_id,
          competitor.name,
          competitor.nickname,
          competitor.type AS participant_type,
          competitor.status AS participant_status,
          SUM(${pointsSql('result')})::integer AS total_points,
          COUNT(*) FILTER (
            WHERE result.status = 'FINISHED' AND result.final_position = 1
          )::integer AS wins,
          COUNT(*) FILTER (
            WHERE result.status = 'FINISHED' AND result.final_position = 2
          )::integer AS second_places,
          COUNT(*) FILTER (WHERE result.status = 'FINISHED')::integer
            AS races_completed,
          MIN(result.final_time_ms) FILTER (WHERE result.status = 'FINISHED')
            AS best_final_time_ms
        FROM race_results result
        INNER JOIN races race ON race.id = result.race_id
        INNER JOIN race_registrations registration
          ON registration.id = result.registration_id
        INNER JOIN competitors competitor
          ON competitor.id = registration.competitor_id
        WHERE race.status = 'COMPLETED'
        GROUP BY competitor.id
      `,
      filters,
      parameters,
      query,
    );

    return this.toPage(rows, query, (row) => ({
      position: Number(row.position),
      competitorId: row.participant_id,
      name: row.name,
      nickname: row.nickname!,
      type: row.participant_type as CompetitorStandingResponseDto['type'],
      status: row.participant_status as CompetitorStandingResponseDto['status'],
      totalPoints: Number(row.total_points),
      wins: Number(row.wins),
      secondPlaces: Number(row.second_places),
      racesCompleted: Number(row.races_completed),
      bestFinalTimeMs:
        row.best_final_time_ms === null ? null : Number(row.best_final_time_ms),
    }));
  }

  async getTeams(
    query: TeamStandingsQueryDto,
  ): Promise<PaginatedResponseDto<TeamStandingResponseDto>> {
    const filters: string[] = [];
    const parameters: unknown[] = [];
    this.addSearchFilter(filters, parameters, query.search, ['name']);
    this.addFilter(filters, parameters, 'participant_status', query.status);

    const rows = await this.runQuery(
      `
        SELECT
          team.id AS participant_id,
          team.name,
          team.status AS participant_status,
          SUM(${pointsSql('result')})::integer AS total_points,
          COUNT(*) FILTER (
            WHERE result.status = 'FINISHED' AND result.final_position = 1
          )::integer AS wins,
          COUNT(*) FILTER (
            WHERE result.status = 'FINISHED' AND result.final_position = 2
          )::integer AS second_places,
          COUNT(*) FILTER (WHERE result.status = 'FINISHED')::integer
            AS races_completed,
          MIN(result.final_time_ms) FILTER (WHERE result.status = 'FINISHED')
            AS best_final_time_ms
        FROM race_results result
        INNER JOIN races race ON race.id = result.race_id
        INNER JOIN race_registrations registration
          ON registration.id = result.registration_id
        INNER JOIN teams team ON team.id = registration.team_id
        WHERE race.status = 'COMPLETED'
        GROUP BY team.id
      `,
      filters,
      parameters,
      query,
    );

    return this.toPage(rows, query, (row) => ({
      position: Number(row.position),
      teamId: row.participant_id,
      name: row.name,
      status: row.participant_status as TeamStandingResponseDto['status'],
      totalPoints: Number(row.total_points),
      wins: Number(row.wins),
      secondPlaces: Number(row.second_places),
      racesCompleted: Number(row.races_completed),
      bestFinalTimeMs:
        row.best_final_time_ms === null ? null : Number(row.best_final_time_ms),
    }));
  }

  private async runQuery(
    aggregateSql: string,
    filters: string[],
    parameters: unknown[],
    query: StandingsQueryDto,
  ): Promise<RawStandingRow[]> {
    const direction = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    const sortColumn = SORT_COLUMNS[query.sortBy];
    const nulls =
      query.sortBy === StandingsSortField.BEST_FINAL_TIME_MS
        ? ' NULLS LAST'
        : '';
    const stableOrder =
      query.sortBy === StandingsSortField.POSITION
        ? ', lower(name) ASC, participant_id ASC'
        : ', position ASC, lower(name) ASC, participant_id ASC';
    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    parameters.push(query.limit, (query.page - 1) * query.limit);
    const limitParameter = `$${parameters.length - 1}`;
    const offsetParameter = `$${parameters.length}`;

    return this.dataSource.query<RawStandingRow[]>(
      `
        WITH aggregated AS (${aggregateSql}),
        ranked AS (
          SELECT
            aggregated.*,
            DENSE_RANK() OVER (
              ORDER BY total_points DESC, wins DESC, second_places DESC,
                races_completed DESC, best_final_time_ms ASC NULLS LAST
            ) AS position
          FROM aggregated
        )
        SELECT ranked.*, COUNT(*) OVER () AS total_items
        FROM ranked
        ${where}
        ORDER BY ${sortColumn} ${direction}${nulls}${stableOrder}
        LIMIT ${limitParameter} OFFSET ${offsetParameter}
      `,
      parameters,
    );
  }

  private addSearchFilter(
    filters: string[],
    parameters: unknown[],
    value: string | undefined,
    columns: string[],
  ): void {
    const search = value?.trim();
    if (!search) return;
    parameters.push(`%${search}%`);
    const placeholder = `$${parameters.length}`;
    filters.push(
      `(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(' OR ')})`,
    );
  }

  private addFilter(
    filters: string[],
    parameters: unknown[],
    column: string,
    value: string | undefined,
  ): void {
    if (!value) return;
    parameters.push(value);
    filters.push(`${column} = $${parameters.length}`);
  }

  private toPage<T>(
    rows: RawStandingRow[],
    query: StandingsQueryDto,
    map: (row: RawStandingRow) => T,
  ): PaginatedResponseDto<T> {
    const totalItems = rows.length === 0 ? 0 : Number(rows[0].total_items);
    return {
      items: rows.map(map),
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }
}
