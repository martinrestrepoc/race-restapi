import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { CompetitorType } from '../common/enums/competitor-type.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { TeamStatus } from '../common/enums/team-status.enum';
import {
  CompetitorStandingsQueryDto,
  StandingsQueryDto,
  StandingsSortField,
  TeamStandingsQueryDto,
} from './dto/standings-query.dto';
import { StandingsService } from './standings.service';

describe('StandingsService', () => {
  const query = jest.fn<
    Promise<unknown[]>,
    [sql: string, parameters?: unknown[]]
  >();
  const service = new StandingsService({ query } as unknown as DataSource);
  let executedSql = '';

  beforeEach(() => {
    jest.clearAllMocks();
    executedSql = '';
  });

  function returnRows(rows: unknown[]): void {
    query.mockImplementationOnce((sql: string) => {
      executedSql = sql;
      return Promise.resolve(rows);
    });
  }

  it('maps competitor aggregates and preserves a shared sports position', async () => {
    returnRows([
      {
        participant_id: 'competitor-a',
        name: 'Amber',
        nickname: 'A',
        participant_type: CompetitorType.DWARF,
        participant_status: CompetitorStatus.ACTIVE,
        total_points: '17',
        wins: '1',
        second_places: '1',
        races_completed: '2',
        best_final_time_ms: '81000',
        position: '2',
        total_items: '4',
      },
    ]);
    const dto = Object.assign(new CompetitorStandingsQueryDto(), {
      page: 2,
      limit: 1,
      search: ' amb ',
      status: CompetitorStatus.ACTIVE,
      type: CompetitorType.DWARF,
    });

    const result = await service.getCompetitors(dto);

    expect(result).toEqual({
      items: [
        {
          position: 2,
          competitorId: 'competitor-a',
          name: 'Amber',
          nickname: 'A',
          type: CompetitorType.DWARF,
          status: CompetitorStatus.ACTIVE,
          totalPoints: 17,
          wins: 1,
          secondPlaces: 1,
          racesCompleted: 2,
          bestFinalTimeMs: 81000,
        },
      ],
      page: 2,
      limit: 1,
      totalItems: 4,
      totalPages: 4,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE race.status = 'COMPLETED'"),
      ['%amb%', CompetitorStatus.ACTIVE, CompetitorType.DWARF, 1, 1],
    );
    expect(executedSql).toContain('DENSE_RANK()');
    expect(executedSql).toContain('best_final_time_ms ASC NULLS LAST');
  });

  it('maps team standings and orders missing times last', async () => {
    returnRows([
      {
        participant_id: 'team-a',
        name: 'Team A',
        participant_status: TeamStatus.ACTIVE,
        total_points: 0,
        wins: 0,
        second_places: 0,
        races_completed: 0,
        best_final_time_ms: null,
        position: 1,
        total_items: 1,
      },
    ]);
    const dto = Object.assign(new TeamStandingsQueryDto(), {
      sortBy: StandingsSortField.BEST_FINAL_TIME_MS,
      sortOrder: SortOrder.DESC,
      status: TeamStatus.ACTIVE,
    });

    const result = await service.getTeams(dto);

    expect(result.items[0]).toMatchObject({
      teamId: 'team-a',
      bestFinalTimeMs: null,
      racesCompleted: 0,
    });
    expect(executedSql).toContain(
      'ORDER BY best_final_time_ms DESC NULLS LAST',
    );
  });

  it('returns an empty page with zero total pages', async () => {
    returnRows([]);

    await expect(
      service.getCompetitors(new CompetitorStandingsQueryDto()),
    ).resolves.toMatchObject({
      items: [],
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('builds the overall response by reusing both specialized standings', async () => {
    const competitors = {
      items: [],
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
    };
    const teams = { ...competitors };
    const competitorsSpy = jest
      .spyOn(service, 'getCompetitors')
      .mockResolvedValueOnce(competitors);
    const teamsSpy = jest
      .spyOn(service, 'getTeams')
      .mockResolvedValueOnce(teams);
    const dto = new StandingsQueryDto();

    const result = await service.getOverall(dto);

    expect(competitorsSpy).toHaveBeenCalledWith(dto);
    expect(teamsSpy).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      pointsTable: [
        { position: 1, points: 10 },
        { position: 2, points: 7 },
        { position: 3, points: 5 },
        { position: 4, points: 3 },
        { position: 5, points: 1 },
      ],
      competitors,
      teams,
    });
  });
});
