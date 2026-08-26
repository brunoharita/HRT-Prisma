# ADR-015: Reinterpretação acionada por mudança de Knowledge

- Status: accepted
- Data: 2026-08-26
- Owners: product, application, AI, QA

## Decisão

Mudança publicada gera impactos somente para perfis relacionados por observações. Cada organização começa em `off`; frequência explícita não opera sem impacto. Reinterpretação usa a mesma evidência, cria draft comparável e reutiliza aprovação/versionamento M2-C. Perfil aprovado não é sobrescrito.

## Evidência

Tabelas `knowledge_reinterpretation_impacts/jobs`, RPCs de dispatch/preparação e trigger de versão Knowledge na migration do Movimento 4.
