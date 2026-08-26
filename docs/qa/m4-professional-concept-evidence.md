# Evidência QA do Movimento 4

Data: 2026-08-26

Projeto: `Prisma-QA` (`ioldpnqqvobprjiontre`)

## Rollout

- `20260826204413_m4_knowledge_foundation` aplicada com sucesso.
- `20260826205027_m4_knowledge_indexes_rls` aplicada com sucesso após o primeiro advisor pass.
- Edge Function `knowledge-agent` v2 implantada como `ACTIVE`, com `verify_jwt=true`.
- Pesquisa externa não ativada: não foram configurados flag, modelo, secret ou budgets positivos.

## Estrutura e segurança

- 16 tabelas do domínio Knowledge com RLS habilitado.
- 17 policies explícitas.
- Zero grants `EXECUTE` de Knowledge para `PUBLIC` ou `anon`.
- Zero colunas `vector`; matching semântico/embeddings continua fora deste movimento.
- Configurações organizacionais com enriquecimento externo habilitado: zero.
- CBO, ESCO e O*NET catalogados; três versões de fonte registradas como catálogo, sem checksum ou snapshot fictício.

## Cenários funcionais

Os cenários usaram somente dados sintéticos dentro de transações finalizadas com `ROLLBACK`:

1. `Power BI` resolveu para o conceito Organization quando havia alias Global e overlay Organization.
2. Um termo sem overlay resolveu para o conceito Global.
3. Um alias ligado a dois conceitos retornou `ambiguous`, `concept_id = null` e os dois candidatos.
4. Um autenticado sem membership visualizou o conceito Global aprovado e recebeu zero conceitos da organização testada.
5. O mesmo autenticado recebeu zero configurações da organização e não possui grants diretos de escrita nas tabelas Knowledge.

## Advisors

- O segundo pass não aponta foreign keys Knowledge sem índice de cobertura.
- A policy `organization_knowledge_settings_manage` foi dividida por operação, eliminando a sobreposição permissiva em `SELECT`.
- Índices novos aparecem como `unused_index` porque as tabelas e filas ainda não têm carga operacional.
- Quatro RPCs Knowledge são sinalizadas como `SECURITY DEFINER` executáveis por `authenticated`. Isso é intencional: cada RPC usa `search_path` fixo, exige identidade autenticada, revalida Super Admin ou papel Owner/Admin no tenant e opera tabelas sem DML direto para o cliente.

## Gates locais

- 50 testes automatizados passaram, incluindo a regressão do hardening de índices/policies.
- `pnpm run validate` passou integralmente após regenerar o Context Pack: lint de 146 arquivos, foundation/context checks, typechecks, build web, 50 testes, 19 golden fixtures e demo `VERTICAL_SLICE_OK`.
- O shell público foi renderizado a `1440 x 900` e `390 x 844` sem overflow horizontal ou erro de console.

## Limites desta evidência

- Nenhum pacote oficial CBO/ESCO/O*NET foi baixado ou publicado.
- Nenhuma chamada paga ao provider de IA foi feita.
- Nenhum dado pessoal foi enviado para pesquisa externa.
- A revisão final endureceu classe de fonte/catálogo, correspondência com as citações reais do Web Search, bloqueio de padrões óbvios de PII e limite de saída do provider a 2.000 tokens; o agente continuou sem chamada externa.
- Nenhum rollout de produção ou hosting frontend foi executado.
- A área autenticada Conhecimento não teve inspeção visual conectada porque não havia sessão QA no navegador disponível; cobertura de rota, papéis, textos e ações permanece automatizada e o build web passou.
