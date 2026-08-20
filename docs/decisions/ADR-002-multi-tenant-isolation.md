# ADR-002: Multi-tenant isolation with PostgreSQL RLS

- Status: accepted
- Date: 2026-08-20
- Owners: security and data engineering

## Context

The pilot starts with one client but processes personal professional data and may evolve to SaaS.

## Problem

Choose an isolation strategy that avoids destructive future migration while remaining proportional to the pilot.

## Decision

Use a shared PostgreSQL database with `organization_id`, composite tenant foreign keys, indexed authorization columns, and RLS based on persisted organization membership and role.

## Alternatives considered

- Schema per tenant: visible separation but repeated migrations and operational complexity.
- Database per tenant: stronger physical boundary but disproportionate cost, provisioning, connection, backup, and observability burden.
- Application filtering only: rejected because it fails to enforce isolation at the data boundary.

## Reasons for the choice

RLS fits Supabase/PostgreSQL, centralizes migrations, supports the expected scale, and keeps access rules reviewable as SQL.

## Positive consequences

Defense in depth, lower operating cost, tenant integrity in relationships, and explicit per-role access.

## Negative consequences

Policy errors can expose data; RLS performance and recursion require careful testing.

## Risks

Cross-tenant leakage, overbroad grants, stale membership, privileged-function bypass, and policy/query performance.

## Mitigation

RLS on every public table, explicit grants, `TO authenticated`, tenant predicates, composite FKs, indexes, private helper function with restricted execution, negative tests, and QA role impersonation before rollout.

## Technical impact

All tenant records and queries include organization. The migration is production contract but not yet activated.

## Data impact

Tenant transfer is not implicit and requires an explicit audited operation. Backup and restore strategy remains to be defined before production.

## Security and LGPD impact

Reduces unauthorized cross-client access. Hiring managers cannot read raw documents or private contact data through current policies.

## AI impact

Retrieval, matching, embeddings, telemetry, and reprocessing must always scope by organization.

## Compatibility

Single-tenant pilot data uses the same tenant columns. Unknown organization or membership denies access.

## Validation strategy

Static migration tests now; local or remote Supabase RLS tests with at least two organizations and all roles before connected pilot.

## Review criterion

Review at material scale, regulatory isolation requirement, region separation, or tenant-specific backup need.

## Replacement criterion

Supersede only with migration plan, isolation evidence, rollback, cost model, and explicit approval.

## References

`data-model.md`, `authorization-model.md`, migration, Supabase RLS documentation.

## Change history

- 2026-08-20: accepted.
- 2026-08-20: expanded with validation and replacement criteria.
