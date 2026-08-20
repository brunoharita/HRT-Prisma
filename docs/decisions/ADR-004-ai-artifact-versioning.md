# ADR-004: Version controlled AI artifacts

- Status: accepted
- Date: 2026-08-20
- Owners: AI engineering and QA

## Context

Extraction, inference, retrieval and matching results can change without schema changes when prompts, models, rules, taxonomies, or parameters change.

## Problem

Make behavior changes reconstructable and comparable.

## Decision

Assign stable names and semantic versions to AI contracts, rules, prompts, logical model roles, technical models, embeddings, confidence methods, and evaluation sets. Persist applicable versions with outputs and require golden comparison for promotion.

## Alternatives considered

Git commit only, latest-model aliases without artifact versions, and informal prompt notes. Rejected because persisted outputs could not explain why behavior changed.

## Reasons for the choice

Reproducibility, rollback, cost comparison, auditability, and controlled model replacement.

## Positive consequences

Results can be attributed to a version set and regressions can block promotion.

## Negative consequences

Version maintenance and evaluation evidence add operational work.

## Risks

Version labels without actual immutable content, incomplete registry updates, and stale golden sets.

## Mitigation

Registry owner, contract checker, generated Context Pack, activation dates, history, and release checklist.

## Technical impact

Version fields remain in domain types, tables, telemetry, and generated artifacts.

## Data impact

Reprocessing creates new artifacts or explicit supersession; it does not rewrite historical meaning.

## Security and LGPD impact

Registry records data sent and prohibited for each prompt/model role. Historical PII is not copied into documentation.

## AI impact

Model or prompt replacement is material even with unchanged structured schema.

## Compatibility

Unknown versions fail closed; patch/minor/major rules follow `versioning.md`.

## Validation strategy

Golden tests, contract checks, benchmark, cost/latency comparison, and QA evidence.

## Review criterion

Review when the first productive LLM, embedding model, or taxonomy service is introduced.

## Replacement criterion

Supersede with an equivalent or stronger provenance and evaluation mechanism.

## References

`versioning.md`, `contracts.md`, `prompt-registry.md`, `model-policy.md`.

## Change history

- 2026-08-20: accepted.
