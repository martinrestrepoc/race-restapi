import { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { CompetitorType } from '../src/common/enums/competitor-type.enum';
import { RaceStatus } from '../src/common/enums/race-status.enum';
import { RegistrationStatus } from '../src/common/enums/registration-status.enum';
import { ResultStatus } from '../src/common/enums/result-status.enum';
import { configureApplication } from '../src/configure-application';
import { Competitor } from '../src/competitors/entities/competitor.entity';
import { DEMO_SEED_IDS, seedDemoData } from '../src/database/seeds/demo.seed';
import { Race } from '../src/races/entities/race.entity';
import { RaceRegistration } from '../src/registrations/entities/race-registration.entity';
import { RaceResult } from '../src/results/entities/race-result.entity';
import { CompetitorStandingsQueryDto } from '../src/standings/dto/standings-query.dto';
import { StandingsService } from '../src/standings/standings.service';
import { TeamMember } from '../src/teams/entities/team-member.entity';
import { Team } from '../src/teams/entities/team.entity';
import { UserProfile } from '../src/users/entities/user-profile.entity';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';

describe('Reproducible demonstration seed (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error('Seed E2E tests require DATABASE_NAME ending in _test');
    }

    const testingModule: TestingModule = await createAuthenticatedTestingModule(
      {
        sub: 'demo-seed-e2e-subject',
        username: 'demo-seed-e2e',
      },
    );
    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();
    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => truncateDatabase());

  afterAll(async () => {
    if (dataSource) await truncateDatabase();
    if (app) await app.close();
  });

  it('creates the complete domain dataset and remains idempotent', async () => {
    const firstSummary = await seedDemoData(dataSource);
    const secondSummary = await seedDemoData(dataSource);

    expect(firstSummary).toEqual({
      competitors: 9,
      teams: 2,
      teamMembers: 6,
      races: 3,
      registrations: 5,
      results: 5,
      userProfiles: 0,
    });
    expect(secondSummary).toEqual(firstSummary);

    const competitors = dataSource.getRepository(Competitor);
    expect(await competitors.count()).toBe(9);
    expect(await competitors.countBy({ type: CompetitorType.DWARF })).toBe(5);
    expect(await competitors.countBy({ type: CompetitorType.CAMEL })).toBe(2);
    expect(await competitors.countBy({ type: CompetitorType.MEDIUM })).toBe(2);
    expect(await dataSource.getRepository(Team).count()).toBe(2);
    expect(await dataSource.getRepository(TeamMember).count()).toBe(6);
    expect(await dataSource.getRepository(UserProfile).count()).toBe(0);

    const races = dataSource.getRepository(Race);
    expect(await races.count()).toBe(3);
    for (const status of [
      RaceStatus.DRAFT,
      RaceStatus.OPEN_FOR_REGISTRATION,
      RaceStatus.COMPLETED,
    ]) {
      expect(await races.countBy({ status })).toBe(1);
    }

    const registrations = dataSource.getRepository(RaceRegistration);
    expect(
      await registrations.countBy({
        raceId: DEMO_SEED_IDS.races[2],
        status: RegistrationStatus.APPROVED,
      }),
    ).toBe(5);
    expect(
      await dataSource.getRepository(RaceResult).countBy({
        raceId: DEMO_SEED_IDS.races[2],
        status: ResultStatus.FINISHED,
      }),
    ).toBe(5);

    const standings = await app
      .get(StandingsService)
      .getCompetitors(new CompetitorStandingsQueryDto());
    expect(standings.items.map((entry) => entry.totalPoints)).toEqual([
      10, 7, 5, 3, 1,
    ]);
  });

  async function truncateDatabase(): Promise<void> {
    await dataSource.query(`
      TRUNCATE TABLE
        audit_logs, race_results, race_registrations, races, team_members,
        teams, competitors, user_profiles
      RESTART IDENTITY CASCADE
    `);
  }
});
