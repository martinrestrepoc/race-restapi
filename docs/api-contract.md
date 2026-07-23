# REST API Contract

## Accepted Decisions

The accepted [Architecture Decision Records](adr/README.md) and
[implementation roadmap](roadmap.md) supersede earlier pending statements on the
same topic. Their acceptance does not imply implementation.

## Status and Scope

This is the proposed contract; no domain endpoints are currently implemented.
Business constraints remain authoritative in [Business rules](business-rules.md).
Identity and token endpoints belong to Keycloak, not this API.

## Base Path and Versioning

- Global prefix: `/api`
- Versioned base path: `/api/v1`
- Resources use plural, lower-case path segments.
- JSON properties use `camelCase`.
- Identifiers are opaque to clients; their concrete format is UUID v4.
- Breaking contract changes require a new API version.

## Authentication and Authorization

Protected requests send:

```http
Authorization: Bearer <keycloak-access-token>
```

NestJS validates the access token before extracting `sub` and roles. Required role
names are `ADMINISTRATOR`, `RACE_ORGANIZER`, and `VIEWER`. A higher-privilege role
must not be inferred solely from frontend behavior.

The role model below applies the minimum permissions from the specification:

- **Authenticated:** any validated required-role user.
- **Read:** all three roles, for public league information.
- **Admin:** `ADMINISTRATOR`.
- **Race management:** `ADMINISTRATOR` or `RACE_ORGANIZER`.

Resource-specific domain checks still apply after role checks.

## Keycloak-Owned Authentication Operations

The API does not expose local registration, login, or token-refresh operations.
Login, logout, registration when enabled, and refresh use Keycloak's OpenID Connect
endpoints and the frontend's Keycloak/OIDC client. A future administrator-facing
Keycloak facade would require a separate explicit requirement and threat review.

Application-facing profile operations may include:

| Method and path        | Purpose                                                          | Role          |
| ---------------------- | ---------------------------------------------------------------- | ------------- |
| `GET /api/v1/auth/me`  | Validated subject, effective roles, and relevant app permissions | Authenticated |
| `GET /api/v1/users/me` | Local `UserProfile`, if local profiles are adopted               | Authenticated |

Neither response may contain access/refresh tokens, passwords/hashes, client
secrets, or raw Keycloak administrative data. Whether both aliases are retained is
`Decision pending`; do not implement duplicate endpoints without a reason.

## HTTP Semantics

- `GET`: retrieve without changing domain state.
- `POST`: create a resource or subordinate operation.
- `PUT`: fully replace a resource when full replacement is meaningful.
- `PATCH`: partial update or explicit state transition.
- `DELETE`: physically delete when allowed or deactivate/cancel when the contract
  makes that behavior explicit.

Expected statuses:

| Status                      | Use                                                                       |
| --------------------------- | ------------------------------------------------------------------------- |
| `200 OK`                    | Successful retrieval, update, or action with a response body              |
| `201 Created`               | Resource created; include a `Location` header where practical             |
| `204 No Content`            | Successful deletion/action without a response body                        |
| `400 Bad Request`           | Malformed input, field validation, or invalid request shape               |
| `401 Unauthorized`          | Missing, malformed, expired, or otherwise invalid token                   |
| `403 Forbidden`             | Valid identity lacks required role/domain permission                      |
| `404 Not Found`             | Requested resource does not exist                                         |
| `409 Conflict`              | Uniqueness, transition, capacity, eligibility, or other business conflict |
| `422 Unprocessable Entity`  | `Decision pending` - use only if adopted consistently                     |
| `500 Internal Server Error` | Unexpected failure with no internal detail exposed                        |

If `422` is not explicitly adopted, domain validation/conflicts use `400` or `409`
according to whether the failure is input shape/field validity or current resource
state.

## Resource Endpoints

The tables define the proposed surface, not implemented behavior.

### Users

| Method and path                  | Purpose                                 | Minimum role  |
| -------------------------------- | --------------------------------------- | ------------- |
| `GET /api/v1/users/me`           | Read current local profile              | Authenticated |
| `GET /api/v1/users`              | List application-visible users          | Admin         |
| `GET /api/v1/users/:id`          | Read application-visible user profile   | Admin         |
| `PATCH /api/v1/users/:id/status` | Change local profile status, if adopted | Admin         |

The initial version has no Keycloak Admin API facade. Local profile statuses are
`ACTIVE` and `DISABLED`; an administrator may change local status.

### Competitors

| Method and path                        | Purpose                           | Minimum role |
| -------------------------------------- | --------------------------------- | ------------ |
| `POST /api/v1/competitors`             | Create competitor                 | Admin        |
| `GET /api/v1/competitors`              | Filtered/paginated list           | Read         |
| `GET /api/v1/competitors/:id`          | Competitor detail                 | Read         |
| `PUT /api/v1/competitors/:id`          | Full competitor update            | Admin        |
| `PATCH /api/v1/competitors/:id/status` | Status transition                 | Admin        |
| `DELETE /api/v1/competitors/:id`       | Delete when allowed or deactivate | Admin        |

Exact delete-versus-retire semantics must be explicit in implementation:
`Decision pending`.

### Teams

| Method and path                                      | Purpose                           | Minimum role |
| ---------------------------------------------------- | --------------------------------- | ------------ |
| `POST /api/v1/teams`                                 | Create team                       | Admin        |
| `GET /api/v1/teams`                                  | Filtered/paginated list           | Read         |
| `GET /api/v1/teams/:id`                              | Team detail                       | Read         |
| `PUT /api/v1/teams/:id`                              | Full team update                  | Admin        |
| `DELETE /api/v1/teams/:id`                           | Delete when allowed or deactivate | Admin        |
| `POST /api/v1/teams/:teamId/members/:competitorId`   | Add member                        | Admin        |
| `DELETE /api/v1/teams/:teamId/members/:competitorId` | Remove/end membership             | Admin        |

### Races

| Method and path                  | Purpose                          | Minimum role    |
| -------------------------------- | -------------------------------- | --------------- |
| `POST /api/v1/races`             | Create race                      | Race management |
| `GET /api/v1/races`              | Filtered/paginated list          | Read            |
| `GET /api/v1/races/:id`          | Race detail                      | Read            |
| `PUT /api/v1/races/:id`          | Full update when editable        | Race management |
| `PATCH /api/v1/races/:id/status` | Valid status transition          | Race management |
| `DELETE /api/v1/races/:id`       | Delete or cancel where permitted | Race management |

The body for status transitions contains only the target `status` and optional
reason. Allowed transitions are defined in ADR 0001.

### Registrations

| Method and path                            | Purpose                      | Minimum role    |
| ------------------------------------------ | ---------------------------- | --------------- |
| `POST /api/v1/races/:raceId/registrations` | Register competitor or team  | Race management |
| `GET /api/v1/races/:raceId/registrations`  | List race registrations      | Race management |
| `GET /api/v1/registrations/:id`            | Registration detail          | Race management |
| `PATCH /api/v1/registrations/:id/approve`  | Approve pending registration | Race management |
| `PATCH /api/v1/registrations/:id/reject`   | Reject with clear reason     | Race management |
| `DELETE /api/v1/registrations/:id`         | Cancel/remove as permitted   | Race management |

Whether viewers may read public registration lists is `Decision pending`; minimum
permissions do not explicitly grant that access.

### Results and Standings

| Method and path                      | Purpose                    | Minimum role    |
| ------------------------------------ | -------------------------- | --------------- |
| `POST /api/v1/races/:raceId/results` | Record result              | Race management |
| `GET /api/v1/races/:raceId/results`  | List race results          | Read            |
| `GET /api/v1/results/:id`            | Result detail              | Read            |
| `PUT /api/v1/results/:id`            | Update result consistently | Race management |
| `GET /api/v1/standings`              | Overall standings          | Read            |
| `GET /api/v1/standings/competitors`  | Competitor standings       | Read            |
| `GET /api/v1/standings/teams`        | Team standings             | Read            |

Administrators and race organizers may correct results after completion with audit
and standings recalculation.

### Audit

| Method and path              | Purpose                            | Minimum role |
| ---------------------------- | ---------------------------------- | ------------ |
| `GET /api/v1/audit-logs`     | Filter/paginate complete audit log | Admin        |
| `GET /api/v1/audit-logs/:id` | Audit entry detail                 | Admin        |

Audit mutation endpoints are not proposed because audit records should not normally
be client-editable.

## Collection Queries

Use a shared collection convention:

```text
?page=1&limit=20&sortBy=name&sortOrder=asc
```

- `page` is one-based.
- `limit` must be positive.
- `sortOrder` is `asc` or `desc`.
- Each resource allowlists valid `sortBy` fields.
- Filters use named query fields relevant to that resource, for example
  `status`, `type`, or a text search term.
- Unknown sort/filter fields return `400` rather than being interpolated into SQL.
- Filtering, pagination, and sorting are mandatory for competitor lists and should
  be applied consistently to other potentially large collections.
- The default page size and maximum allowed `limit` are `Decision pending`.

A proposed response envelope:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

Whether empty results use `totalPages: 0` or `1` is `Decision pending`.

## Dates, Times, and Measurements

- API date-times use ISO 8601 strings with an explicit UTC offset, preferably UTC
  `Z`, for example `2026-08-15T14:30:00.000Z`.
- Calendar dates use `YYYY-MM-DD`.
- The server compares race/deadline timestamps using one documented clock/time-zone
  strategy; storage should use UTC-compatible timestamps.
- Time zone for user-entered race schedules and display conversion is
  `Decision pending`.
- Distance is expressed in meters.
- Weight is kilograms, height is centimeters, and raw/penalty/final time is integer milliseconds and
  must be encoded in field names or documented unambiguously before implementation.

## Success Representations

- Response DTOs expose only the public contract.
- Entity relations are embedded or linked only when required for that endpoint.
- `POST` returns the created representation unless the operation intentionally
  returns `204`.
- `DELETE` returns `204` when no response body is needed.
- Statistics derived from results must be consistent with official results.

## Error Representation

All errors use a stable top-level shape:

```json
{
  "timestamp": "2026-08-15T14:30:00.000Z",
  "statusCode": 404,
  "error": "Not Found",
  "message": "Competitor with ID 45 was not found",
  "path": "/api/v1/competitors/45"
}
```

Field validation adds structured details:

```json
{
  "timestamp": "2026-08-15T14:30:00.000Z",
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "path": "/api/v1/competitors",
  "details": [
    {
      "field": "weight",
      "message": "weight must be a positive number"
    }
  ]
}
```

- **Validation:** `400`, stable field paths and understandable messages.
- **Authentication:** `401`, no token-validation internals.
- **Authorization:** `403`, no role/token internals beyond a safe message.
- **Missing resources:** `404`.
- **Business conflicts:** `409`, for nickname/registration/position uniqueness,
  capacity, eligibility, and invalid state transitions.
- **Internal errors:** `500` with a generic client message; detailed server logs are
  redacted and never included in the response.

Raw stack traces, SQL messages, JWKS failures, tokens, and secrets must never appear
in an API response.
