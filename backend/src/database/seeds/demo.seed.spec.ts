import type { DataSource, EntityManager } from 'typeorm';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { RaceStatus } from '../../common/enums/race-status.enum';
import { Race } from '../../races/entities/race.entity';
import { RaceRegistration } from '../../registrations/entities/race-registration.entity';
import { RaceResult } from '../../results/entities/race-result.entity';
import { seedDemoData } from './demo.seed';

describe('demonstration seed', () => {
  it('builds the complete dataset without identity records', async () => {
    const savedGroups: unknown[][] = [];
    const repository = {
      create: <T>(value: T): T => value,
      save: (values: unknown[]): Promise<unknown[]> => {
        savedGroups.push(values);
        return Promise.resolve(values);
      },
    };
    const manager = {
      getRepository: () => repository,
    } as unknown as EntityManager;
    const dataSource = {
      transaction: <T>(
        callback: (entityManager: EntityManager) => Promise<T>,
      ): Promise<T> => callback(manager),
    } as unknown as DataSource;

    const summary = await seedDemoData(dataSource);

    expect(summary).toEqual({
      competitors: 9,
      teams: 2,
      teamMembers: 6,
      races: 3,
      registrations: 5,
      results: 5,
      userProfiles: 0,
    });
    expect(savedGroups.map((group) => group.length)).toEqual([
      9, 2, 6, 3, 5, 5,
    ]);

    const competitors = savedGroups[0] as Array<{ type: CompetitorType }>;
    expect(
      competitors.filter(({ type }) => type === CompetitorType.DWARF),
    ).toHaveLength(5);
    expect(
      competitors.filter(({ type }) => type === CompetitorType.CAMEL),
    ).toHaveLength(2);
    expect(
      competitors.filter(({ type }) => type === CompetitorType.MEDIUM),
    ).toHaveLength(2);

    const races = savedGroups[3] as Race[];
    expect(races.map(({ status }) => status)).toEqual([
      RaceStatus.DRAFT,
      RaceStatus.OPEN_FOR_REGISTRATION,
      RaceStatus.COMPLETED,
    ]);
    expect(
      races.every(
        ({ organizerUserProfileId }) => organizerUserProfileId === null,
      ),
    ).toBe(true);

    const registrations = savedGroups[4] as RaceRegistration[];
    expect(
      registrations.every(
        ({ performedByUserProfileId }) => performedByUserProfileId === null,
      ),
    ).toBe(true);

    const results = savedGroups[5] as RaceResult[];
    expect(results.map(({ finalPosition }) => finalPosition)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(
      results.every(
        ({ recordedByUserProfileId }) => recordedByUserProfileId === null,
      ),
    ).toBe(true);
  });
});
