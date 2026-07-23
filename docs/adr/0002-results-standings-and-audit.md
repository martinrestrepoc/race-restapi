# ADR 0002: Results, Standings, and Audit

- Status: Accepted
- Date: 2026-07-23

## Context

The original model did not define result correction after completion, standings
tie-breakers, or whether stored counters or race results were authoritative.

## Decision

Result types are `FINISHED`, `DID_NOT_START`, `DID_NOT_FINISH`, and
`DISQUALIFIED`.

- A finished result requires a raw time and unique finishing position.
- Store raw time, penalty time, and final time in integer or bigint milliseconds.
- The winner is the participant with the lowest final time.
- Non-finish and disqualified results receive zero points.
- A completed race makes its results official.
- An administrator or race organizer may correct a result after completion.
- Every correction is atomic, creates an audit event, and recalculates standings.
- Results are corrected rather than deleted.

`RaceResult` is the source of truth for points and standings. Competitor and team
statistics are initially derived from official results instead of duplicated
counters.

Individual standings are ordered by:

1. Total points
2. Wins
3. Second places
4. Completed races
5. Best final time

Team standings include only results where the team itself was the registered race
participant. Results of individual members are not automatically aggregated into
the team.

Audit records cover entity creation and update, state transitions, membership
changes, registration decisions/cancellations, and result creation/correction.
Only administrators may query audit logs. Keycloak login events are not imported in
the initial version.

## Consequences

- Standings can always be rebuilt from official results.
- Result corrections need a transaction and deterministic recalculation.
- Existing persistence fields for victories, defeats, and completed-race counters
  must be removed from the target model or marked as future projections.
- The official points table remains pending until the source PDF is available and
  verified.
- The formula relating raw, penalty, and final time and the handling of equal final
  times remain pending.
