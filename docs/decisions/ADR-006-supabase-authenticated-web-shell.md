# ADR-006: Isolated local web shell with Supabase Auth and route guards

- Status: accepted
- Date: 2026-08-23
- Owners: engineering-security

## Context

The repository already had a production persistence contract in Supabase with RLS and role semantics, but no runnable UI or runtime Auth surface. The user asked for Supabase Auth and protected routes while preserving the existing architecture and without weakening the domain or CLI proof.

## Problem

How to add a local application surface that validates Supabase sessions and protects navigation paths without turning the frontend into the source of authorization truth or coupling the domain slice to browser concerns.

## Decision

Add an isolated Vite-based web shell under `web/` that uses `@supabase/supabase-js` in the browser, validates the current session with `supabase.auth.getClaims()`, reads the current user's `organization_memberships` through RLS, and applies fail-closed protected routes for session, membership, and role. Keep the CLI/domain flow untouched and keep authorization authority in the database contract and future backend surfaces.

## Alternatives considered

- Add React and a larger frontend stack immediately. Rejected because the repository had no UI foundation and the requested scope was Auth plus protected routes, not a full product UI.
- Add Auth directly inside the CLI/runtime path. Rejected because it would mix browser/session concerns into the executable proof that is intentionally deterministic and local.
- Wait for a full HTTP API/BFF before any UI. Rejected because the user explicitly requested local Auth and protected routes now.

## Reasons for the choice

This isolates the new surface, preserves the current contracts, minimizes dependencies, keeps session validation aligned with current Supabase guidance around `getClaims()`, and proves fail-closed browser navigation without pretending that frontend guards replace RLS or privileged backend checks.

## Positive consequences

- Local web entrypoint now exists for Auth and route protection.
- Domain, CLI, tests, and migration contract remain intact.
- Supabase session and membership behavior are explicit and testable.

## Negative consequences

- The repository now has two runtime surfaces: CLI and browser shell.
- There is still no connected domain data adapter, API, or QA environment.
- Static hosting of path-based routes will still require an SPA fallback when deployment is approved later.

## Risks

- Frontend-only route protection may be mistaken for full authorization.
- A valid Supabase session without membership can confuse operators if the failure mode is not explicit.
- Future UI work could bypass the isolated shell boundary and couple directly to domain internals.

## Mitigation

- Document that the shell is not the authorization authority.
- Fail closed to `/sign-in`, `/access-denied`, and `/unauthorized`.
- Keep role logic in a shared pure module with targeted tests.

## Technical impact

Adds `vite` and `@supabase/supabase-js`, new `web/` sources, root scripts for web build/typecheck, and a protected-route unit test. No database migration or runtime domain code was changed.

## Data impact

No schema change. The shell reads only session claims and `organization_memberships` for the authenticated user. It does not create or mutate talent-domain records.

## Security and LGPD impact

The browser uses only the publishable key. Session validation uses `getClaims()`. Role and tenant context still come from persisted memberships under RLS. No service key, raw document access, or additional PII exposure was introduced.

## AI impact

No prompt, model, extraction, inference, or matching behavior changed.

## Compatibility

Backward compatibility is preserved for the CLI and tests. Unknown or missing session/membership state fails closed. The shell remains optional until a connected environment is provisioned.

## Validation strategy

Run `pnpm run typecheck`, `pnpm run typecheck:web`, `pnpm run build:web`, the affected tests including `tests/webProtectedRoutes.test.ts`, regenerate the Context Pack, and complete `pnpm run validate`.

## Review criterion

Reassess when a BFF/API, connected Supabase runtime adapter, SSR framework, or remote QA environment is approved.

## Replacement criterion

Supersede only with an accepted ADR that defines the next UI/runtime boundary, migration path, security controls, validation evidence, and rollback plan.

## References

`web/src/main.tsx`, `web/src/app/PrismaApplication.tsx`, `web/src/shared/access.ts`, `tests/webProtectedRoutes.test.ts`, `docs/security/authorization-model.md`, `docs/architecture/system-architecture.md`, `docs/ai-context/PRISMA_CURRENT_STATE.md`, ADR-001, ADR-002, ADR-007.

## Change history

- 2026-08-23: accepted.
