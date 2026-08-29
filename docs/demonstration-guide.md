# Demonstration Guide

This guide prepares the required 8–12 minute team demonstration. It uses the
graphical interface for the business workflow; Postman is supporting contract
evidence only.

## Safe preflight

From the repository root:

```bash
docker compose up -d --build
docker compose ps
```

Confirm that `postgres`, `keycloak`, `backend`, and `frontend` are healthy. Open:

- Frontend: `http://localhost:5173`
- Keycloak: `http://localhost:8080`
- API root through the frontend proxy: `http://localhost:5173/api/v1`

Use the three demo usernames documented in the root README. Read passwords from
the ignored root `.env` before recording; never show that file, a token, browser
storage, an authorization header, or the Keycloak administration password on
screen.

Choose a unique suffix such as the demonstration date for newly created names and
nicknames. Use a race start several days in the future and a registration deadline
at least one day before it.

## Suggested 10-minute sequence

| Time       | Presenter | Evidence to show                                                                                                                              |
| ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:45  | Member 1  | Product objective, four healthy containers, persistent PostgreSQL volume, and public URLs.                                                    |
| 0:45–1:30  | Member 1  | Branded Keycloak login, PKCE boundary, administrator profile, and role-aware navigation.                                                      |
| 1:30–2:15  | Member 2  | Viewer read-only navigation and denied mutation route; explain that backend guards remain authoritative.                                      |
| 2:15–3:30  | Member 2  | Administrator creates two eligible competitors, creates a team, and adds one competitor as an active member.                                  |
| 3:30–4:10  | Member 2  | Handled error 1: submit an empty required field and show field message plus focused invalid control.                                          |
| 4:10–5:10  | Member 3  | Create a future `MIXED` race with capacity at least two, then transition it to `OPEN_FOR_REGISTRATION`.                                       |
| 5:10–6:15  | Member 3  | Register the team and the second competitor; approve the first at starting position 1.                                                        |
| 6:15–6:55  | Member 3  | Handled error 2: attempt starting position 1 again, show the backend `409`, preserve input, then approve at position 2.                       |
| 6:55–8:05  | Member 1  | Close registration, start the race, record two finished results, and complete the race. Explain backend-owned final time and lifecycle rules. |
| 8:05–9:00  | Member 1  | Show updated individual/team standings and the immutable administrator audit detail for the completed transition.                             |
| 9:00–10:00 | All       | Show automated test summaries, architecture boundaries, known limitations, and each member's contribution.                                    |

## Exact main workflow

1. Log in as `race-admin`.
2. Demonstrate client-side required-field validation on the competitor form.
3. Create competitor A as `DWARF` and competitor B as `CAMEL`; both must be
   `ACTIVE`.
4. Create an active team and add competitor A.
5. Create a future `MIXED` race with capacity `4` and a valid earlier deadline.
6. Transition `DRAFT` → `OPEN_FOR_REGISTRATION`.
7. Register the team and competitor B. Do not register competitor A individually,
   because the backend correctly prevents simultaneous individual/team entry.
8. Approve the team at starting position `1`.
9. Try to approve competitor B at `1`; explain the authoritative conflict, then
   use `2`.
10. Transition to `CLOSED` and then `IN_PROGRESS`.
11. Record two `FINISHED` results. Give position `1` the lowest final time.
12. Transition to `COMPLETED`.
13. Verify competitor and team standings.
14. Filter audit events by the race ID and open the newest
    `RACE_STATUS_CHANGED` detail.

This same sequence is automated in
`frontend/tests/e2e/main-workflow.spec.ts`, providing a deterministic recovery
path if a manual demonstration mistake occurs.

## Role evidence

- `race-admin`: all modules, local profile administration, and audit reads.
- `race-organizer`: race, registration, and result management; read-only access to
  competitors and teams; no user administration or complete audit access.
- `race-viewer`: read-only league information; no mutation routes or controls.

Frontend route gates and hidden controls improve usability. The demonstration
must explicitly state that NestJS token, active-profile, and role guards provide
the security boundary.

## Test evidence

Show concise summaries rather than waiting through every suite during the video:

```bash
cd frontend
npm test
npm run test:e2e
```

Backend unit, security, and isolated PostgreSQL E2E commands are documented in
`docs/testing.md`. Do not run backend E2E against the development database.

## Recovery and troubleshooting

- If a port is occupied, inspect it before changing configuration. When changing
  the frontend port, keep `FRONTEND_HOST_PORT`, `FRONTEND_PUBLIC_URL`, and the
  persisted Keycloak client's redirect URI/web origin aligned.
- If the theme or redirect origin looks stale, remember that realm import does not
  overwrite a realm already stored in PostgreSQL. Apply the change in Keycloak or
  reset local volumes only if losing all local data is acceptable.
- If a service is unhealthy, run `docker compose logs <service>` and fix that
  service instead of bypassing health checks.
- If the browser has stale assets, hard-refresh; `index.html` is non-cacheable and
  hashed assets are immutable.
- `docker compose down` preserves data. `docker compose down -v` destroys both
  application and Keycloak database state and must never be used casually.

## Final recording checklist

- Keep the recording between 8 and 12 minutes.
- Every team member speaks and explains a responsibility they understand.
- Show login, role restrictions, the complete UI workflow, two handled errors,
  healthy containers, and automated-test evidence.
- Explain architecture and business behavior; do not merely read slides.
- Do not expose credentials, tokens, `.env`, private browser data, or personal
  notifications.
