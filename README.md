# Prisma

Prisma is an explainable Talent Intelligence layer for transforming resumes and professional information into structured, searchable, comparable, traceable, and auditable knowledge. It supports human decision-making; it does not automatically approve, reject, hire, or eliminate people.

## Verified current state

The repository currently provides a TypeScript CLI vertical slice that imports a representative text resume, extracts a structured profile, preserves evidence and provenance, derives limited versioned inferences, persists tenant-scoped data, performs structured natural-language retrieval, and produces an explained contextual match.

PostgreSQL/Supabase with Row-Level Security is the accepted production persistence architecture. The executable runtime currently uses a tenant-scoped JSON adapter for local tests and demonstration. No remote Supabase project, QA environment, production environment, UI, live LLM, PDF parser, OCR, or vector embeddings are configured in this repository.

For factual availability, read [PRISMA_CURRENT_STATE.md](docs/ai-context/PRISMA_CURRENT_STATE.md). For product meaning, read [product-vision.md](docs/product/product-vision.md). For agent rules, read [AGENTS.md](AGENTS.md).

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer

## Setup and validation

```bash
pnpm install
pnpm run validate
```

Run only the vertical slice:

```bash
pnpm run demo
```

Expected marker: `VERTICAL_SLICE_OK`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run build` | Compile TypeScript |
| `pnpm run lint` | Check text hygiene and prohibited runtime shortcuts |
| `pnpm run check:foundation` | Check contracts, versions, migration security, secrets, and critical markers |
| `pnpm run typecheck` | Run strict TypeScript checking |
| `pnpm test` | Run unit, isolation, failure, migration, security, and vertical-slice tests |
| `pnpm run test:golden` | Run extraction and matching regression cases |
| `pnpm run demo` | Reproduce the end-to-end proof |
| `pnpm run generate:prisma-context` | Regenerate `TUDO_SOBRE_PRISMA.md` from canonical sources |
| `pnpm run check:prisma-context` | Fail on missing, stale, conflicting, or divergent context |
| `pnpm run audit:dependencies` | Query the package registry for high-severity production dependency advisories |
| `pnpm run validate` | Run the complete local foundation gate |

## Repository map

```text
src/                    executable domain, AI, application, infrastructure, CLI
supabase/migrations/    production database and RLS contract
tests/                  technical and golden regression evidence
docs/product/           vision, scope, pilot, domain, glossary
docs/architecture/      system, data, contracts, versions, capabilities, flags
docs/decisions/         ADR index, template, accepted decisions
docs/ai/                extraction, matching, models, prompts, evaluation, cost
docs/security/          privacy, authorization, threat model
docs/operations/        environments, deployment, observability, incidents
docs/qa/                test plan, matrix, personas, release gate
docs/ai-context/        five canonical context sources for authorized AIs
```

## Non-negotiable boundaries

- Facts, inferences, recommendations, human decisions, and observed outcomes remain distinct.
- Missing evidence is not evidence of absence.
- Confidence is methodological, not model opinion.
- Documents are untrusted input and cannot instruct the agent or reveal secrets.
- Tenant isolation and authorization are enforced beyond the frontend.
- Real client resume validation remains an explicit open risk.
- `TUDO_SOBRE_PRISMA.md` is generated and must not be edited manually.
