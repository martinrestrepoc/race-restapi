# Evaluation Checklist

Use this as the practical readiness and grading checklist. Evaluation percentages
are intentionally maintained only here.

## Evaluation Weights

| Criterion                                              |   Weight |
| ------------------------------------------------------ | -------: |
| Functional requirements and business rules             |      22% |
| Graphical user interface and user experience           |      15% |
| API design and code organization                       |      13% |
| Authentication and authorization                       |      15% |
| Database design and persistence                        |      10% |
| Docker and execution environment                       |      10% |
| Automated testing                                      |       8% |
| Documentation, GitHub workflow, and team participation |       4% |
| Final demonstration and explanation                    |       3% |
| **Total**                                              | **100%** |

## Functional Requirements and Business Rules

- [ ] Competitor, team, race, registration, result, standings, user-profile, and
      audit capabilities satisfy [Project requirements](project-requirements.md).
- [ ] All rules in [Business rules](business-rules.md) are enforced in backend code.
- [ ] Filtering, pagination, and sorting work where mandatory.
- [ ] Race lifecycle, eligibility, deadlines, capacity, duplicate prevention, and
      official results are enforced.
- [ ] Statistics and standings remain consistent after result changes.
- [ ] The required initial demonstration data can be reproduced.
- [ ] Undefined rules are resolved and documented before implementation.

## Graphical Interface and User Experience

- [ ] A separate graphical frontend consumes the NestJS API.
- [ ] The frontend never accesses PostgreSQL directly.
- [ ] Login, dashboard, competitor, team, race, registration, result, standings,
      profile/logout, access-denied, and not-found screens exist.
- [ ] The main workflow can be completed through the UI without Postman.
- [ ] Loading, success, empty, validation-error, general-error, and authorization
      states are visible and understandable.
- [ ] Forms provide field labels and field-level validation feedback.
- [ ] Destructive actions require confirmation.
- [ ] Role-inappropriate controls are hidden/disabled without replacing backend
      authorization.
- [ ] Navigation, typography, contrast, and keyboard interaction are usable.

## API Design and Code Organization

- [ ] The API uses the documented `/api/v1` contract.
- [ ] Controllers are thin and contain no business logic.
- [ ] Services own business rules and transaction boundaries.
- [ ] DTOs are separate from TypeORM entities.
- [ ] Response models prevent accidental entity/internal-field exposure.
- [ ] Methods, status codes, pagination, sorting, filtering, date formats, and JSON
      naming are consistent.
- [ ] Error responses follow the documented contract.
- [ ] No raw stack trace or infrastructure detail is returned.
- [ ] No empty architectural layers or trivial repository wrappers exist.

## Authentication and Authorization

- [ ] Keycloak starts correctly with persistent storage.
- [ ] A dedicated project realm can be reproduced from reviewed configuration.
- [ ] The frontend uses Authorization Code Flow with PKCE.
- [ ] Keycloak issues the access tokens accepted by the API.
- [ ] NestJS validates signature, issuer, expiration, and configured audience.
- [ ] The required `ADMINISTRATOR`, `RACE_ORGANIZER`, and `VIEWER` roles exist.
- [ ] Backend guards enforce required roles.
- [ ] Domain services enforce resource-specific authorization.
- [ ] Missing/invalid authentication returns `401`.
- [ ] Insufficient permission returns `403`.
- [ ] No frontend-supplied role is trusted.
- [ ] No local password authentication or custom application JWT issuance exists.
- [ ] The application stores no password/hash, access token, or refresh token.

## Database Design and Persistence

- [ ] PostgreSQL stores application-domain data.
- [ ] Keycloak-owned credentials and sessions are not duplicated in the application
      database.
- [ ] Primary keys, foreign keys, unique constraints, nullability, indexes, and
      referential integrity are defined.
- [ ] TypeORM entities match the reviewed conceptual model.
- [ ] TypeORM migrations are available and reviewed.
- [ ] Production does not use `synchronize: true`.
- [ ] Seeds are separate from migrations and contain no credentials.
- [ ] The application database uses a named persistent volume.
- [ ] Data remains after service/container restart.
- [ ] Multi-step and concurrency-sensitive writes are atomic.

## Docker and Execution Environment

- [ ] Dockerfiles exist for the backend and separate frontend.
- [ ] Docker Compose includes frontend, NestJS API, PostgreSQL, Keycloak, and
      persistent Keycloak storage.
- [ ] The services use an isolated Docker network.
- [ ] Ports and environment variables are documented.
- [ ] Practical health checks and startup dependencies are configured.
- [ ] Containers become healthy.
- [ ] PostgreSQL application data persists after restarts.
- [ ] Keycloak configuration and database state persist after restarts.
- [ ] No real credential is embedded in an image or Compose file.
- [ ] The full solution starts with the documented one-command flow.

## Automated Testing

- [ ] At least the 15 mandatory scenarios in [Testing](testing.md) pass.
- [ ] Tests are meaningful and do not focus on getters/setters.
- [ ] Unit tests cover service rules and transitions.
- [ ] Integration tests use isolated PostgreSQL and actual migrations.
- [ ] E2E tests exercise the REST API with Supertest.
- [ ] Security tests cover invalid/expired/wrong-issuer/wrong-audience/valid tokens.
- [ ] Authorization tests do not bypass role guards.
- [ ] Tests distinguish `401` from `403`.
- [ ] Tests do not use production PostgreSQL or production Keycloak.
- [ ] Test state is isolated and independent of execution order.

## Documentation, GitHub, and Team

- [ ] `README.md` documents verified installation, configuration, ports, Docker,
      migrations, seeds, tests, roles, limitations, and demo data.
- [ ] The entity-relationship diagram matches the implementation.
- [ ] Security, API, testing, architecture, and business-rule documents are current.
- [ ] A non-secret `.env.example` exists.
- [ ] No secret or credential is committed.
- [ ] A Postman or Insomnia collection verifies the API independently of the UI.
- [ ] Git history contains meaningful contributions from every team member.
- [ ] Branches and pull requests show a reviewable workflow.
- [ ] All team members understand the architecture and main application flow.

## Final Demonstration

- [ ] The video lasts 8-12 minutes and all team members participate.
- [ ] Login and role restrictions are shown.
- [ ] A competitor and team are created.
- [ ] A race is created and participants are registered.
- [ ] Results are recorded and standings update.
- [ ] At least two handled errors are demonstrated.
- [ ] The graphical interface performs the main workflow.
- [ ] Running/healthy containers are shown.
- [ ] Automated tests are shown executing.
- [ ] The demonstration explains behavior rather than merely reading slides.

## Critical Incomplete Conditions

The project risks being considered incomplete if any condition below is true:

- [ ] The project does not run.
- [ ] The graphical interface is missing or cannot complete the main workflow.
- [ ] The frontend accesses PostgreSQL directly.
- [ ] PostgreSQL data is not persistent.
- [ ] The application is not dockerized.
- [ ] Keycloak authentication or backend role enforcement is missing.
- [ ] Required business rules exist only in documentation/slides and not code.
- [ ] Errors expose raw stack traces.
- [ ] The repository contains passwords, secrets, or tokens.
- [ ] There are no meaningful automated tests.
- [ ] Only one team member understands the application.
- [ ] The application only works in one team member's undocumented local
      environment.

Before submission, every box in this critical section must remain unchecked because
each box describes a failure condition.

## Current Repository Baseline

At documentation creation time:

- [x] A minimal NestJS starter builds and has starter tests.
- [x] npm, ESLint, and Prettier configuration exist.
- [ ] Domain implementation exists.
- [ ] TypeORM/PostgreSQL configuration exists.
- [ ] Migrations and seeds exist.
- [ ] Keycloak integration/realm configuration exists.
- [ ] Docker/Compose configuration exists.
- [ ] The separate frontend exists or is linked.
- [ ] Domain/security/database test coverage exists.

This baseline is informational and must be updated as implementation progresses.
