# ADR 0006: Frontend and Repository Layout

- Status: Accepted
- Date: 2026-07-23

## Decision

Use React, TypeScript, Vite, `keycloak-js`, and React Router.

Keep backend and frontend as separate applications in one repository:

```text
backend/
frontend/
```

The frontend authenticates directly with Keycloak using Authorization Code Flow
with PKCE and calls the backend REST API with a bearer access token. It never
connects to PostgreSQL.

## Consequences

- The current NestJS starter at the repository root must be moved into `backend/`
  in a later implementation phase.
- Root-level scripts or workspace configuration will eventually coordinate both
  applications without coupling their deployment artifacts.
- The move is not part of this documentation-only change.
