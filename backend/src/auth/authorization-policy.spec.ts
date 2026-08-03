import { ROLES_KEY } from './decorators/roles.decorator';
import { APP_ROLES, AppRole } from './enums/app-role.enum';
import { CompetitorsController } from '../competitors/competitors.controller';
import { TeamsController } from '../teams/teams.controller';
import { RacesController } from '../races/races.controller';
import { RegistrationsController } from '../registrations/registrations.controller';
import { ResultsController } from '../results/results.controller';
import { AuditController } from '../audit/audit.controller';
import { UsersController } from '../users/users.controller';

function controllerRoles(controller: object): AppRole[] | undefined {
  return Reflect.getMetadata(ROLES_KEY, controller) as AppRole[] | undefined;
}

function handlerRoles<T extends object, K extends keyof T>(
  prototype: T,
  handlerName: K,
): AppRole[] | undefined {
  const handler = prototype[handlerName];
  if (typeof handler !== 'function') {
    throw new Error(
      `Expected ${String(handlerName)} to be a controller method`,
    );
  }

  return Reflect.getMetadata(ROLES_KEY, handler) as AppRole[] | undefined;
}

describe('Domain authorization policies', () => {
  const readRoles = APP_ROLES;
  const administrator = [AppRole.ADMINISTRATOR];
  const raceManagement = [AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER];

  it('allows reading competitors but restricts mutations to administrators', () => {
    const prototype = CompetitorsController.prototype;

    expect(controllerRoles(CompetitorsController)).toEqual(readRoles);
    expect(handlerRoles(prototype, 'findAll')).toBeUndefined();
    expect(handlerRoles(prototype, 'create')).toEqual(administrator);
    expect(handlerRoles(prototype, 'update')).toEqual(administrator);
    expect(handlerRoles(prototype, 'updateStatus')).toEqual(administrator);
    expect(handlerRoles(prototype, 'remove')).toEqual(administrator);
  });

  it('allows reading teams but restricts team and membership changes to administrators', () => {
    const prototype = TeamsController.prototype;

    expect(controllerRoles(TeamsController)).toEqual(readRoles);
    expect(handlerRoles(prototype, 'findOne')).toBeUndefined();
    expect(handlerRoles(prototype, 'create')).toEqual(administrator);
    expect(handlerRoles(prototype, 'addMember')).toEqual(administrator);
    expect(handlerRoles(prototype, 'removeMember')).toEqual(administrator);
  });

  it('allows reading races and lets administrators or organizers manage them', () => {
    const prototype = RacesController.prototype;

    expect(controllerRoles(RacesController)).toEqual(readRoles);
    expect(handlerRoles(prototype, 'findAll')).toBeUndefined();
    expect(handlerRoles(prototype, 'create')).toEqual(raceManagement);
    expect(handlerRoles(prototype, 'update')).toEqual(raceManagement);
    expect(handlerRoles(prototype, 'updateStatus')).toEqual(raceManagement);
    expect(handlerRoles(prototype, 'remove')).toEqual(raceManagement);
  });

  it('restricts all registration workflows to race management', () => {
    const prototype = RegistrationsController.prototype;

    expect(controllerRoles(RegistrationsController)).toEqual(raceManagement);
    expect(handlerRoles(prototype, 'create')).toBeUndefined();
    expect(handlerRoles(prototype, 'findAllForRace')).toBeUndefined();
    expect(handlerRoles(prototype, 'approve')).toBeUndefined();
    expect(handlerRoles(prototype, 'cancel')).toBeUndefined();
  });

  it('allows reading results and restricts writes to race management', () => {
    const prototype = ResultsController.prototype;

    expect(controllerRoles(ResultsController)).toEqual(readRoles);
    expect(handlerRoles(prototype, 'findAllForRace')).toBeUndefined();
    expect(handlerRoles(prototype, 'findOne')).toBeUndefined();
    expect(handlerRoles(prototype, 'create')).toEqual(raceManagement);
    expect(handlerRoles(prototype, 'update')).toEqual(raceManagement);
  });

  it('restricts complete audit-log access to administrators', () => {
    expect(controllerRoles(AuditController)).toEqual(administrator);
  });

  it('allows own-profile reads but restricts profile administration', () => {
    const prototype = UsersController.prototype;

    expect(controllerRoles(UsersController)).toEqual(readRoles);
    expect(handlerRoles(prototype, 'getMe')).toBeUndefined();
    expect(handlerRoles(prototype, 'findAll')).toEqual(administrator);
    expect(handlerRoles(prototype, 'findOne')).toEqual(administrator);
    expect(handlerRoles(prototype, 'updateStatus')).toEqual(administrator);
  });
});
