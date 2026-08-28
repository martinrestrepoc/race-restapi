import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from './query-keys';

export type ResourceName =
  | 'audit'
  | 'competitors'
  | 'races'
  | 'registrations'
  | 'results'
  | 'standings'
  | 'teams'
  | 'users';

const resourceRoots: Record<ResourceName, QueryKey> = {
  audit: queryKeys.audit.all,
  competitors: queryKeys.competitors.all,
  races: queryKeys.races.all,
  registrations: queryKeys.registrations.all,
  results: queryKeys.results.all,
  standings: queryKeys.standings.all,
  teams: queryKeys.teams.all,
  users: queryKeys.users.all,
};

export async function invalidateResources(
  queryClient: QueryClient,
  resources: readonly ResourceName[],
): Promise<void> {
  await Promise.all(
    resources.map((resource) =>
      queryClient.invalidateQueries({ queryKey: resourceRoots[resource] }),
    ),
  );
}

export const mutationInvalidation = {
  competitor: ['competitors', 'standings', 'audit'],
  race: ['races', 'registrations', 'results', 'standings', 'audit'],
  registration: ['registrations', 'races', 'results', 'audit'],
  result: ['results', 'races', 'standings', 'audit'],
  team: ['teams', 'competitors', 'standings', 'audit'],
  user: ['users', 'audit'],
} as const satisfies Record<string, readonly ResourceName[]>;
