# Rastreabilidade de Acordos e AoT

## Objetivo

Este documento define a prova de QA para o protocolo de fidelidade entre acordos de produto, prompt de execução e entrega. A autoridade funcional permanece no Contrato de Acordos congelado e no `AGENTS.md`; esta fonte define somente testes e evidências.

## Matriz obrigatória

Cada `D-*` deve ter pelo menos um `CA-*` objetivo e uma linha no AoT com implementação, teste, evidência e status. Toda proibição material testável (`P-*`) exige teste negativo ou evidência equivalente. `F-*` exige prova de preservação no diff. `A-*` não exige aprovação adicional, mas não pode alterar `D-*` ou `P-*`.

## Estados

Somente `PASS`, `FAIL`, `PARTIAL`, `BLOCKED` e `NOT TESTED` são aceitos. Um movimento não está concluído quando qualquer requisito obrigatório não for `PASS`, quando uma proibição for violada ou quando uma comprovação tecnicamente disponível estiver ausente.

## Evidência aceitável

Conforme o risco: teste automatizado, teste negativo, smoke autenticado, SQL/RLS, log metadata-only, captura visual, contrato, revisão de diff ou evidência de ambiente. O AoT não contém cadeia de raciocínio privada, PII, segredos ou prompts integrais.

## Mudança de acordo

Uma decisão posterior do Product Owner supersede o ID afetado (`D-03 v1` -> `D-03 v2`), atualiza contrato/prompt/testes/AoT e explica a autorização. Regras conflitantes não podem permanecer ativas.
