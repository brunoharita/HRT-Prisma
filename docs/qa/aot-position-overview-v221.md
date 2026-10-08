# AoT — Detalhes da Posição alinhados ao Perfil, v2.2.1

Contrato `agreement-position-overview-v221.md` v1.0.0; execução `execution-position-overview-v221.md`. Autorização explícita de Bruno: implementar a proposta revisada em main e publicar2.2.1. Baseline0684d086ec820bf99ac961123223dca99e38e45d, runtime anteriorad55395ab95db8ee5cda824835705f5ac43e7ac1. Classe C, frontend integrado limitado. Evidência retida em `evidence/position-overview-v221/`.

## Matriz de acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | Cabeçalho, metadados existentes, ações e exclusão confirmada com loading/erro/tentativa | browser-results.json, preservation-results.json, estados occupied/delete-error | PASS | Componentes reais com serviços sintéticos |
| D-02 | Quatro abas em faixa branca; Pessoas/Acompanhamento abrem rotas existentes; histórico mantido | Mouse/teclado1537/390, versão6 no histórico, rotas registradas | PASS | Sem mutar Pessoa real |
| D-03 | PositionOverview: painel branco72/28, missão e dois destaques com ícones centrados/acento curto |50cenários1813/1537/768/390/320, renders e geometria | PASS | Categorias/origens preservadas acrescentam altura necessária |
| D-04 | Sidebar com contexto, referência e acompanhamento; componente completo em drawer | Origem, três blocos completos, explicação/histórico sob demanda, correção, Escape/foco | PASS | Snapshot estrangeiro/obsoleto/desconhecido não divulgado |
| D-05 | Listas/categorias/origens/ocupação/metadados preservados, ausências explícitas, pendências acionáveis | empty/long/occupied/pending/ambiguous/unresolved, testes domínio/taxonomia | PASS | Conteúdo de exemplo restrito à fixture |
| D-06 | Reflow, fontes, teclado, foco, loading e erro preservados | Shell real1813/1280/1024/768/390/320, pending/load-error/delete-error | PASS | Sem overflow da página; abas pequenas usam menu existente |
| D-07 | Registry2.2.1, ownerUX/current-state/AoT, publicação seletiva e sincronização | Tipos/build/testes/contextos e produção a completar | PARTIAL | Publicação/CI/smoke ainda pendentes |

## Proibições verificadas

| ID | Guardrail / prova negativa | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Topologia preservada; fixtures isoladas; vazio explícito | Renders, empty/long, diff | PASS |
| P-02 | Sem SQL/backend/IA/matching/permissões; somente load/history na consulta; drawer não chama preview; taxonomia não vira requisito | Diff, serviços sintéticos com chamadas externas bloqueadas e métodos inesperados que falham | PASS |
| P-03 | Sem biblioteca/reset global; Perfil/Kanban completos preservados | CSS restrito à Posição,4destaques/6áreas Perfil,25checksKanban | PASS |

## Mapa de impacto e preservação

| Capacidade / área | Relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- | --- |
| Detalhe da Posição | direct |0684d086, mesma fixture/v6/1537x1023 | before-1537.png, approved-mock.png, overview-reference-1537.png e50cenários | PASS |
| Referências/fontes/categorias/origens | direct | Componente existente e snapshotsM7.1 | Drawer reutilizado, origem, explicação/histórico, correção, tenant/título/versão inválidos | PASS |
| Navegação/edição/exclusão/histórico | direct | Rotas/cancelamento auditável existentes | Mouse/teclado, confirmar/cancelar/erro/retry, metadados ocupados e histórico | PASS |
| Perfil/Kanban/indicadores | plausible_indirect | Mesmo arquivo de páginas; CSS de Perfil/foundation inalterado | Perfil1537/390,4ícones centrados/6áreas;25checksKanban/descoberta/score/entrevista/decisão/erro; CSS novo escopado | PASS |
| Loading/acessibilidade | critical_transversal | useLoadingFeedback e controles AntD | Skeleton sem ações provisórias, feedback até conclusão/erro, foco/Escape/teclado/reflow | PASS |
| IA/dados/tenant/backend | no_impact_identified | Contratos/serviços inalterados | Zero chamadas externas/IA, snapshot inválido sem divulgação; diff e plano de release | PASS |
| Release/contexto/web | direct |2.2.0, VPSsrv1038882, baseline remoto conferido | production-before.json; publicação, CI e smoke a completar | PARTIAL |

Novidade: hierarquia e divulgação progressiva da Posição. Preservação: todos os dados/funções existentes, sem mudança de contratos persistidos. Nenhuma dependência arquitetural nova; Modal controlado preserva confirmação e recuperação após falha sem rejeição não tratada. Referência do título/tenant/contrato validada como no painel existente. Não há QA remota separada usada; testes locais determinísticos não provam jornada autenticada real, que permanece NOT TESTED.

## Fora de escopo

F-01 PASS: resultados/Perfil/Kanban/editor não redesenhados; nenhuma métrica ou decisão automática, nenhuma mutação real para teste. Reutilização de componentes/AntD/tokens sob A-01. Sem dependência nova.

## Fidelidade visual

| Referência / viewport | Estado/dados | Render | Comparação | Adaptação | Status |
| --- | --- | --- | --- | --- | --- |
| approved-mock.png1537x1023 | Desenvolvedor backend, v6, não ocupada, mesmos textos/listas | overview-reference-1537.png; overview-1537.png completo | Cabeçalho/ações, abas superiores, painel branco principal, missão, dois destaques azuis, sidebar contextual alinhada e ícones centrados preservados | Tokens/componentes reais do Perfil, títulos de cards com divisória AntD, categorias de requisitos e lista de contexto preservadas; altura cresce sem truncar | PASS |
| Perfil fornecido pelo PO | Estilo/escala; conteúdo próprio da Posição | profile-preserved-1537.png, shell-1813.png | Azul claro, acento curto, suportes pequenos centrados, pesos e ordem de informação | Dados ilustrativos não copiados para produto | PASS |
| Transformação responsiva | Mesmo estado / telas390/320 e shell real | overview-390.png, shell-390.png, empty/long/pending-390.png | Leitura antes do contexto, cartões empilhados, ações acessíveis, sem overflow | Navegação lateral existente e menu das abas permanecem | PASS |

Sem desvio material do contrato. Nenhuma alteração adicional de produto solicitada durante a execução. As adaptações listadas preservam dados e componentes sob A-01; identidade de pixels não é requisito.

## Validação local

64testes dirigidos (release, inteligência de vagas, taxonomia, acompanhamento, UX) PASS;19tooling PASS. Browser:50cenários responsivos e interações com364registros (314checks +50geometrias),29checks preservação/erros/shell/Perfil,25checksKanban PASS. Tipos/build web e raiz, lint/foundation/Context Pack/diff-check PASS. Contextos gerados/verificados em cópia limpa dos arquivos rastreados para preservar documentos alheios não rastreados. Avisos preexistentes de chunks/importação dinâmica não impedem build. Testes sem banco produtivo, IA paga ou publicação de Perfil real.

## Git / produção / conclusão

Branch `codex/position-overview-v221`, origem oficial GitHubHRT-Prisma. Baseline local/origin/main/VPS0684d086 conferido. production-before.json registra webf8349547 running0 e Parser/Synthesis/gateway existentes preservados antes da mudança. Publicação seletiva, CI, smoke, rollback e sincronização ainda pendentes; movimento ainda não encerrado nesta revisão.
