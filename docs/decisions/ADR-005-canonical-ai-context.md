# ADR-005: Canonical AI Context Pack

- Status: accepted
- Date: 2026-08-20
- Owners: technical governance

## Context

Future agents must reconstruct product and technical state without relying on prior conversations, while avoiding multiple competing summaries.

## Problem

Define a small canonical context topology and prevent silent drift.

## Decision

Maintain exactly five canonical sources in `docs/ai-context`: index, current state, product wiki, technical reference, and AI reference. Generate `TUDO_SOBRE_PRISMA.md` from those sources plus `AGENTS.md` and `README.md`; never edit the export manually. A checker validates metadata, structure, conflicts, duplicate consolidated sources, and freshness.

## Alternatives considered

One hand-edited master file, unrestricted summaries, or conversation memory. Rejected for drift, duplication, and unverifiable state.

## Reasons for the choice

Clear ownership, bounded reading, deterministic export, and repository-native verification.

## Positive consequences

Authorized AIs receive consistent context and stale exports fail CI.

## Negative consequences

Material changes require context updates and regeneration.

## Risks

Generated output edited manually, current state becoming aspirational, or source metadata drifting.

## Mitigation

Fixed source order, generated warning, deterministic scripts, metadata validation, duplicate-name scan, and CI check.

## Technical impact

Adds five Markdown sources, generator/checker scripts, package commands, export, and CI gate.

## Data impact

Context contains architecture and status, never real resumes, secrets, credentials, or sensitive personal data.

## Security and LGPD impact

Reduces accidental PII spread into prompts by defining prohibited content and canonical sanitized references.

## AI impact

Agents consult current state first and keep planned behavior separate from active behavior.

## Compatibility

Context format is versioned. Missing or unknown metadata fails the checker.

## Validation strategy

Generate, compare byte-for-byte, scan conflicts and forbidden competing filenames, then run in CI.

## Review criterion

Review when source ownership changes or the five-file topology no longer answers authorized agent needs.

## Replacement criterion

Supersede only with deterministic migration, no competing sources, and equivalent drift detection.

## References

`PRISMA_CONTEXT_INDEX.md`, generator, checker, `TUDO_SOBRE_PRISMA.md`.

## Change history

- 2026-08-20: accepted.
