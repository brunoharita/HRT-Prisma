# Contrato de Acordos — Visibilidade de propostas da Knowledge

## Objetivo

- Versão: 1.0.0
- Fonte da decisão: Bruno autorizou a correção em 2026-09-19 após a proposta de `Transformação operacional` ficar invisível na tela de Propostas.
- Delta: corrigir somente o filtro de leitura do dashboard; a autorização da aprovação no Supabase permanece vigente.

## DEVE — Inegociável

- D-01 — Super Admin vê propostas Globais e propostas da empresa ativa no dashboard de Conhecimento.
- D-02 — Cada proposta informa visualmente se é Global Prisma ou Empresa ativa.
- D-03 — A aprovação continua submetida ao `require_knowledge_admin` server-side.

## PROIBIDO

- P-01 — Não exibir proposta de outra empresa apenas por o usuário ser Super Admin.
- P-02 — Não criar, aprovar, editar ou associar conceitos nesta correção.
- P-03 — Não alterar RLS, schema, RPCs ou histórico de proposals.

## FORA DE ESCOPO

- F-01 — Reinterpretação de Perfis, taxonomia, normalização e pesquisa de Knowledge.
- F-02 — Alteração do nome ou aprovação da proposta `Transformação operacional`.

## AUTONOMIA DE ENGENHARIA

- A-01 — Extrair a regra de visibilidade para função pura e cobri-la com testes positivos e negativos.

## PENDÊNCIAS

- Nenhuma.

## CRITÉRIOS DE ACEITE

- CA-D01 — Com empresa ativa A, Super Admin vê propostas global e A, mas não B.
- CA-D02 — O card da proposta exibe o alcance.
- CA-D03 — A revisão do diff confirma que a função server-side de aprovação e o banco não mudaram.

## ESTADO

- agreed

## APROVAÇÃO

- Product Owner: Bruno
- Data: 2026-09-19
- Evidência: "pode fazer, AoT"
- Referência imutável: versão 1.0.0 deste arquivo.
