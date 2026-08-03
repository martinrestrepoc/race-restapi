import { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppRole } from '../src/auth/enums/app-role.enum';
import { configureApplication } from '../src/configure-application';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';

interface AuditLogBody {
  id: string;
  actorUserProfileId: string;
  action: string;
  entityType: string;
  entityId: string;
  newValues: Record<string, unknown> | null;
}

interface AuditLogListBody {
  items: AuditLogBody[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface ProfileBody {
  id: string;
}

describe('Audit logs (e2e)', () => {
  let administratorApp: INestApplication<App>;
  let viewerApp: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error('Audit E2E tests require DATABASE_NAME ending in _test');
    }

    const administratorModule: TestingModule =
      await createAuthenticatedTestingModule({
        sub: 'audit-administrator-e2e-subject',
        username: 'audit-administrator',
      });
    administratorApp = administratorModule.createNestApplication();
    configureApplication(administratorApp);
    await administratorApp.init();
    dataSource = administratorApp.get(DataSource);
    await dataSource.runMigrations();

    const viewerModule = await createAuthenticatedTestingModule({
      sub: 'audit-viewer-e2e-subject',
      username: 'audit-viewer',
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
    if (administratorApp) await administratorApp.close();
  });

  it('returns filtered, paginated audit entries to an administrator', async () => {
    const profileResponse = await request(administratorApp.getHttpServer())
      .get('/api/v1/users/me')
      .expect(200);
    const profile = profileResponse.body as ProfileBody;

    const response = await request(administratorApp.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ action: 'user_profile_created', page: 1, limit: 10 })
      .expect(200);
    const body = response.body as AuditLogListBody;

    expect(body).toMatchObject({
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
    });
    const entry = body.items[0];
    expect(entry).toMatchObject({
      actorUserProfileId: profile.id,
      action: 'USER_PROFILE_CREATED',
      entityType: 'USER_PROFILE',
      entityId: profile.id,
      newValues: {
        displayName: 'audit-administrator',
        status: 'ACTIVE',
      },
    });

    const detail = await request(administratorApp.getHttpServer())
      .get(`/api/v1/audit-logs/${entry.id}`)
      .expect(200);
    expect(detail.body).toEqual(entry);
  });

  it('rejects a viewer from the complete audit log', async () => {
    await request(viewerApp.getHttpServer())
      .get('/api/v1/audit-logs')
      .expect(403);
  });
});
