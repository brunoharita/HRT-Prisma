# ADR-008: Supabase domain read adapter for the authenticated web app

- Status: accepted
- Date: 2026-08-24
- Owners: product-engineering-security

## Context

The authenticated App Shell already validated identity and memberships, while Home and Pessoas still had no domain data runtime. The PostgreSQL schema and RLS policies were active in Prisma-QA, and the deterministic CLI still depended on the JSON repository.

## Decision

Use the Supabase Data API directly from the authenticated browser with the publishable key and the user's JWT, behind one typed `PrismaDataRepository` boundary. Every tenant-owned query includes the active `organization_id` explicitly, while RLS and persisted memberships remain the authorization authority.

The adapter is read-only for this movement and supports memberships, Home counts, Pessoas search/filter, structured profile composition, evidence, inference, competencies, and role-gated private contact. It never queries raw documents for profile rendering. Hiring Manager does not query private contact and remains denied by RLS on both `person_private_data` and `documents`.

Changing the active organization remounts the connected page subtree and invalidates pending page responses. A persisted organization identifier is accepted only while it belongs to the currently loaded memberships.

## Alternatives considered

- Scatter Supabase queries through React components. Rejected because it would duplicate authorization assumptions and make tenant review unreliable.
- Add a BFF before the first read-only slice. Deferred because current RLS already enforces the approved read contracts and no privileged mutation is required.
- Replace the JSON repository with Supabase. Rejected because deterministic CLI and golden validation remain an independent required surface.
- Add client-side mock fallback. Rejected because integration failure must remain visible and fail closed.

## Consequences

The authenticated web app now reads persisted domain data through one reviewable boundary. Browser queries still depend on Data API availability and valid RLS policies. Any future privileged mutation, export, document retrieval, audit flow, or server-only integration requires a backend boundary and a separate decision.

## Security and data impact

No schema, grant, policy, or migration changed. The browser contains no service role or secret key. Tenant filters improve predictability but never replace RLS. Profile decoding rejects unknown lifecycle values and invalid profile structure instead of manufacturing an empty valid profile.

## Validation

- web typecheck and production build;
- route, active-organization, and repository-boundary tests;
- connected QA data in two organizations;
- RLS tests for Admin, Recruiter, Hiring Manager, known cross-tenant IDs, and authenticated users without membership;
- authenticated browser validation when a QA session is available.

## References

`web/src/domain/prismaData.ts`, `web/src/infrastructure/supabase/`, `web/src/pages/`, `tests/webProtectedRoutes.test.ts`, ADR-002, ADR-006, ADR-007.
