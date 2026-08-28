import type {
  AuditLogQuery,
  CompetitorQuery,
  CompetitorStandingsQuery,
  RaceQuery,
  RegistrationQuery,
  ResultQuery,
  StandingsQuery,
  TeamQuery,
  TeamStandingsQuery,
  UserProfileQuery,
} from '@/api/domain.types';

export const queryKeys = {
  audit: {
    all: ['audit-logs'] as const,
    detail: (id: string) => ['audit-logs', 'detail', id] as const,
    list: (query: AuditLogQuery) => ['audit-logs', 'list', query] as const,
  },
  competitors: {
    all: ['competitors'] as const,
    detail: (id: string) => ['competitors', 'detail', id] as const,
    list: (query: CompetitorQuery) => ['competitors', 'list', query] as const,
  },
  races: {
    all: ['races'] as const,
    detail: (id: string) => ['races', 'detail', id] as const,
    list: (query: RaceQuery) => ['races', 'list', query] as const,
  },
  registrations: {
    all: ['registrations'] as const,
    detail: (id: string) => ['registrations', 'detail', id] as const,
    list: (raceId: string, query: RegistrationQuery) =>
      ['registrations', 'list', raceId, query] as const,
  },
  results: {
    all: ['results'] as const,
    detail: (id: string) => ['results', 'detail', id] as const,
    list: (raceId: string, query: ResultQuery) =>
      ['results', 'list', raceId, query] as const,
  },
  standings: {
    all: ['standings'] as const,
    competitors: (query: CompetitorStandingsQuery) =>
      ['standings', 'competitors', query] as const,
    overall: (query: StandingsQuery) =>
      ['standings', 'overall', query] as const,
    teams: (query: TeamStandingsQuery) =>
      ['standings', 'teams', query] as const,
  },
  teams: {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', 'detail', id] as const,
    list: (query: TeamQuery) => ['teams', 'list', query] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    list: (query: UserProfileQuery) => ['users', 'list', query] as const,
    me: ['users', 'me'] as const,
  },
} as const;
