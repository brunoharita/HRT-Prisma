# Architectural Decision Records

ADRs record durable decisions that would be costly or risky to reconstruct from code alone. Cosmetic, local, and easily reversible implementation details do not require ADRs.

## Status values

`proposed`, `accepted`, `rejected`, `superseded`, `deprecated`.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR-001](ADR-001-stack-and-runtime.md) | accepted | TypeScript CLI foundation and local JSON execution |
| [ADR-002](ADR-002-multi-tenant-isolation.md) | accepted | Shared PostgreSQL with organization-scoped RLS |
| [ADR-003](ADR-003-ai-provider-boundary.md) | accepted | AI provider decoupled from domain and persistence |
| [ADR-004](ADR-004-ai-artifact-versioning.md) | accepted | Version prompts, models, rules and evaluation artifacts |
| [ADR-005](ADR-005-canonical-ai-context.md) | accepted | Five canonical AI context sources plus generated export |
| [ADR-006](ADR-006-supabase-authenticated-web-shell.md) | accepted | Isolated local web shell with Supabase Auth and route guards |

## Rules

- Start from `ADR-000-template.md`.
- Never edit an accepted decision to hide history. Amend the history or supersede it.
- Reference code, migrations, contracts, tests, and rollout evidence separately.
- Accepted does not mean implemented or active; each ADR states its evidence and environment.
