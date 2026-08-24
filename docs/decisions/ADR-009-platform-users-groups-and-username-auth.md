# ADR-009: Platform users, group scope, and username-auth boundary

- Status: accepted
- Date: 2026-08-24
- Owners: engineering-security-product

## Context

The initial Prisma foundation proved Talent Intelligence data, Supabase Auth session validation, and organization-scoped reads, but it still conflated the operator identity surface with tenant memberships and used direct email/password sign-in in the browser. Movement M2-A requires a durable split between `Usuário` and `Pessoa`, formal group scope above companies, five official operator profiles, auditability, and a username-first product login without exposing username-to-email resolution in public clients.

## Decision

Introduce a dedicated operator domain in PostgreSQL/Supabase with:

1. `organization_groups` above `organizations`;
2. `platform_users` as the operator registry linked explicitly to `auth.users`;
3. `platform_user_audit_events` for material user-management changes;
4. `organization_memberships` preserved as company-scope assignments, with owner memberships derived automatically;
5. a minimal server-side boundary in Edge Functions for username sign-in, password recovery, first access, and user administration.

The Prisma product now treats:

- `Usuário` as identity, authentication, authorization, scope, and system operation;
- `Pessoa` as professional information represented by the platform, without login, password, username, or permissions.

The browser keeps using only the publishable key and JWT. Username resolution, Auth admin mutations, password-initiation flows, and privilege-sensitive user writes remain server-side only.

## Alternatives considered

- Keep using `organization_memberships` alone as the operator model. Rejected because it cannot express the `Usuário != Pessoa` invariant, first-access state, username ownership, or a global/group/company authority model cleanly.
- Move all runtime authorization to Auth metadata. Rejected because user-editable or stale JWT metadata is not an acceptable authorization source.
- Replace the requirement with e-mail login. Rejected because the product contract now presents username as the login identifier.
- Introduce a broad BFF or general API layer first. Rejected because the required boundary is small and well-defined.

## Consequences

### Positive

- `Usuário` and `Pessoa` are formally different aggregates.
- Group scope, company scope, and profile are reviewable and auditable in the database contract.
- Username login no longer requires public email resolution in the browser.
- User management mutations can enforce hierarchy, last-owner protection, and fail-closed checks in one privileged boundary.

### Negative

- The authorization contract becomes materially more complex than the foundation slice.
- Edge Functions become a required runtime dependency for operator management and username login.
- QA rollout now requires coordinated migration plus function deployment before the authenticated browser can validate the full movement end-to-end.

## Security impact

- Auth authority remains outside the frontend.
- `service_role`/secret keys stay server-side only.
- Username sign-in returns neutral failures and avoids public username/email enumeration.
- Inactive or pending users are blocked by the boundary and by database authorization checks.
- Material user changes produce audit rows without storing passwords or tokens.

## Data impact

Adds `organization_groups`, `platform_users`, and `platform_user_audit_events`, changes the effective `membership_role` contract, adds `organizations.group_id`, and derives owner company memberships automatically.

## Validation

- local typecheck and production build of the web shell;
- unit and migration contract tests for username, password, phone, route guards, and the M2 schema;
- `pnpm test`, `pnpm run build:web`, and full `pnpm run validate`;
- remote QA migration/function rollout and connected RLS/UI validation when explicitly approved.

## Rollout note

Accepted architecture does not prove remote activation. QA and production evidence remain separate from this ADR and must be tracked in `PRISMA_CURRENT_STATE.md`.
