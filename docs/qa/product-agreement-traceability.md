# Rastreabilidade de Acordos e AoT

## Objetivo

Este documento define a prova de QA para o protocolo de fidelidade entre acordos de produto, prompt de execução e entrega. A autoridade funcional permanece no Contrato de Acordos congelado e no `AGENTS.md`; esta fonte define somente testes e evidências.

## Matriz obrigatória

Cada `D-*` deve ter pelo menos um `CA-*` objetivo e uma linha no AoT com implementação, teste, evidência e status. Toda proibição material testável (`P-*`) exige teste negativo ou evidência equivalente. `F-*` exige prova de preservação no diff. `A-*` não exige aprovação adicional, mas não pode alterar `D-*` ou `P-*`.

## Estados

Somente `PASS`, `FAIL`, `PARTIAL`, `BLOCKED` e `NOT TESTED` são aceitos. Um movimento não está concluído quando qualquer requisito obrigatório não for `PASS`, quando uma proibição for violada ou quando uma comprovação tecnicamente disponível estiver ausente.

Ambiente e limitação são campos separados, nunca sufixos do status. Templates começam em `NOT TESTED`. Um gate que deve bloquear corretamente pode ter prova `PASS` do bloqueio; isso não torna aprovado o rollout que permanece bloqueado.

O prompt pode incorporar o contrato integralmente por referência a caminho e versão ou revisão/hash imutável. O executor lê a íntegra e rastreia todos os IDs, inclusive os critérios de aceite. Correção delimitada pode referenciar acordo anterior e seu delta autorizado. Referência ausente, alterada sem aprovação ou não resolvida bloqueia a regra afetada.

## Evidência aceitável

Conforme o risco: teste automatizado, teste negativo, smoke autenticado, SQL/RLS, log metadata-only, captura visual, contrato, revisão de diff ou evidência de ambiente. O AoT não contém cadeia de raciocínio privada, PII, segredos ou prompts integrais.

## Mudança de acordo

Uma decisão posterior do Product Owner supersede o ID afetado (`D-03 v1` -> `D-03 v2`), atualiza contrato/prompt/testes/AoT e explica a autorização. Regras conflitantes não podem permanecer ativas.

## M5.4.6 — matriz de rastreabilidade

Normalização documental em 2026-09-11 dos resultados já registrados, sem novo teste ou afirmação de rollout.

| IDs | Implementação | Teste/evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-01 a D-07, D-19 a D-23, D-29 a D-34 | projeção final canônica por seção e dimensão, ocultando vazios | `vacancyIntelligence.test.ts`; build web | PASS | local |
| D-08 a D-18 | estado `unclassified`, modos em lote, editor compartilhado com dimensão e requisito manual | teste determinístico e typecheck | PASS | local |
| D-14 | ledger tenant-scoped e `knowledge_inbox` organizacional | `m546_vacancy_canonical_review_verification.sql` revertido no QA | PASS | QA |
| D-24 a D-28 | reestruturação por delta, preservação humana e remoção explícita | teste determinístico e revisão de código | PASS | local |
| TI-01 a TI-07 e smoke 1280x720/390x844 | fluxo autenticado completo | sessão de navegador não disponível neste ambiente | BLOCKED | smoke pendente no registro original |
| P-01 a P-18, P-21 a P-25 | revisão de projeção, testes negativos e migration/RLS | testes e prova SQL | PARTIAL | dependente do smoke |
| P-19 a P-20 | sem chamada nova de Web Search/IA neste movimento | diff e testes locais | PASS | local |
