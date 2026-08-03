import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '../enums/app-role.enum';
import { RolesGuard } from './roles.guard';

function createContext(roles: AppRole[]): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user: { roles } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows a handler without role metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([]))).toBe(true);
  });

  it('allows any one of the declared roles', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([AppRole.RACE_ORGANIZER]))).toBe(
      true,
    );
  });

  it('denies an authenticated user without a declared role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AppRole.ADMINISTRATOR]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([AppRole.VIEWER]))).toBe(false);
  });
});
