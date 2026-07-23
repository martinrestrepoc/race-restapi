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
- Only an `ADMINISTRATOR` may manage users.
- Only an `ADMINISTRATOR` may view the complete audit log.
- A `RACE_ORGANIZER` may manage races, registrations, and results and may view
  competitors and teams.
- A `VIEWER` may only read public information, schedules, results, and standings.
- Authentication failure returns `401`; insufficient permission for an
  authenticated user returns `403`.

Local profile status values and transitions are `Decision pending`.

## Competitors

- A competitor name must not be empty.
- A competitor weight must be greater than zero.
- A competitor height must be greater than zero.
- A competitor nickname must be unique.
- A competitor type must be one of `DWARF`, `CAMEL`, `MEDIUM`, or `OTHER`.
- A competitor's classification must match its actual approved competitor type.
- Only an `ACTIVE` competitor may register for a new race.
- A competitor with official results must not be physically deleted; the competitor
  must be retired or deactivated.
- A competitor may belong to at most one active team at a time.
- The same competitor must not be added to the same team more than once.

### Competitor Status Transitions

Defined statuses: `ACTIVE`, `INJURED`, `SUSPENDED`, `RETIRED`.

**Valid transitions explicitly defined by the specification**

- A competitor with official results may be moved to `RETIRED` instead of being
  physically deleted.

**Forbidden transitions or effects explicitly defined**

- A competitor not in `ACTIVE` status cannot register for a new race.
- A competitor with official results cannot be physically deleted.

**Undefined transitions**

`Decision pending` - the specification does not define the complete transition graph,
whether `RETIRED` is terminal, or whether injured/suspended competitors can return
to `ACTIVE`.

## Teams

- A team name must be unique.
- A team must contain at least one competitor before it enters a race.
- A competitor cannot belong to more than one active team at the same time.
- A suspended team cannot enter a race.
- A competitor cannot be added to the same team twice.
- A team with official race history must not be physically deleted; it must be
  deactivated.
- Team membership must not exceed the configured maximum.
- All team members must be eligible when the team is registered for a race.

### Team Status Transitions

**Valid transitions explicitly defined**

- A team with official race history may be deactivated instead of being deleted.

**Forbidden transitions or effects explicitly defined**

- A suspended team cannot enter a race.
- A team with official race history cannot be physically deleted.

**Undefined transitions**

`Decision pending` - the specification refers to active, suspended, and deactivated
teams but does not define a `TeamStatus` enumeration or a complete lifecycle.

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

Defined statuses: `DRAFT`, `OPEN_FOR_REGISTRATION`,
`CLOSED_FOR_REGISTRATION`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

**Valid transitions explicitly established by prerequisites**

- `OPEN_FOR_REGISTRATION` may move to a state where registration is closed.
- A race must be `IN_PROGRESS` before results can be entered.
- An `IN_PROGRESS` race may become `COMPLETED` only when official results exist.
- A race may become `CANCELLED`; once cancelled it cannot receive registrations.

These statements define ordering constraints, not a complete list of direct
transitions.

**Forbidden transitions explicitly defined**

- `COMPLETED` -> `DRAFT`.
- Any transition or edit that makes a completed race editable.
- Any registration operation while the race is `CANCELLED`.

**Undefined transitions**

`Decision pending` - allowed direct transitions, cancellation sources, reopening,
rollback behavior, and whether `COMPLETED`/`CANCELLED` are terminal are not fully
defined.

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
- Registration must not cause race capacity to be exceeded.

### Registration Status Transitions

Defined statuses: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

**Valid transitions explicitly implied by named operations**

- `PENDING` -> `APPROVED`.
- `PENDING` -> `REJECTED`, with a reason.
- A registration may become `CANCELLED`.

**Forbidden transitions explicitly defined**

- No additional status-to-status prohibition is explicit.

**Undefined transitions**

`Decision pending` - who may cancel, cancellation source statuses, whether decisions
can be reversed, and whether rejected/cancelled states are terminal are not defined.

## Results

- Results may be entered only while the race is `IN_PROGRESS`.
- Only approved registered participants may receive results.
- A participant must not have multiple official results for the same race.
- Final positions among normally finished participants must be unique.
- Completion time must be greater than zero.
- A `DISQUALIFIED` participant must not be the winner.
- A race may have only one official winner.
- Result updates must update victories, defeats, completed-race counts, and
  standings consistently.
- A recorded completion time must not imply that the participant finished before
  the race began.
- A race cannot become `COMPLETED` without official results.

### Result Status

Defined statuses: `FINISHED`, `DISQUALIFIED`, `DID_NOT_FINISH`,
`DID_NOT_START`.

These values describe outcomes rather than a lifecycle.

**Valid transitions**

`Decision pending` - the specification permits result updates but defines no
status-transition graph.

**Forbidden transitions or outcomes explicitly defined**

- A `DISQUALIFIED` result cannot hold the winning position.
- Two results cannot both be the official winner.
- Two normal finishers cannot share a final position.

**Undefined transitions**

`Decision pending` - correction/officialization rules, permitted changes after race
completion, and result versioning are not defined.

## Standings

- A first-place finish awards 10 points.
- A second-place finish awards 7 points.
- A third-place finish awards 5 points.
- A fourth-place finish awards 3 points.
- A fifth-place finish awards 1 point.
- A `DID_NOT_FINISH` result awards 0 points.
- A `DISQUALIFIED` result awards 0 points.
- Standings and stored statistics must remain consistent after result updates.

`Decision pending` - points for `DID_NOT_START`, tie-breaking, penalty-time
calculation, team aggregation, and whether standings include unofficial results are
not defined.

## Audit Logs

- Important actions must be auditable, including user creation, competitor changes,
  race cancellation, registration decisions, and result modifications.
- Login activity must be auditable to the extent available through the adopted
  Keycloak/application event integration.
- An audit entry identifies the actor, action, affected entity type and identifier,
  and timestamp.
- Previous and new values may be recorded when appropriate.
- Only administrators may view the complete audit log.
- Audit records must not contain credentials, access tokens, refresh tokens, client
  secrets, or other protected values.

Audit-log retention, immutability, redaction, and the exact Keycloak event ingestion
mechanism are `Decision pending`.
