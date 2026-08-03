import { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApplication } from '../src/configure-application';
import { UserProfile } from '../src/users/entities/user-profile.entity';
import { UserProfileStatus } from '../src/users/enums/user-profile-status.enum';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';

interface UserProfileBody {
  id: string;
  keycloakUserId: string;
  emailSnapshot: string | null;
  displayName: string;
  status: UserProfileStatus;
  createdAt: string;
  updatedAt: string;
}

describe('User profiles (e2e)', () => {
  const keycloakUserId = 'user-profile-e2e-subject';
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error('User E2E tests require DATABASE_NAME ending in _test');
    }

    const moduleFixture: TestingModule = await createAuthenticatedTestingModule(
      {
        sub: keycloakUserId,
        username: 'ordinary-e2e-user',
      },
    );
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE user_profiles RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.query(
        'TRUNCATE TABLE user_profiles RESTART IDENTITY CASCADE',
      );
    }
    if (app) await app.close();
  });

  it('lazily provisions and returns the current local profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .expect(200);
    const body = response.body as UserProfileBody;

    expect(body).toMatchObject({
      keycloakUserId,
      displayName: 'ordinary-e2e-user',
      emailSnapshot: null,
      status: UserProfileStatus.ACTIVE,
    });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('accessToken');
  });

  it('creates only one profile under concurrent first requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app.getHttpServer()).get('/api/v1/users/me'),
      ),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await dataSource.getRepository(UserProfile).count()).toBe(1);
  });

  it('allows profile inspection but blocks domain access when disabled', async () => {
    const provisioned = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .expect(200);
    const profile = provisioned.body as UserProfileBody;
    await dataSource.getRepository(UserProfile).update(profile.id, {
      status: UserProfileStatus.DISABLED,
    });

    const ownProfile = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .expect(200);
    expect((ownProfile.body as UserProfileBody).status).toBe(
      UserProfileStatus.DISABLED,
    );

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/competitors')
      .expect(403);
    expect(forbidden.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      message: 'User profile is disabled',
    });
  });
});
