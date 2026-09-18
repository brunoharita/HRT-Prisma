# Contrato de Acordos — M7.5 Recuperação de cobertura de competências

Versão: 1.0.0. Estado: agreed. Product Owner: Bruno. Aprovação: 2026-09-18, “pode fazer, estilo AoT”, após diagnóstico de 3 conceitos e 54 pendências no Perfil real. Baseline: `080a4067d14e7e71d3147ad10962bd195d74d874`.

## DEVE

- D-01 — Uma tentativa de normalização falha, limitada ou parcial nunca reduz as associações do último processamento completo compatível. A tentativa mais recente permanece visível separadamente.
- D-02 — Expor contagens de declarações, itens atômicos, itens associados, conceitos únicos, pendências e termos únicos pendentes, sem chamar ausência de associação de ausência de competência.
- D-03 — Isolar o orçamento de chamadas da normalização de Perfis do orçamento das demais operações do Knowledge Agent, com limites server-side positivos, auditáveis e fail-closed.
- D-04 — Permitir nova tentativa autorizada sem alterar Perfil, publicação, evidência, decisão humana ou resultado completo anterior.
- D-05 — Agrupar pendências equivalentes na curadoria, informar quantas ocorrências serão beneficiadas e preservar cada origem individual.
- D-06 — Reutilizar `searchTerms` versionados do processamento para apresentar candidatos de busca deduplicados; nenhum candidato é selecionado ou gravado automaticamente.
- D-07 — Alias aprovado por humano deve beneficiar todas as ocorrências compatíveis e futuros Perfis da empresa pelo mecanismo Knowledge existente.
- D-08 — Ausência de conceito deve continuar permitindo proposta; proposta não publica conceito nem encerra pendência sem o fluxo humano vigente.
- D-09 — Reprocessar Perfis aprovados vigentes após o rollout e registrar cobertura antes/depois, falhas, custos técnicos disponíveis e limites reais.
- D-10 — Atualizar contratos, ADR, versão pública, Context Pack, testes, rollout, smoke e AoT no mesmo movimento.

## PROIBIDO

- P-01 — Não promover correspondência parcial, similaridade, ambiguidade, relação ocupacional ou sugestão do modelo a equivalência automática.
- P-02 — Não criar alias, conceito, proficiência, senioridade, score, evidência demonstrada ou decisão humana sem ação humana autorizada.
- P-03 — Não reescrever Perfil publicado, declaração original, snapshots, evidências, matching, M5.1 ou histórico de processamentos.
- P-04 — Não misturar tenants, expor service role/segredos/PII integral nem confiar em autorização do frontend.
- P-05 — Não aumentar orçamento de forma ilimitada; zero, ausência, esgotamento ou configuração inválida falham fechado e preservam o resultado anterior.
- P-06 — Não criar taxonomia paralela, nova fonte, Web Search, embeddings, novo provider/modelo ou dependência para este movimento.
- P-07 — Não transformar proposta pendente em conceito publicado nem decisão de empresa em alias Global.

## FORA DE ESCOPO

- F-01 — Aprovar as equivalências do lote em nome do Product Owner.
- F-02 — Garantir percentual universal de cobertura ou mapear todo termo por força.
- F-03 — Alterar taxonomias ocupacionais, relações ocupação↔competência ou requisitos de Posição.
- F-04 — Redesenhar a topologia das telas M7.2/M7.4.

## AUTONOMIA

- A-01 — Versões aditivas, helpers, índices, forma do DTO, ordenação e compatibilidade de RPCs.
- A-02 — Limites dedicados iniciais conservadores, desde que positivos, server-side, documentados e sem remover o teto anterior das demais operações.
- A-03 — Agrupamento, microcopy, ordenação de candidatos, loading e responsividade dentro da composição aprovada.
- A-04 — Estratégia idempotente de reprocessamento, rollback e smoke read-only; decisões humanas reais continuam fora da automação.

## PENDÊNCIAS

Nenhuma pendência material. A aprovação humana do lote é etapa operacional posterior e não pode ser simulada pela implementação.

## CRITÉRIOS DE ACEITE

- CA-01 — Dada uma execução completa seguida de uma falha, a projeção mantém itens/associações completas e expõe a falha como tentativa mais recente não usada como base.
- CA-02 — Orçamento de Vagas/pesquisa não consome o teto dedicado de normalização; limites inválidos ou esgotados retornam falha segura sem chamada externa.
- CA-03 — Pendências iguais aparecem em um grupo com contagem; aliases continuam transacionais, tenant-scoped e humanos.
- CA-04 — As expressões de busca geram candidatos deduplicados, classificados e não pré-selecionados; parcial/ambíguo exige decisão.
- CA-05 — Reprocessamento real não reduz cobertura anterior, não altera o Perfil e produz relatório antes/depois.
- CA-06 — Testes negativos cobrem tenant, role, contrato futuro, candidato parcial, orçamento, corrida e tentativa falha.
- CA-07 — Typecheck, build, testes dirigidos, PostgreSQL descartável, Context Pack, comparação visual desktop/mobile, produção e smoke passam; limites constam no AoT.

## FIDELIDADE VISUAL

As imagens M7.2/M7.4 já aprovadas permanecem alvo normativo. Este movimento pode acrescentar contagens, agrupamento e estado da última tentativa, mas não mudar abas, hierarquia, painel lateral, ordem de decisão, filtros, ações ou transformação responsiva. Comparação same-state/same-data em desktop e 390×844 é obrigatória.
