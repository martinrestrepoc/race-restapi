import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const collection = JSON.parse(
  readFileSync(join(directory, 'project-api.postman_collection.json'), 'utf8'),
);
const environment = JSON.parse(
  readFileSync(join(directory, 'local.postman_environment.json'), 'utf8'),
);

const requests = [];
visit(collection.item);

const implementedEndpoints = [
  ['GET', ''],
  ['GET', '/auth/me'],
  ['GET', '/users/me'],
  ['GET', '/users'],
  ['GET', '/users/{{currentUserProfileId}}'],
  ['PATCH', '/users/{{currentUserProfileId}}/status'],
  ['POST', '/competitors'],
  ['GET', '/competitors'],
  ['GET', '/competitors/{{competitorId}}'],
  ['PUT', '/competitors/{{competitorId}}'],
  ['PATCH', '/competitors/{{competitorId}}/status'],
  ['DELETE', '/competitors/{{competitorDeleteId}}'],
  ['POST', '/teams'],
  ['GET', '/teams'],
  ['GET', '/teams/{{teamId}}'],
  ['PUT', '/teams/{{teamId}}'],
  ['PATCH', '/teams/{{teamId}}/status'],
  ['DELETE', '/teams/{{teamDeleteId}}'],
  ['POST', '/teams/{{teamId}}/members/{{teamMemberCompetitorId}}'],
  ['DELETE', '/teams/{{teamId}}/members/{{teamMemberCompetitorId}}'],
  ['POST', '/races'],
  ['GET', '/races'],
  ['GET', '/races/{{raceId}}'],
  ['PUT', '/races/{{raceId}}'],
  ['PATCH', '/races/{{raceId}}/status'],
  ['DELETE', '/races/{{raceDeleteId}}'],
  ['POST', '/races/{{raceId}}/registrations'],
  ['GET', '/races/{{raceId}}/registrations'],
  ['GET', '/registrations/{{firstRegistrationId}}'],
  ['PATCH', '/registrations/{{firstRegistrationId}}/approve'],
  ['PATCH', '/registrations/{{rejectRegistrationId}}/reject'],
  ['DELETE', '/registrations/{{cancelRegistrationId}}'],
  ['POST', '/races/{{raceId}}/results'],
  ['GET', '/races/{{raceId}}/results'],
  ['GET', '/results/{{firstResultId}}'],
  ['PUT', '/results/{{secondResultId}}'],
  ['GET', '/standings'],
  ['GET', '/standings/competitors'],
  ['GET', '/standings/teams'],
  ['GET', '/audit-logs'],
  ['GET', '/audit-logs/{{auditLogId}}'],
];

for (const [method, path] of implementedEndpoints) {
  if (!requests.some((request) => request.method === method && request.path === path)) {
    throw new Error(`Missing Postman coverage for ${method} ${path || '/'}`);
  }
}

for (const request of requests) {
  const hasStatusPrefix = /^\[\d{3}\]/.test(request.name);
  const hasOwnTests = request.events.some((event) => event.listen === 'test');
  if (!hasStatusPrefix && !hasOwnTests) {
    throw new Error(`Request has no status prefix or specific tests: ${request.name}`);
  }
}

for (const tokenKey of [
  'administratorAccessToken',
  'organizerAccessToken',
  'viewerAccessToken',
]) {
  const variable = environment.values.find((entry) => entry.key === tokenKey);
  if (!variable || variable.value !== '' || variable.type !== 'secret') {
    throw new Error(`${tokenKey} must be an empty secret environment value`);
  }
}

process.stdout.write(
  `Postman collection valid: ${requests.length} requests cover ${implementedEndpoints.length} endpoints.\n`,
);

function visit(items = []) {
  for (const item of items) {
    if (item.request) {
      const rawUrl =
        typeof item.request.url === 'string'
          ? item.request.url
          : item.request.url?.raw ?? '';
      requests.push({
        name: item.name,
        method: item.request.method,
        path: rawUrl.replace('{{baseUrl}}', '').split('?')[0],
        events: item.event ?? [],
      });
    }
    visit(item.item);
  }
}
