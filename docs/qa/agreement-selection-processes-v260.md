# Acordo — Processos seletivos separados de Posições, v2.6.0

Versão 1.0.0, agreed. Bruno aprovou as regras e a proposta visual 3 nesta conversa em 14/10/2026 e autorizou implementação em main/publicação v2.6.0. Baseline 3766fce913a835ec32a2db73214d9239f4bd6803. Este documento transcreve o escopo aprovado, sem nova decisão.

## DEVE

- D-01: cada processo pertence a uma Posição permanente; ciclos anteriores permanecem consultáveis.
- D-02: um único processo ativo por Posição. Criar explicitamente um processo vazio somente para Posição desocupada, com ação pela Posição ou pela área de processos. Inclusão de Pessoa não cria processo implicitamente.
- D-03: menu próprio Processos seletivos, consulta por empresa, busca e filtros Todos/Em andamento/Encerrados. Estado do processo independente da ocupação.
- D-04: abrir acompanhamento existente, encontrar Pessoas, preparar/consultar avaliação, histórico, encerramento e reabertura autorizados; Lista/Kanban, seleção, entrevistas, decisões e fontes preservados.
- D-05: vínculo e acesso pela Posição; se já há processo ativo, abrir esse processo. Histórico permanece disponível.
- D-06: backend impõe tenant, papel, versão, concorrência/idempotência e auditoria transacional. Nenhuma fixture produtiva.
- D-07: entrega v2.6.0 em main/origin/produção, CI, rollback, smoke e contexto sincronizados.
- D-UX-01: proposta 3 é alvo normativo de estrutura: sidebar Prisma; título/ação Novo processo; lista compacta à esquerda (aproximadamente 38%) e painel do selecionado à direita (62%); busca/filtros sobre lista; seleção azul; identidade, situação, ocupação, Ver Posição, candidatos e resumo por cinco etapas; abas Resumo/Avaliação/Histórico; Abrir acompanhamento em destaque, ações Encontrar pessoas/Preparar avaliação/Encerrar processo agrupadas no alto.
- D-UX-02: acompanhamento em página ampla, sem Kanban comprimido no painel; abas Candidatos/Avaliação/Histórico. Celular com lista e resumo sucessivos, retorno e ações acessíveis.

## PROIBIDO

- P-01: processos sem Posição, mais de um ativo por Posição, criação implícita ou em Posição ocupada.
- P-02: leitura/mutação entre empresas ou por papel não autorizado, histórico reescrito, remoção de candidatos/provas/convites/resultados.
- P-03: encerramento/consulta mudarem ocupação, Score, Perfil, matching, decisão humana ou acionarem IA/débito.
- P-UX-01: substituir split por catálogo/tabela isolada, exibir lista e detalhe comprimidos lado a lado no celular, retirar capacidades atuais de acompanhamento.

## FORA DE ESCOPO

- F-01: múltiplas Posições num processo, anúncio público, contratação automática, novo ATS, coleta/IA/tarifas, expurgo e alterações do instrumento de avaliação.
- F-02: redesenho dos cartões reais de candidatos, marca/slogans, novas etapas, rascunho/pausa ou estados não aprovados.

## AUTONOMIA

- A-01: reutilizar tabelas/RPCs/componentes atuais, URLs compatíveis, filtros/paginação e controles acessíveis, sem nova dependência.
- A-UX-01: tokens, ícones, conteúdo real, contagens dinâmicas e detalhes decorativos. Ícone de encerramento não significa exclusão.

## PENDÊNCIAS

Nenhuma material. Alteração de contrato por Bruno prevalece; não ampliar escopo.

## Aceite

CA-D01..D06: testes SQL transacionais e negativos (tenant/papel, ocupada, concorrência, replay, primeira criação e ciclos/histórico); testes de contrato/navegação e browser sintético dos pontos afetados, sem LLM remoto.
CA-D07: CI e recibos de SHA/migration/web/rollback/smoke; limitações de jornada autenticada real explicitadas.
CA-UX01/02: render desktop 1448px e celular 390px, mesmos três processos fictícios 12/8/10 e seleção backend; comparação com referência; 768/320px para overflow e navegação. Mockup possui cartões simplificados; preservar cartões reais é exigência aprovada.

## Mapa de impacto / preservação

| Área | Relação | Baseline / mecanismo | Validação mínima |
| --- | --- | --- | --- |
| Menu, lista/resumo e entrada pela Posição | direct | main3766fce, proposta3; shells/store existentes | browser desktop/mobile, busca/filtros, criação, links e render |
| Criação/consulta de processos e reabertura | direct | position_evaluation_processes; versão atual da Posição e gate de reviewer | SQL positivo/negativo, replay e disputa |
| Inclusão e acompanhamento Lista/Kanban | direct | criação implícita atual substituída; demais writers preservados | SQL inclusão/etapas/entrevista/decisão e browser dirigido |
| Avaliações/convites/resultado/histórico | plausible_indirect | ID explícito do processo, writers não alterados | contrato, SQL processo/avaliação e smoke de navegação |
| Auth/tenant/retorno | critical_transversal | authorize_position_follow_up, store por empresa e history | negativos/RLS/grants, navegação/back e isolamento |
| Score/Perfil/matching/ocupação | no_impact_identified | consulta somente de contagens, sem writers destes domínios | hashes/dados antes/depois e revisão de destinos |
| Parser/Synthesis/gateway/mail/Knowledge | no_impact_identified | sem contratos/transportes alterados | release plan e preservação dos runtimes |

Fechamento: todos D/P aplicáveis comprovados, documentação/contexto/CI, publicação seletiva banco e web e sincronização. Não executar suíte integral local por padrão.
