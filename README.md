# Prisma

Prisma is an explainable Talent Intelligence layer for transforming resumes and professional information into structured, searchable, comparable, traceable, and auditable knowledge. It supports human decision-making; it does not automatically approve, reject, hire, or eliminate people.

Official local project root: `C:\Users\Bruno\Documents\Prisma`.

## Verified current state

The repository currently provides a TypeScript CLI vertical slice that imports a representative text resume, extracts a structured profile, preserves evidence and provenance, derives limited versioned inferences, persists tenant-scoped data, performs structured natural-language retrieval, and produces an explained contextual match. It also includes a React and Ant Design web shell under `web/` with the shared Prisma App Shell, Supabase Auth, active-organization selection, and protected routes from `organization_memberships`.

PostgreSQL/Supabase with Row-Level Security is the accepted production persistence architecture. The executable runtime still uses a tenant-scoped JSON adapter for local tests and demonstration, and the web shell currently proves session, route protection, and the reusable authenticated interface foundation. A remote QA Supabase project exists for Auth and schema validation, but there is still no production environment, connected runtime data adapter, live LLM, PDF parser, OCR, or vector embeddings configured in this repository.

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

Run the local web shell:

```bash
cp .env.example .env.local
pnpm run dev:web
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Local port convention:

- `http://127.0.0.1:5555` for the main local app
- `http://127.0.0.1:5556` for the local QA variant

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run build` | Compile TypeScript |
| `pnpm run typecheck:web` | Run strict type checking for the isolated web shell |
| `pnpm run dev:web` | Start the main local Vite app on port `5555` |
| `pnpm run dev:web:qa` | Start the local QA Vite app on port `5556` |
| `pnpm run build:web` | Build the local Vite app |
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
web/                    isolated browser app for Supabase Auth and protected routes
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
- The web shell validates the session locally, but it is not the authorization authority.
- Real client resume validation remains an explicit open risk.
- `TUDO_SOBRE_PRISMA.md` is generated and must not be edited manually.
