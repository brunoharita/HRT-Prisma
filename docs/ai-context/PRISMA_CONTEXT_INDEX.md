---
prisma_context_id: context-index
owner: technical-governance
status: current
version: 1.0.1
last_verified: 2026-08-24
---

# Prisma Context Index

## Manifesto canônico

| Fonte | Owner | Conteúdo permitido |
| --- | --- | --- |
| `PRISMA_CONTEXT_INDEX.md` | technical governance | manifesto, precedência, owners, manutenção |
| `PRISMA_CURRENT_STATE.md` | engineering/operations | somente estado factual verificado |
| `PRISMA_WIKI.md` | product | visão, escopo, domínio e regras funcionais |
| `PRISMA_TECHNICAL_REFERENCE.md` | engineering/security | stack, arquitetura, dados, segurança, ambientes |
| `PRISMA_AI_REFERENCE.md` | AI/QA | extração, matching, prompts, modelos, avaliação, custo e guardrails |

Esses são os únicos cinco arquivos canônicos em `docs/ai-context`. Eles consolidam, mas não substituem, fontes especializadas.

## Protocolo de leitura

1. Ler `PRISMA_CURRENT_STATE.md` para saber o que existe e onde está ativo.
2. Ler a referência específica necessária.
3. Confirmar comportamento sensível no código, migration, ADR e evidência de ambiente.
4. Tratar planos como planos e riscos como riscos.

## Precedência

Estado operacional verificado; código e configuração; migrations e contratos implementados; ADRs aceitos; evidências de QA/produção; documentação normativa; roadmap; histórico.

Documentação não prova implementação. Código não prova rollout. Migration não prova ativação. QA não prova produção. Modelo publicado não prova comportamento aprovado. Prompt existente não prova qualidade validada.

## Owners especializados

`AGENTS.md` governa agentes. `README.md` é entrada operacional. `docs/product`, `architecture`, `decisions`, `ai`, `security`, `operations` e `qa` são proprietários dos respectivos assuntos. Em conflito, corrigir primeiro a fonte proprietária e depois atualizar o Context Pack.

## Manutenção

Mudança material exige atualizar a fonte especializada, `PRISMA_CURRENT_STATE.md` quando o estado mudar, a referência canônica afetada e `last_verified`. Depois executar:

```bash
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

`TUDO_SOBRE_PRISMA.md` é exportação gerada em ordem fixa e nunca deve ser editada manualmente. Não criar MASTER, OVERVIEW, SNAPSHOT, KNOWLEDGE, WIKI alternativa ou contexto consolidado concorrente.
