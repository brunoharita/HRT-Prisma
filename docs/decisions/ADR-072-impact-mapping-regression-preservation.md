# ADR-072 — Mapa de impacto e preservação orientam a regressão

Status: accepted
Date: 2026-09-20

## Context

Movimentos materiais do Prisma atravessam documentação, código, contratos, banco, integrações e ambientes com riscos diferentes. O diff identifica arquivos alterados, mas não prova que uma capacidade compartilhada ou uma jornada relacionada permaneceu funcionando. A suíte completa em todo movimento aumenta custo sem melhorar a prova quando o impacto é limitado.

## Decision

Todo movimento material registra um Mapa de Impacto antes da implementação, com áreas diretas, dependências compartilhadas, áreas potencialmente afetadas, capacidades protegidas, relação classificada, baseline e regressão proporcional. O AoT final diferencia entrega nova de preservação. O mapa é revisado quando surge nova dependência ou capacidade. O dispatcher e o checklist usam essa prova para selecionar validação e não exigem suíte integral por padrão.

## Consequences

- A ausência de arquivo no diff deixa de ser tratada como prova de ausência de risco.
- Relações diretas, plausivelmente indiretas e transversais recebem evidência compatível com o risco.
- Baseline insuficiente permanece declarado como limitação.
- O processo não altera comportamento de produto nem cria uma nova suíte global.

## Alternatives rejected

- Executar `pnpm run validate` em todo movimento: custo desproporcional e sem relação necessária com o impacto.
- Usar somente revisão de diff: não cobre dependências compartilhadas e jornadas afetadas.
- Criar um sistema externo de observabilidade: fora do escopo e desnecessário para a governança documental.
