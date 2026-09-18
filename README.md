# Prisma

Prisma is an explainable Talent Intelligence layer for transforming resumes and professional information into structured, searchable, comparable, traceable, and auditable knowledge. It supports human decision-making; it does not automatically approve, reject, hire, or eliminate people.

Official local project root: `C:\Users\Bruno\Documents\Prisma`.

## Verified current state

The repository currently provides a TypeScript CLI vertical slice and a React/Ant Design web application. The web app includes M2-A platform users, username-first sign-in, the formal split between `Usuário` and `Pessoa`, M2-B person ingestion, M2-C document reliability, curriculum-first intake, and the M5 PDF-first review workspace. M5 resolves native PDF characters and OCR symbols into normalized canonical page coordinates, so zoom and viewport size change only presentation, not selected text. Adaptive extraction preserves PDF layout, relearns complete experience blocks immediately after an evidence-backed correction, applies accepted suggestions atomically, and promotes metadata-only organization patterns only after full review approval. The local review evolution also supports evidence-backed custom profile sections under `Outros`; approved titles and formats can improve future first extraction without copying personal content.

PostgreSQL/Supabase with Row-Level Security is the accepted persistence architecture. The single remote project, Prisma (`ioldpnqqvobprjiontre`, formerly labelled Prisma-QA), is production; the frontend is hosted at https://prisma.hrtsolutions.com.br on Hostinger. M7.1 position taxonomy is active after the authorized 2026-09-18 rollout, with versioned provenance and explicit human requirement selection; historical definitions are preserved. CBO `CBO 2002-2025-06-06`, ESCO v1.2.1 and O*NET 31.0 are published/current; monitoring never publishes automatically. Matching 5.0.0 classifies trajectory A/B/C before Prisma Score 1.2.0, and M6.2 creates contextual verification only from an explicit human action. The experimental Parser IA still depends on the authenticated hosted bridge to a loopback worker. Automatic import uses native PDF.js followed by Parser IA; Paddle and automatic Tesseract remain temporarily bypassed. External assessment-item generation and vector embeddings remain disabled. See deployment operations and the M7.1 AoT for activation evidence and limits.

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

- `http://127.0.0.1:5555` for the local app connected to the configured environment

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run build` | Compile TypeScript |
| `pnpm run typecheck:web` | Run strict type checking for the isolated web shell |
| `pnpm run dev:web` | Start the local Vite app on port `5555` |
| `pnpm run dev:ia` | Start the local app and AI parser together; requires server-only `OPENAI_API_KEY` in ignored `.env.local`; uses the configured Supabase |
| `pnpm run build:web` | Build the local Vite app |
| `pnpm run lint` | Check text hygiene and prohibited runtime shortcuts |
| `pnpm run check:foundation` | Check contracts, versions, migration security, secrets, and critical markers |
| `pnpm run typecheck` | Run strict TypeScript checking |
| `pnpm test` | Run unit, isolation, failure, migration, security, and vertical-slice tests |
| `pnpm run validate:person-flow` | Build, typecheck web, build web and run the focused Person flow with a local timing report; see [coverage and limits](docs/qa/person-flow-validation.md) |
| `pnpm run test:person-flow` | Compile once and run the explicit Person-flow test selection |
| `pnpm run test:tooling` | Test the validation runner, selection, failure handling and report metadata |
| `pnpm run test:golden` | Run extraction and matching regression cases |
| `pnpm run report:matching-score-shadow` | Generate the synthetic, metadata-only M6.1 shadow calibration report |
| `pnpm run demo` | Reproduce the end-to-end proof |
| `pnpm run generate:prisma-context` | Regenerate the compact GPT source and complete portable export from canonical sources |
| `pnpm run check:prisma-context` | Fail on missing, stale, oversized, conflicting, or divergent context artifacts |
| `pnpm run knowledge:prepare` | Validate an official CBO/ESCO snapshot and generate auditable stage, diff and publication SQL |
| `pnpm run audit:dependencies` | Query the package registry for high-severity production dependency advisories |
| `pnpm run validate` | Run the complete local foundation gate when explicitly authorized for a broad-risk change |

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
FONTE_GPT_PRISMA.md     generated compact source for the prompt-authoring GPT
TUDO_SOBRE_PRISMA.md   generated complete portable context export
```

## Non-negotiable boundaries

- Facts, inferences, recommendations, human decisions, and observed outcomes remain distinct.
- Missing evidence is not evidence of absence.
- Confidence is methodological, not model opinion.
- Documents are untrusted input and cannot instruct the agent or reveal secrets.
- Tenant isolation and authorization are enforced beyond the frontend.
- `Usuário` and `Pessoa` are different aggregates and must not be fused implicitly.
- A resume may originate a Person only after minimum identity and tenant-scoped duplicate resolution; ambiguity remains a human decision.
- The web shell validates the session locally, but it is not the authorization authority.
- Real client resume validation remains an explicit open risk.
- `FONTE_GPT_PRISMA.md` and `TUDO_SOBRE_PRISMA.md` are generated and must not be edited manually.
