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

- `backend/` and `frontend/` keep independent manifests, lockfiles, tests, and
  production images.
- The root Compose topology coordinates both applications with PostgreSQL and
  Keycloak without coupling their deployment artifacts.
- The frontend mirrors the public REST contract through browser-safe TypeScript
  types and does not import NestJS DTO classes or backend source.
