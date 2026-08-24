# ADR-007: Authenticated App Shell and Prisma design system

- Status: accepted
- Date: 2026-08-23
- Owners: product-engineering

## Context

ADR-006 introduced an isolated Vite shell to prove Supabase Auth, active organization selection, and fail-closed route guards. That shell intentionally used minimal imperative HTML because its scope was authentication, not a durable product interface. The Prisma now needs an official visual, structural, and navigation foundation for every authenticated page.

The approved dashboard reference defines visual language and information density. It does not authorize the example data, widgets, routes, or product capabilities shown in the image.

## Decision

Evolve the existing Vite shell to React and use Ant Design as the authenticated interface component foundation. Keep one shared `PrismaAppShell` around every authenticated route and preserve the pure authorization contract in `web/src/shared/access.ts`.

The official authenticated layout has these invariants:

1. Global navigation lives in a full-height left sidebar.
2. There is no global horizontal top bar.
3. The sidebar is split into brand, independently scrollable product navigation, and bottom utilities.
4. The active organization and user menu remain anchored in the bottom region, with the user profile last.
5. Desktop supports expanded and collapsed sidebar states; mobile uses a drawer with the same navigation architecture.
6. Page titles, descriptions, breadcrumbs, filters, and actions belong to the page-level `PrismaPageHeader`.
7. Cards and page structure reuse `PrismaCard`, `PrismaPage`, and shared theme tokens.
8. Official logo assets are used without redrawing, recoloring, or changing their proportions.
9. Route visibility may reflect a known role, but frontend navigation is never authorization authority.
10. Mockup content does not become product scope without a separate approved decision and factual implementation.

## Component boundary

| Component | Responsibility |
| --- | --- |
| `PrismaAppShell` | Shared authenticated layout, responsive navigation, and content boundary |
| `PrismaSidebar` equivalent | Brand, product navigation, organization context, and user menu |
| `PrismaPage` | Width, flow, and page content boundary |
| `PrismaPageHeader` | Optional page-owned title, description, breadcrumbs, actions, and extras |
| `PrismaCard` | Shared low-elevation content surface |
| Prisma theme | Ant Design tokens and Prisma-specific design constants |

The implementation may split these responsibilities into additional internal components without changing the public architecture.

## Alternatives considered

- Continue with imperative HTML and recreate Ant Design-like controls in CSS. Rejected because it would duplicate accessible component behavior and conflict with the approved Ant Design foundation.
- Keep a global top bar for organization and profile controls. Rejected because the approved layout explicitly assigns those utilities to the sidebar.
- Reproduce every dashboard widget in the reference. Rejected because the reference is a visual baseline, not evidence of implemented functionality or real data.
- Use a second component library beside Ant Design. Rejected because it would fragment tokens, interaction patterns, and maintenance.

## Consequences

### Positive

- Future authenticated pages inherit one navigation and layout contract.
- Theme, spacing, cards, and responsive behavior have reusable owners.
- Existing Auth, membership, and role guards remain isolated from presentation.
- The mobile shell preserves the same information architecture without forcing a wide sidebar.

### Negative

- React, React DOM, Ant Design, and Ant Design Icons become web runtime dependencies.
- The initial Ant Design vendor chunk is materially larger than the former minimal shell.
- Connected visual validation of authenticated routes requires an authorized QA user and membership.

## Security and data impact

No schema, migration, RLS, grant, role, or tenant rule changes. The browser still uses only the publishable Supabase key, validates identity with `getClaims()`, reads `organization_memberships` through RLS, and fails closed for missing or unknown authority. No new talent-domain data is queried or mutated.

## Accessibility and responsive behavior

Navigation uses real links and buttons, visible focus, accessible labels, and tooltips for collapsed controls. Desktop, compact desktop, and mobile have explicit layout states. Reduced-motion preference disables nonessential transitions. Visual fidelity never overrides keyboard access, contrast, or semantic controls.

## Validation strategy

- Typecheck and build the web shell.
- Run route guard and full repository tests.
- Inspect the public shell at desktop and mobile widths.
- Validate authenticated desktop, collapsed, and mobile navigation in connected QA when authorized credentials are available.
- Regenerate and check the canonical Prisma context.

## Replacement criterion

Supersede this decision only if a future application framework or design-system migration defines compatibility, Auth integration, responsive navigation, accessibility, bundle impact, rollback, and migration for all authenticated pages.

## References

`web/src/app/PrismaApplication.tsx`, `web/src/ui/PrismaAppShell.tsx`, `web/src/ui/PrismaPage.tsx`, `web/src/ui/PrismaCard.tsx`, `web/src/ui/theme.ts`, `web/src/shared/access.ts`, ADR-006, and `docs/ai-context/PRISMA_CURRENT_STATE.md`.

## Change history

- 2026-08-23: accepted.
