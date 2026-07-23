# Project Requirements

## Context and Objective

The system manages a fictional Camel vs. Dwarf Racing League. It must provide a
secure NestJS REST API, a separate graphical frontend, persistent PostgreSQL data,
role-based workflows through Keycloak, reliable validation and errors, automated
tests, and a reproducible Docker Compose environment.

Requirements are classified below as **Mandatory**, **Recommended**, or **Optional**.
Business constraints are authoritative in [Business rules](business-rules.md).

## Authentication and Security

### Mandatory

- Keycloak manages user accounts, credentials, authentication, login/logout
  sessions, account recovery, and token issuance.
- The frontend starts an OpenID Connect Authorization Code Flow with PKCE.
- Keycloak issues expiring JWT access tokens.
- The frontend sends the access token to protected NestJS endpoints.
- NestJS validates the Keycloak token and applies backend role authorization.
- The backend does not manage passwords and exposes no local login, registration,
  or refresh-token replacement for Keycloak.
- The system provides these roles and minimum permissions:

| Role             | Minimum permissions                                                                |
| ---------------- | ---------------------------------------------------------------------------------- |
| `ADMINISTRATOR`  | Manage users, competitors, teams, races, registrations, results, and audit records |
| `RACE_ORGANIZER` | Manage races, registrations, and results; view competitors and teams               |
| `VIEWER`         | Read public information, schedules, results, and standings only                    |

- Missing or invalid authentication returns `401 Unauthorized`.
- Authenticated users without permission receive `403 Forbidden`.
- The graphical client protects routes and actions, without replacing backend
  enforcement.
- Passwords, tokens, credentials, and secrets are never returned by the API or
  committed to Git.
- Sensitive configuration uses protected environment-based configuration.

## User Management

### Mandatory

- Administrators can manage application users within the scope allowed by the
  adopted Keycloak administration design.
- The application may maintain a local `UserProfile` keyed by the Keycloak `sub`
  claim for domain references and audit attribution.
- Keycloak remains the owner of credentials, sessions, and roles.
- The system provides a current-user profile/logout experience in the frontend.
- Minimum initial identity data includes one administrator, one organizer, and one
  viewer, provisioned reproducibly through Keycloak rather than domain seeds.

The exact administrative user-management API and realm provisioning mechanism are
`Decision pending`.

## Competitor Management

### Mandatory

- Create, retrieve, update, filter, sort, paginate, and delete or deactivate
  competitors according to domain rules.
- Store identifier, name, unique nickname, competitor type, date of birth or
  approximate age, positive weight, positive height, origin, status, registration
  date, optional team association, victories, defeats, and completed-race count.
- Support `DWARF`, `CAMEL`, `MEDIUM`, and `OTHER` competitor types.
- Support `ACTIVE`, `INJURED`, `SUSPENDED`, and `RETIRED` statuses.
- Enforce every competitor rule in [Business rules](business-rules.md).

## Team Management

### Mandatory

- Create, retrieve, update, and delete or deactivate teams.
- Add and remove team members.
- Store identifier, unique name, description, creation date, status, coach or
  responsible person, members, victories, and defeats.
- Make the maximum number of team members configurable.
- Enforce membership, eligibility, history, and duplicate rules.

Team status values and their complete lifecycle are `Decision pending`.

## Race Management

### Mandatory

- Create, retrieve, update, filter, sort, paginate, delete, and transition races.
- Store identifier, name, description, scheduled time, start and finish locations,
  positive distance in meters, capacity, type, status, organizer, registration
  deadline, creation timestamp, and last-modification timestamp.
- Support `INDIVIDUAL`, `TEAM`, and `MIXED` race types.
- Support `DRAFT`, `OPEN_FOR_REGISTRATION`, `CLOSED_FOR_REGISTRATION`,
  `IN_PROGRESS`, `COMPLETED`, and `CANCELLED` statuses.
- Enforce scheduling, deadline, minimum-participant, capacity, editing, and
  completion rules.

## Race Registration

### Mandatory

- Register an eligible competitor or team in a race and list race registrations.
- Retrieve, approve, reject, and cancel or delete registrations.
- Store identifier, race, competitor or team, registration timestamp, status,
  assigned lane/starting position, validation notes, and acting user.
- Support `PENDING`, `APPROVED`, `REJECTED`, and `CANCELLED` statuses.
- Enforce open-window, deadline, duplicate, eligibility, participation-mode,
  race-type, and starting-position rules.
- Require a clear reason for rejection.

## Results and Standings

### Mandatory

- Record, retrieve, and update results for registered participants.
- Store race, participant, starting position, final position, completion time,
  penalty time, status, notes, recorder, and recording timestamp.
- Support `FINISHED`, `DISQUALIFIED`, `DID_NOT_FINISH`, and `DID_NOT_START`
  result statuses.
- Enforce race status, approved-registration, time, unique-position, and single
  winner rules.
- Update competitor/team statistics consistently when results change.
- Provide overall, competitor, and team standings.
- Apply this scoring table:

| Outcome        | Points |
| -------------- | -----: |
| First          |     10 |
| Second         |      7 |
| Third          |      5 |
| Fourth         |      3 |
| Fifth          |      1 |
| Did not finish |      0 |
| Disqualified   |      0 |

The treatment of `DID_NOT_START` and penalty time in ranking/points is
`Decision pending`.

## Graphical User Interface

### Mandatory

- Provide a functional frontend that consumes the NestJS API and never accesses
  PostgreSQL directly.
- Provide login, dashboard, competitor list/detail/form, team list/detail/member
  management, race list/detail/form, registration management, result entry,
  standings, user profile/logout, access-denied, and not-found screens.
- The dashboard summarizes upcoming races, active competitors, and recent results.
- Search, filters, pagination, and relevant detail views are available.
- Users can complete the main demonstration flow without Postman.
- Show field-level validation, understandable API errors, loading states, useful
  empty states, success/failure notifications, and destructive-action confirmation.
- Hide or disable unauthorized visible actions while retaining backend enforcement.
- Avoid exposing stack traces, secrets, or unnecessary internal identifiers.
- Use consistent navigation, hierarchy, readable typography, sufficient contrast,
  and labels for all fields.
- Web forms are keyboard accessible.

### Recommended

- Responsive behavior for a web frontend.
- Frontend tests for success, validation-error, and authorization-failure behavior.

The frontend technology and repository location are `Decision pending`.

## Audit Log

### Mandatory

- Record important actions including authentication events available to the
  application, user creation, competitor changes, race cancellation, registration
  decisions, and result modifications.
- Each record contains an identifier, actor, action, entity type, entity identifier,
  timestamp, and optional description/previous/new values.
- Only administrators can view the complete audit log.
- Audit data must not contain credentials, tokens, or other secrets.

How Keycloak login events are imported or correlated with the application audit log
is `Decision pending`.

## Cross-Cutting Non-Functional Requirements

### Mandatory

- Follow modular layered NestJS architecture; controllers contain no business logic.
- Separate API DTOs from TypeORM persistence entities.
- Provide consistent REST methods, status codes, JSON naming, and errors.
- Validate input, identifiers, transitions, permissions, and cross-entity rules in
  the backend.
- Use PostgreSQL with referential integrity, constraints, indexes, and persistent
  named storage.
- Use TypeORM and migrations for schema evolution.
- Provide an entity-relationship diagram.
- Provide at least 15 meaningful automated tests.
- Containerize the API, database, frontend, Keycloak, and persistent identity
  storage. The complete target solution starts with Docker Compose.
- Use Git/GitHub with meaningful contributions, branches, and pull requests.
- Deliver an API verification collection, technical documentation, and an 8-12
  minute team demonstration covering the required workflow.
- The demonstration shows role restrictions, two handled errors, running
  containers, and automated tests; every team member participates.

### Recommended

- Health checks for services.
- Branches for focused features and review through pull requests.
- A coherent UI rather than disconnected pages.

## Initial Demonstration Data

### Mandatory

- One administrator, one race organizer, and one viewer in Keycloak.
- Five dwarf competitors, two camel competitors, and two medium competitors.
- Two teams.
- Three races in different statuses.
- At least one completed race with official results.

Domain sample data belongs in seeds; identities belong in reproducible Keycloak
configuration. Passwords must not be placed in application seeds.

## Deliverables

### Mandatory

- Complete GitHub repository.
- Dockerized backend, database, Keycloak, and graphical frontend.
- Entity-relationship diagram.
- Postman or Insomnia API collection.
- Technical documentation covering architecture, data, security, interface,
  business rules, tests, and Docker.
- An 8-12 minute demonstration video with all team members.

## Optional or Bonus Features

- CI with automatic tests and Docker image builds
- Cloud deployment
- Email notifications
- Live race updates with WebSockets
- Redis caching
- Rate limiting
- Testcontainers
- CSV or PDF result export
- Competitor profile images
- Metrics and observability
- Soft delete
- Optimistic locking
- Idempotency keys

Keycloak already owns refresh tokens for its authentication flow; the backend must
not implement application-owned refresh tokens. Optional features never compensate
for missing mandatory requirements.
