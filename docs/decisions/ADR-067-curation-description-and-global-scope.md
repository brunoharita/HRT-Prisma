# ADR-067 — Descrição opcional e alcance seguro na curadoria

Status: accepted. Data: 2026-09-18. Acordo `docs/qa/agreement-m76-curation-description-scope.md` v1.0.0.

## Decisão

A curadoria contextual do Perfil passa a usar `profile-competency-curation-4.0.0`. Propostas podem carregar uma descrição opcional do conceito em `original_proposal.proposed_concept.description`. A justificativa textual da associação deixa de existir no painel, no payload e na persistência específica da curadoria; dados históricos ligados a observações de Perfil são limpos pela migration M7.6.

O escopo `organization` continua sendo o padrão. A UI só apresenta `Knowledge Global` para `super_admin`, e a RPC exige a mesma autoridade server-side. A proposta permanece pendente, sem publicação ou evidência pessoal automática.

## Compatibilidade e limites

A RPC `curate_profile_competency_v4` é a fronteira corrente. Assinaturas legadas permanecem disponíveis para rollback controlado, mas ignoram o argumento antigo de justificativa e delegam à implementação sem captura. Fluxos administrativos independentes da página Knowledge, que possuem seu próprio motivo de aprovação, não são alterados por este ADR.

Migration `20260918220000_m76_curation_description_scope` remove apenas `reason`/`rationale` associados a observações com `profile_id`, sem apagar auditoria não relacionada. Não há mudança de snapshots, normalização, matching, taxonomias ou IA.
