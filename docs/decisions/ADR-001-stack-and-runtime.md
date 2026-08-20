# ADR-001: Stack and runtime foundation

- Status: accepted
- Date: 2026-08-20
- Owners: engineering

## Context

The repository began empty and required an executable, auditable proof without premature UI or distributed infrastructure.

## Problem

Choose the smallest stack that proves the domain and preserves a path to a connected pilot.

## Decision

Use strict TypeScript on Node.js, a technical CLI, native Node tests, provider interfaces, PostgreSQL/Supabase as production persistence contract, and a tenant-scoped JSON adapter for deterministic local execution.

## Alternatives considered

React/Vite first, Python, microservices, and a remote-only Supabase runtime. They added surface area, split the domain proof, or introduced external dependencies before the pilot need existed.

## Reasons for the choice

One language, small dependency set, reproducible tests, explicit contracts, and executable local validation.

## Positive consequences

The slice runs without credentials, LLM, Docker, or remote database and remains easy to audit.

## Negative consequences

No UI or production repository adapter exists. JSON persistence is not a production design.

## Risks

Local behavior may diverge from PostgreSQL and RLS if the connected adapter is delayed.

## Mitigation

Maintain migration contract tests and require QA database validation before pilot activation.

## Technical impact

Node 22+, pnpm, TypeScript, CLI, repository interface, migration, and local JSON storage.

## Data impact

Local demo files may contain representative source text and remain Git-ignored. Production data follows the PostgreSQL model.

## Security and LGPD impact

No real data is authorized for the local fixture flow. Production requires private storage, Auth, RLS validation, retention, and auditing.

## AI impact

AI is behind provider interfaces; the initial provider is deterministic and costs USD 0.

## Compatibility

Provider and repository adapters can be added without changing domain semantics. Unknown contract versions fail closed.

## Validation strategy

Lint, typecheck, unit tests, golden tests, migration checks, Context Pack check, build, and demo.

## Review criterion

Review when a UI, asynchronous processing, connected database, or production provider is approved.

## Replacement criterion

Supersede only with measured evidence that another stack materially reduces risk or total cost.

## References

`system-architecture.md`, `contracts.md`, `package.json`, `src`, `tests`.

## Change history

- 2026-08-20: accepted for Movimento 0.
- 2026-08-20: expanded to the canonical ADR format.
