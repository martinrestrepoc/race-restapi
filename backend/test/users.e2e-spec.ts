import { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApplication } from '../src/configure-application';
import { UserProfile } from '../src/users/entities/user-profile.entity';
import { UserProfileStatus } from '../src/users/enums/user-profile-status.enum';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';
import { AppRole } from '../src/auth/enums/app-role.enum';

interface UserProfileBody {
  id: string;
  keycloakUserId: string;
  emailSnapshot: string | null;
  displayName: string;
  status: UserProfileStatus;
  createdAt: string;
  updatedAt: string;
}

interface UserProfileListBody {
  items: UserProfileBody[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface AuditListBody {
  items: Array<{
    actorUserProfileId: string;
    action: string;
    entityId: string;
    previousValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
  }>;
  totalItems: number;
}

describe('User profiles (e2e)', () => {
  const keycloakUserId = 'user-profile-e2e-subject';
  let app: INestApplication<App>;
  let viewerApp: INestApplication<App>;
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

    const viewerModule = await createAuthenticatedTestingModule({
      sub: 'user-profile-viewer-e2e-subject',
      username: 'profile-viewer',
      roles: [AppRole.VIEWER],
    });
    viewerApp = viewerModule.createNestApplication();
    configureApplication(viewerApp);
    await viewerApp.init();
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
    if (viewerApp) await viewerApp.close();
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

  it('lets an administrator list, inspect and disable another profile', async () => {
    const administrator = (
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(200)
    ).body as UserProfileBody;
    const viewer = (
      await request(viewerApp.getHttpServer())
        .get('/api/v1/users/me')
        .expect(200)
    ).body as UserProfileBody;

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .query({
        status: UserProfileStatus.ACTIVE,
        sortBy: 'displayName',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      })
      .expect(200);
    const list = listResponse.body as UserProfileListBody;
    expect(list).toMatchObject({
      page: 1,
      limit: 10,
      totalItems: 2,
      totalPages: 1,
    });
    expect(list.items.map((profile) => profile.id)).toContain(viewer.id);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/users/${viewer.id}`)
      .expect(200);
    expect((detail.body as UserProfileBody).keycloakUserId).toBe(
      viewer.keycloakUserId,
    );

    const changed = await request(app.getHttpServer())
      .patch(`/api/v1/users/${viewer.id}/status`)
      .send({ status: UserProfileStatus.DISABLED })
      .expect(200);
    expect((changed.body as UserProfileBody).status).toBe(
      UserProfileStatus.DISABLED,
    );

    const auditResponse = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({
        action: 'USER_PROFILE_STATUS_CHANGED',
        entityId: viewer.id,
      })
      .expect(200);
    const audit = auditResponse.body as AuditListBody;
    expect(audit.totalItems).toBe(1);
    expect(audit.items[0]).toMatchObject({
      actorUserProfileId: administrator.id,
      entityId: viewer.id,
      previousValues: { status: UserProfileStatus.ACTIVE },
      newValues: { status: UserProfileStatus.DISABLED },
    });
  });

  it('prevents viewer administration and administrator self-disable', async () => {
    const administrator = (
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(200)
    ).body as UserProfileBody;

    await request(viewerApp.getHttpServer()).get('/api/v1/users').expect(403);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/users/${administrator.id}/status`)
      .send({ status: UserProfileStatus.DISABLED })
      .expect(409);
    expect(response.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'Administrators cannot disable their own active profile',
    });
  });
});
