import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/auth/enums/app-role.enum';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../src/auth/interfaces/authenticated-request.interface';

interface AuthenticatedTestingOptions {
  roles?: AppRole[];
  sub?: string;
  username?: string;
  email?: string;
}

export async function createAuthenticatedTestingModule(
  options: AuthenticatedTestingOptions = {},
): Promise<TestingModule> {
  const roles = options.roles ?? [AppRole.ADMINISTRATOR];
  const sub = options.sub ?? randomUUID();
  const authenticatedGuard: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      request.user = {
        sub,
        username: options.username ?? 'ordinary-e2e-user',
        email: options.email,
        roles,
      };
      return true;
    },
  };

  return Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(JwtAuthGuard)
    .useValue(authenticatedGuard)
    .compile();
}
