# ADR-088: Origem única da verdade e reuso das estruturas originais

- Status: accepted
- Date: 2026-10-24
- Owners: product, architecture, data
- Autoridade: decisão explícita de Bruno nesta tarefa e solicitação para registrá-la em AGENTS e arquitetura.

## Context / Problem

A discussão sobre reconhecimento ocupacional e propostas de Knowledge motivou uma regra geral: novas funcionalidades não devem espalhar o mesmo conhecimento em tabelas/entidades concorrentes. Múltiplos escritores e cópias independentes criam divergência de verdade, manutenção e reconciliação, prejudicando a evolução do Prisma. ADR-013 e ADR-065 já determinam reuso dentro da Knowledge; a decisão atual torna o princípio explícito para todos os domínios.

## Decision

Adotar GOV-02, com regras normativas em `docs/architecture/data-model.md`, seção "Origem única da verdade e reuso das estruturas originais", e obrigação operacional em `AGENTS.md` 1.3.4. Reutilizar ou ampliar as entidades/tabelas proprietárias originais; não criar outro cadastro para o mesmo objetivo. A única exceção para outra representação persistida do mesmo fato é desempenho demonstrado, com ADR e representação derivada, reconstruível e sem autoridade/edição independente.

Proposta, evidência, histórico e relação mantêm responsabilidades próprias e não competem como cadastro vigente. Esta decisão não aprova RAG, embeddings, modelos, tabelas novas ou migração/consolidação de legado.

## Alternatives considered / Reasons

- Catálogos independentes por módulo ou fornecedor: rejeitados, pois multiplicam origens e fluxos de edição.
- Uma única tabela para todos os domínios: rejeitada, pois confunde responsabilidades distintas e não é o objetivo aprovado.
- Reuso com origem proprietária explícita e exceção medida para dados derivados: escolhido, preserva coerência sem impedir otimização demonstrada.

## Consequences / Risks / Mitigation

Novas entregas devem identificar proprietário, escritores e consumidores antes de alterar persistência. O desenho pode exigir ampliar o fluxo existente. A exceção de desempenho não pode ser usada como justificativa genérica: exige baseline, gargalo, alternativas, benefício e ciclo de sincronização/invalidação/reconstrução. Origem e versões permitem identificar dados derivados desatualizados. Escopos organizacional/global, proveniência, história e autoridade humana permanecem explícitos.

## Technical / Data / Security / AI impact

Mudança exclusivamente normativa/documental. Sem código, schema, migrations, permissões, dados pessoais, produção ou chamadas de IA. Nenhuma auditoria de conformidade integral do legado foi executada ou declarada. Versão do contrato de instruções: 1.3.4; versão pública do produto: manter 3.1.4. Exportações geradas incorporam a diretriz sem incluir rascunhos alheios não rastreados.

## Validation / Compatibility / Review

Revisão do diff, whitespace, links locais alterados, `check:foundation`, geração e `check:prisma-context` em snapshot rastreado. Dispatcher define somente superfícies documentais; não executar deploy de runtime. Compatibilidade de produto/dados preservada pela ausência de alteração executável. Reavaliar apenas diante de nova decisão explícita do Product Owner; exceções concretas de desempenho devem referenciar este ADR. Reversão documental não apaga histórico; qualquer substituição deve declarar a decisão superada.

## References / Change history

- `AGENTS.md` 1.3.4; `docs/architecture/data-model.md` GOV-02; `docs/architecture/system-architecture.md`.
- ADR-013; ADR-065; `docs/qa/aot-canonical-data-authority.md` (acordo, execução e evidências).
- 2026-10-24: decisão aprovada por Bruno; registro documental autorizado, sem alteração de runtime.
