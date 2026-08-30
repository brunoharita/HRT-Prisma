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
| [ADR-007](ADR-007-authenticated-app-shell-and-design-system.md) | accepted | Authenticated App Shell and Prisma design system |
| [ADR-008](ADR-008-supabase-domain-read-adapter.md) | accepted | Supabase domain read adapter for the authenticated web app |
| [ADR-009](ADR-009-platform-users-groups-and-username-auth.md) | accepted | Platform users, group scope, and username-auth boundary |
| [ADR-010](ADR-010-local-pdf-extraction-and-ocr.md) | accepted | Browser-local PDF extraction, selective OCR, and atomic persistence |
| [ADR-011](ADR-011-idempotent-document-review-boundary.md) | accepted | Idempotent document operations and transactional human profile review |
| [ADR-012](ADR-012-curriculum-first-resume-intake.md) | accepted | Tenant-scoped resume intake before transactional Person resolution |
| [ADR-013](ADR-013-canonical-knowledge-organization-overlay.md) | accepted | Canonical Prisma Knowledge with organization overlay |
| [ADR-014](ADR-014-knowledge-agent-trusted-sources.md) | accepted | Knowledge Agent with trusted-source and no-PII policy |
| [ADR-015](ADR-015-knowledge-triggered-reinterpretation.md) | accepted | Knowledge-triggered profile reinterpretation through M2-C |
| [ADR-016](ADR-016-spatial-cv-evidence-review.md) | accepted | PDF-first review with normalized spatial evidence and immutable human history |
| [ADR-017](ADR-017-adaptive-resume-extraction-and-review-learning.md) | accepted | Layout-aware extraction, document-local suggestions, and controlled review learning |
| [ADR-018](ADR-018-immediate-block-learning-and-organization-patterns.md) | accepted | Immediate block relearning, atomic adaptive review, and approved organization patterns |
| [ADR-019](ADR-019-custom-profile-sections-and-structural-learning.md) | accepted | Structured custom profile sections and organization-scoped heading learning |
| [ADR-020](ADR-020-spatial-evidence-refinement.md) | accepted | Character-level subtraction and immutable refinement decisions for overlapping evidence |
| [ADR-021](ADR-021-canonical-visual-character-map.md) | accepted | Zoom-independent canonical character geometry for visual evidence |
| [ADR-022](ADR-022-structured-resume-summary-and-private-contact-boundary.md) | accepted | Structured resume summary with private canonical contact boundary |
| [ADR-023](ADR-023-stable-review-field-lifecycle.md) | accepted | Stable repeatable-field identity, optional-value normalization, and explicit add/remove lifecycle |

## Rules

- Start from `ADR-000-template.md`.
- Never edit an accepted decision to hide history. Amend the history or supersede it.
- Reference code, migrations, contracts, tests, and rollout evidence separately.
- Accepted does not mean implemented or active; each ADR states its evidence and environment.
