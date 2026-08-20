# ADR-003: AI provider boundary

- Status: accepted
- Date: 2026-08-20
- Owners: AI engineering

## Context

Directly coupling resumes and domain logic to an LLM would hide regressions, complicate testing, and bind the product to a vendor.

## Problem

Define where probabilistic or external AI may enter the system.

## Decision

Use `ExtractionProvider` with a stable input/output contract and usage metadata. Keep evidence construction, inference, persistence, authorization, matching, and human decision outside the provider.

## Alternatives considered

Embedded prompt strings inside application services, provider-specific domain types, and LLM-generated final matching. Rejected for coupling and weak reproducibility.

## Reasons for the choice

Provider substitution, deterministic tests, schema validation, cost observability, and explicit failure states.

## Positive consequences

The local provider proves behavior without external cost; future providers can share golden tests.

## Negative consequences

Adapters and validation add code and cannot eliminate model variability.

## Risks

Invalid structured output, hidden prompt injection, provider data leakage, silent fallback, and unreviewed provider drift.

## Mitigation

Treat documents as data, validate output, fail closed, version artifacts, minimize PII, record usage, run golden tests, and require QA evidence.

## Technical impact

Providers implement `ExtractionProvider`; `processResume` owns orchestration and states.

## Data impact

Provider requests must document sent and prohibited fields. Raw responses are not authoritative records.

## Security and LGPD impact

External processing requires legal basis, subprocessor review, access control, retention limits, and redaction strategy.

## AI impact

Prompt, model, parameters, schema, guardrails, cost, and tests become governed artifacts.

## Compatibility

Compatible providers return the current contract version. Unknown or incompatible output is rejected.

## Validation strategy

Contract tests, malicious-document tests, golden extraction/matching, cost and latency comparison.

## Review criterion

Review when adding live LLM, OCR, multimodal extraction, or asynchronous processing.

## Replacement criterion

Supersede only if a new boundary improves safety or reproducibility with migration and regression evidence.

## References

`extraction-contract.md`, `prompt-registry.md`, `model-policy.md`, `src/ai/provider.ts`.

## Change history

- 2026-08-20: accepted.
- 2026-08-20: expanded to the canonical ADR format.
