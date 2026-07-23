# Business Rules

These constraints are independent of UI and implementation details. They preserve
the explicit academic rules without filling gaps by assumption.

## Users

- Keycloak is the canonical owner of user identities, credentials, sessions, and
  authorization roles.
- A local user profile must not contain passwords, password hashes, access tokens,
  or refresh tokens.
- A local user profile, when used, is resolved by the validated Keycloak `sub`
  claim rather than by email.
- Only an `ADMINISTRATOR` may manage local profile status. Keycloak user management
  is outside the initial API scope.
- Only an `ADMINISTRATOR` may view the complete audit log.
- A `RACE_ORGANIZER` may manage races, registrations, and results and may view
  competitors and teams.
- A `VIEWER` may only read public information, schedules, results, and standings.
- Authentication failure returns `401`; insufficient permission for an
  authenticated user returns `403`.

- Keycloak roles are API client roles.
- Local profiles are provisioned lazily using the validated `sub` claim.
- Local profile statuses are `ACTIVE` and `DISABLED`.
- A `DISABLED` local profile cannot perform domain operations even when its
  Keycloak token is valid.
- NestJS does not manage Keycloak users through the Admin API in the initial
  version.

## Competitors

- A competitor name must not be empty.
- A competitor weight must be greater than zero.
- A competitor height must be greater than zero.
- A competitor nickname must be unique.
- A competitor type must be one of `DWARF`, `CAMEL`, `MEDIUM`, or `OTHER`.
- A competitor's classification must match its actual approved competitor type.
- Only an `ACTIVE` competitor may register for a new race.
- A competitor with historical records must not be physically deleted; the
  competitor must be retired.
- A competitor may belong to at most one active team at a time.
- The same competitor must not be added to the same team more than once.

### Competitor Status Transitions

Statuses are `ACTIVE`, `SUSPENDED`, and `RETIRED`. Allowed transitions are
`ACTIVE` -> `SUSPENDED`, `SUSPENDED` -> `ACTIVE`, `ACTIVE` ->
`RETIRED`, and `SUSPENDED` -> `RETIRED`. `RETIRED` is terminal.

## Teams

- A team name must be unique.
- A team must contain at least one competitor before it enters a race.
- A competitor cannot belong to more than one active team at the same time.
- An inactive team cannot enter a race or receive new active members.
- A competitor cannot be added to the same team twice.
- A team with official race history must not be physically deleted; it must be
  deactivated.
- Team membership must not exceed the configured maximum.
- All team members must be eligible when the team is registered for a race.

### Team Status Transitions

Statuses are `ACTIVE` and `INACTIVE`, with transitions allowed in both
directions. Inactive teams preserve history. Active membership uses a null
`leftAt`; ending membership sets `leftAt` rather than deleting the record.

## Races

- Race distance in meters must be greater than zero.
- A race must not be created with a scheduled start in the past.
- The registration deadline must be earlier than the race start time.
- A completed race must not be edited.
- A cancelled race must not accept registrations.
- At least two valid participants are required to start a race.
- Approved participation must not exceed the race capacity.
- A race must not be completed without official results.
- A completed race must not transition to `DRAFT`.
- Registration is permitted only when the race is `OPEN_FOR_REGISTRATION` and the
  current time is before its registration deadline.
- Race participation mode must match `INDIVIDUAL`, `TEAM`, or `MIXED` race type.

### Race Status Transitions

Statuses are `DRAFT`, `OPEN_FOR_REGISTRATION`, `CLOSED`, `IN_PROGRESS`,
`COMPLETED`, and `CANCELLED`.

Allowed transitions are:

- `DRAFT` -> `OPEN_FOR_REGISTRATION` or `CANCELLED`
- `OPEN_FOR_REGISTRATION` -> `CLOSED` or `CANCELLED`
- `CLOSED` -> `IN_PROGRESS` or `CANCELLED`
- `IN_PROGRESS` -> `COMPLETED` or `CANCELLED`

`COMPLETED` and `CANCELLED` are terminal.

## Registrations

- A registration is allowed only while the race is open and before its deadline.
- A competitor or team must not be registered more than once in the same race.
- Every individual competitor and every member of a registered team must be
  eligible.
- A participant must not compete both individually and as a team member in the
  same race.
- An individual registration is valid only for a compatible race type.
- A team registration is valid only for a compatible race type.
- Assigned lane or starting position must be unique within the race.
- A rejected registration must include a clear rejection reason.
- Only approved registrations may receive results.
- Capacity and lane assignment are validated atomically at approval.
- Only approved registrations consume capacity.
- Cancellation is allowed only before registration closes.

### Registration Status Transitions

New registrations start as `PENDING`. Administrators and race organizers may
transition `PENDING` to `APPROVED` or `REJECTED`; rejection requires a reason.
A nonterminal registration may become `CANCELLED` only before registration closes.
`REJECTED` and `CANCELLED` are terminal. The cancellation actor and exact source
states remain `Decision pending`.

## Results

- Result types are `FINISHED`, `DID_NOT_START`, `DID_NOT_FINISH`, and
  `DISQUALIFIED`.
- Results require an approved registration and may initially be entered only during
  `IN_PROGRESS`.
- A finished result requires positive raw time and a unique finishing position.
- Raw, penalty, and final time use integer milliseconds.
- The winner has the lowest final time; a disqualified participant cannot win.
- Completing a race makes its results official.
- Administrators and race organizers may correct official results after completion.
- Corrections are audited and standings are recalculated atomically.
- Results are corrected rather than deleted.
- `RaceResult` is authoritative; statistics are derived rather than stored.

## Standings

- The official points table remains `Decision pending` until the academic source
  PDF is available and verified.
- `DID_NOT_START`, `DID_NOT_FINISH`, and `DISQUALIFIED` award zero points.
- Standings use official results only.
- Individual order is total points, wins, second places, completed races, then best
  final time.
- Team standings use only races where the team was directly registered.
- The final-time formula and handling of equal final times remain pending.

## Audit Logs

- Important actions must be auditable, including user creation, competitor changes,
  race cancellation, registration decisions, and result modifications.
- Keycloak login events are not imported in the initial version.
- An audit entry identifies the actor, action, affected entity type and identifier,
  and timestamp.
- Previous and new values may be recorded when appropriate.
- Only administrators may view the complete audit log.
- Audit records must not contain credentials, access tokens, refresh tokens, client
  secrets, or other protected values.

Audit logs are append-only and have no application update/delete endpoints. Their
retention duration remains `Decision pending`.
