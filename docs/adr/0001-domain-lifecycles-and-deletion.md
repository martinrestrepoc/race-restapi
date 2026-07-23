# ADR 0001: Domain Lifecycles and Deletion Semantics

- Status: Accepted
- Date: 2026-07-23

## Context

The initial requirements named several statuses but left their complete transition
graphs and delete-versus-deactivate behavior undefined. Those decisions affect the
REST contract, database constraints, service rules, and tests.

## Decision

### Competitors

Use `ACTIVE`, `SUSPENDED`, and `RETIRED`.

Allowed transitions are:

- `ACTIVE` -> `SUSPENDED`
- `SUSPENDED` -> `ACTIVE`
- `ACTIVE` -> `RETIRED`
- `SUSPENDED` -> `RETIRED`

`RETIRED` is terminal. A competitor with historical records is retired rather than
physically deleted.

### Teams

Use `ACTIVE` and `INACTIVE`, with transitions in both directions. An inactive team
preserves its history and cannot receive new active members or register for a race.
Team membership history uses `joinedAt` and nullable `leftAt`. A competitor can
have only one active team membership.

### Races

Use `DRAFT`, `OPEN_FOR_REGISTRATION`, `CLOSED`, `IN_PROGRESS`, `COMPLETED`, and
`CANCELLED`.

Allowed transitions are:

- `DRAFT` -> `OPEN_FOR_REGISTRATION`
- `DRAFT` -> `CANCELLED`
- `OPEN_FOR_REGISTRATION` -> `CLOSED`
- `OPEN_FOR_REGISTRATION` -> `CANCELLED`
- `CLOSED` -> `IN_PROGRESS`
- `CLOSED` -> `CANCELLED`
- `IN_PROGRESS` -> `COMPLETED`
- `IN_PROGRESS` -> `CANCELLED`

`COMPLETED` and `CANCELLED` are terminal. A race with registrations or results is
cancelled rather than physically deleted.

### Registrations

Use `PENDING`, `APPROVED`, `REJECTED`, and `CANCELLED`. New registrations start as
`PENDING`. Administrators and race organizers can approve or reject registrations.
Capacity and lane assignment are checked atomically at approval, and only approved
registrations consume capacity. `REJECTED` and `CANCELLED` are terminal.
Cancellation is possible only before registration closes. An approved registration
is cancelled rather than deleted.

A competitor cannot participate both individually and as a member of a registered
team in the same race.

### General deletion policy

Results are corrected, not deleted. Audit logs are append-only and have no update or
delete application endpoints.

## Consequences

- State changes require explicit transition operations and conflict responses.
- Database history must be retained for memberships, registrations, results, and
  audited entities.
- Approval must use a transaction and concurrency control around race capacity and
  lane assignment.
- The actor allowed to cancel a registration still needs an explicit product
  decision.
