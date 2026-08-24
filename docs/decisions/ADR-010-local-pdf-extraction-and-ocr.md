# ADR-010: Local PDF extraction and selective OCR

- Status: accepted
- Date: 2026-08-24
- Owners: engineering-ai-security

## Context

Movement M2-B requires real PDF ingestion, page-level provenance, OCR only when native extraction is insufficient, private storage, deterministic profile construction, and no external paid provider or live LLM dependency. Resumes contain PII and are untrusted input. Supabase Edge Function CPU and memory limits also make server-side OCR an unsuitable default for this stage.

## Decision

The authenticated browser validates the PDF contract, computes SHA-256, extracts native text with pinned `pdfjs-dist`, and invokes pinned `tesseract.js` with Portuguese and English only for pages that fail the deterministic native-text threshold. Processing stays local to the browser; no resume content is sent to an OCR or LLM provider.

Validated outputs are persisted through organization-scoped RLS. The original PDF is stored in the private `person-documents` bucket. PostgreSQL RPC `persist_person_extraction` atomically creates the processing attempt, page extraction, draft, evidence, and resulting states. Profile generation remains an explicit later action and creates a new immutable version.

## Rejected alternatives

- OCR every page. Rejected for unnecessary latency and loss of higher-quality native text.
- Run Tesseract inside an Edge Function. Rejected because resource limits make execution unreliable for multi-page documents.
- External OCR or LLM provider. Rejected because no subprocessador, DPA, cost, retention, or transfer contract is approved.
- Treat parser failure as an empty profile. Rejected because failure must remain fail-closed and visible.

## Consequences

- The browser performs CPU-intensive work and OCR latency depends on the client device.
- Language models for Tesseract may need network delivery, but recognition executes locally.
- The private bucket, RLS, versioned methods, and page-level provenance are mandatory runtime dependencies.
- Malware scanning is not claimed; format, size, signature, trailer, and parser validation are implemented, while malware scanning remains an open production control.

## Validation

- deterministic unit and contract tests for thresholds, insufficient content, untrusted input, private storage, RLS, and member denial;
- connected QA proof for text ingestion, atomic persistence, evidence, timeline, and profile versioning;
- connected native PDF fixture validated one page with 161 useful characters and no OCR;
- connected image-only PDF fixture validated one page with 360 useful characters through `tesseract.js-7.0.0/por+eng-v1`, followed by explicit Perfil Prisma generation;
- an intentionally insufficient scan remained fail-closed and was not persisted as a valid extraction.

## Rollout note

The architecture and database pipeline are active in the current single remote project, Prisma-QA. The product owner explicitly deferred a separate production project and frontend hosting while use remains internal and client-free. Environment isolation becomes mandatory before external or real-client use.
