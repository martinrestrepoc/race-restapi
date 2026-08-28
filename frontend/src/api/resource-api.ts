import type { ApiClient } from './api-client';
import type {
  AuditLog,
  AuditLogQuery,
  Competitor,
  CompetitorQuery,
  CompetitorStandingsQuery,
  CreateCompetitorInput,
  CreateRegistrationInput,
  CreateResultInput,
  CreateTeamInput,
  OverallStandings,
  PaginatedResponse,
  Race,
  RaceInput,
  RaceQuery,
  RaceResult,
  Registration,
  RegistrationQuery,
  ResultInput,
  ResultQuery,
  StandingsQuery,
  Team,
  TeamDetail,
  TeamMember,
  TeamQuery,
  TeamStanding,
  TeamStandingsQuery,
  CompetitorStanding,
  UpdateCompetitorInput,
  UpdateTeamInput,
  UserProfile,
  UserProfileQuery,
  UserProfileStatus,
  CompetitorStatus,
  RaceStatus,
  TeamStatus,
} from './domain.types';

export function createResourceApi(client: ApiClient) {
  return {
    audit: {
      detail: (id: string, signal?: AbortSignal) =>
        client.get<AuditLog>(`audit-logs/${id}`, { signal }),
      list: (query: AuditLogQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<AuditLog>>('audit-logs', {
          query,
          signal,
        }),
    },
    competitors: {
      create: (input: CreateCompetitorInput) =>
        client.post<Competitor>('competitors', input),
      detail: (id: string, signal?: AbortSignal) =>
        client.get<Competitor>(`competitors/${id}`, { signal }),
      list: (query: CompetitorQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<Competitor>>('competitors', {
          query,
          signal,
        }),
      remove: (id: string) => client.delete(`competitors/${id}`),
      update: (id: string, input: UpdateCompetitorInput) =>
        client.put<Competitor>(`competitors/${id}`, input),
      updateStatus: (id: string, status: CompetitorStatus) =>
        client.patch<Competitor>(`competitors/${id}/status`, { status }),
    },
    races: {
      create: (input: RaceInput) => client.post<Race>('races', input),
      detail: (id: string, signal?: AbortSignal) =>
        client.get<Race>(`races/${id}`, { signal }),
      list: (query: RaceQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<Race>>('races', { query, signal }),
      remove: (id: string) => client.delete(`races/${id}`),
      update: (id: string, input: RaceInput) =>
        client.put<Race>(`races/${id}`, input),
      updateStatus: (id: string, status: RaceStatus, reason?: string) =>
        client.patch<Race>(`races/${id}/status`, {
          status,
          ...(reason === undefined ? {} : { reason }),
        }),
    },
    registrations: {
      approve: (id: string, startingPosition: number) =>
        client.patch<Registration>(`registrations/${id}/approve`, {
          startingPosition,
        }),
      cancel: (id: string) => client.delete(`registrations/${id}`),
      create: (raceId: string, input: CreateRegistrationInput) =>
        client.post<Registration>(`races/${raceId}/registrations`, input),
      detail: (id: string, signal?: AbortSignal) =>
        client.get<Registration>(`registrations/${id}`, { signal }),
      list: (
        raceId: string,
        query: RegistrationQuery = {},
        signal?: AbortSignal,
      ) =>
        client.get<PaginatedResponse<Registration>>(
          `races/${raceId}/registrations`,
          {
            query,
            signal,
          },
        ),
      reject: (id: string, reason: string) =>
        client.patch<Registration>(`registrations/${id}/reject`, { reason }),
    },
    results: {
      create: (raceId: string, input: CreateResultInput) =>
        client.post<RaceResult>(`races/${raceId}/results`, input),
      detail: (id: string, signal?: AbortSignal) =>
        client.get<RaceResult>(`results/${id}`, { signal }),
      list: (raceId: string, query: ResultQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<RaceResult>>(`races/${raceId}/results`, {
          query,
          signal,
        }),
      update: (id: string, input: ResultInput) =>
        client.put<RaceResult>(`results/${id}`, input),
    },
    standings: {
      competitors: (
        query: CompetitorStandingsQuery = {},
        signal?: AbortSignal,
      ) =>
        client.get<PaginatedResponse<CompetitorStanding>>(
          'standings/competitors',
          {
            query,
            signal,
          },
        ),
      overall: (query: StandingsQuery = {}, signal?: AbortSignal) =>
        client.get<OverallStandings>('standings', { query, signal }),
      teams: (query: TeamStandingsQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<TeamStanding>>('standings/teams', {
          query,
          signal,
        }),
    },
    teams: {
      addMember: (teamId: string, competitorId: string) =>
        client.post<TeamMember>(`teams/${teamId}/members/${competitorId}`),
      create: (input: CreateTeamInput) => client.post<Team>('teams', input),
      detail: (id: string, signal?: AbortSignal) =>
        client.get<TeamDetail>(`teams/${id}`, { signal }),
      list: (query: TeamQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<Team>>('teams', { query, signal }),
      remove: (id: string) => client.delete(`teams/${id}`),
      removeMember: (teamId: string, competitorId: string) =>
        client.delete(`teams/${teamId}/members/${competitorId}`),
      update: (id: string, input: UpdateTeamInput) =>
        client.put<TeamDetail>(`teams/${id}`, input),
      updateStatus: (id: string, status: TeamStatus) =>
        client.patch<TeamDetail>(`teams/${id}/status`, { status }),
    },
    users: {
      detail: (id: string, signal?: AbortSignal) =>
        client.get<UserProfile>(`users/${id}`, { signal }),
      list: (query: UserProfileQuery = {}, signal?: AbortSignal) =>
        client.get<PaginatedResponse<UserProfile>>('users', { query, signal }),
      me: (signal?: AbortSignal) =>
        client.get<UserProfile>('users/me', { signal }),
      updateStatus: (id: string, status: UserProfileStatus) =>
        client.patch<UserProfile>(`users/${id}/status`, { status }),
    },
  };
}

export type ResourceApi = ReturnType<typeof createResourceApi>;
