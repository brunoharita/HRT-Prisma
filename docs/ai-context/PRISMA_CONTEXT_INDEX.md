---
prisma_context_id: context-index
owner: technical-governance
status: current
version: 2.0.1
last_verified: 2026-09-17
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

## Artefatos de distribuição

`FONTE_GPT_PRISMA.md` é a projeção compacta para o GPT que prepara prompts de desenvolvimento. Ela carrega somente contexto vigente, invariantes, linguagem de domínio e rotas de aprofundamento. `TUDO_SOBRE_PRISMA.md` reúne `AGENTS.md`, `README.md` e toda a documentação especializada em `docs/**/*.md` para transferir o contexto completo a outra IA. Ambos são gerados da mesma base, compartilham manifesto e nunca recebem edição manual.

O GPT usa apenas a fonte compacta como arquivo permanente. O prompt produzido deve mandar o Codex ler no repositório as fontes proprietárias e o código diretamente relacionado antes de implementar. A exportação completa serve para portabilidade, auditoria e recuperação, não como entrada padrão de toda tarefa.

## Mapa para geração de prompts

| Tema da mudança | Fontes que o prompt deve mandar o Codex consultar |
| --- | --- |
| Produto, linguagem, entidade ou fluxo | `docs/product`, `PRISMA_WIKI.md` e requisito/auditoria fornecido pelo Product Owner |
| UX, tela, navegação, estado ou referência visual | `docs/product/ux-foundation.md` (incluindo “Fidelidade a referências visuais”), acordo/execução/AoT aplicáveis, `web/src/pages`, `web/src/components` e `web/src/styles.css` |
| Pessoa, currículo, revisão ou publicação | owners em `docs/product`, `docs/architecture` e `docs/ai`; serviços e testes do fluxo afetado |
| Posição, matching ou Prisma Score | `docs/product/vacancy-intelligence.md`, `docs/architecture/vacancy-intelligence.md`, `docs/ai/matching-contract.md`, ADRs vigentes e testes de matching |
| Lominger, competências ou visualização do Perfil | `docs/product/lominger-profile-visualization.md`, o PDF-base local em `.prisma-data/knowledge-sources/lominger/` e `PROMPT_BRAINSTORM_LOMINGER_PERFIL_CANDIDATO.md`; não tratar a referência como contrato ou metodologia ativada |
| Verificação ou Item Bank | owners de competency verification, acordo/execução/AoT do movimento e fronteiras Supabase relacionadas |
| Knowledge ou pesquisa externa | owners de professional concept, Knowledge, model/prompt policy, migrations e Edge Function aplicáveis |
| Auth, RLS, PII ou Supabase | `docs/security`, contratos de arquitetura, migrations/RPCs e provas negativas do limite afetado |
| Ambiente, release ou implantação | `docs/operations`, `docs/architecture/versioning.md`, release checklist e evidência do ambiente alvo |
| Governança de impacto, preservação e regressão | `AGENTS.md`, `docs/qa/agreement-contract-template.md`, `docs/qa/aot-template.md`, `docs/qa/product-agreement-traceability.md`, `docs/operations/release-dispatcher.md` e Agreement/AoT do movimento |

Quando um Agreement Contract específico existir, o prompt deve exigir sua leitura integral por caminho e versão. Um resumo ou uma lista de IDs não o substitui.

Novos acordos e AoTs usam `docs/qa/agreement-contract-template.md` e `docs/qa/aot-template.md`. O arquivo compacto orienta a construção do prompt; o Codex registra o contrato e a evidência no owner de QA.

## Protocolo de leitura

1. Consultar a seção pertinente de `PRISMA_CURRENT_STATE.md` quando a tarefa depender do que existe e de onde está ativo; não exigir leitura integral a cada tarefa.
2. Ler a referência específica necessária.
3. Confirmar comportamento sensível no código, migration, ADR e evidência de ambiente.
4. Tratar planos como planos e riscos como riscos.

## Precedência

Para comprovar o que existe: estado operacional verificado; código e configuração; migrations e contratos implementados; ADRs aceitos; evidências de QA/produção; documentação normativa; roadmap; histórico. Para determinar o comportamento devido: decisão explícita mais recente do Product Owner e acordos aprovados conforme `AGENTS.md`. Código divergente não substitui um requisito.

Documentação não prova implementação. Código não prova rollout. Migration não prova ativação. QA não prova produção. Modelo publicado não prova comportamento aprovado. Prompt existente não prova qualidade validada.

## Owners especializados

`AGENTS.md` governa agentes. `README.md` é entrada operacional. `docs/product`, `architecture`, `decisions`, `ai`, `security`, `operations` e `qa` são proprietários dos respectivos assuntos. Em conflito, corrigir primeiro a fonte proprietária e depois atualizar o Context Pack.

## Manutenção

Mudança material exige atualizar a fonte especializada, `PRISMA_CURRENT_STATE.md` quando o estado mudar, a referência canônica afetada e `last_verified`. Depois executar:

```bash
pnpm run generate:prisma-context
pnpm run check:prisma-context
```

`pnpm run generate:prisma-context` atualiza os dois artefatos na mesma execução. `pnpm run check:prisma-context` valida fontes, manifesto, papéis, limite de tamanho da fonte compacta e conteúdo sem depender de LF ou CRLF. Não criar MASTER, OVERVIEW, SNAPSHOT, KNOWLEDGE, WIKI alternativa ou contexto consolidado concorrente.
