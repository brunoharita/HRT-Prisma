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
| D-07 | Registry2.2.1, ownerUX/current-state/AoT, publicação seletiva e sincronização | Tipos/build/testes/contextos, CI branch/main, plano/recibos/production-after.json | PASS | Somente web; fechamento documental sem rebuild |

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
| Release/contexto/web | direct |2.2.0, VPSsrv1038882, baseline remoto conferido | production-before/after.json, CI branch/main, plano seletivo/rollback | PASS |

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

CI inicial37842206736 interrompeu publicação antes de main/produção: o novo aviso de falha da exclusão não continha ação própria exigida pelo contrato de avisos acionáveis. Incluído Voltar à posição no aviso, preservando retry explícito na confirmação. Regressão dirigida adicional `tests/tooling/actionableNotices.test.mjs` (3checks) cobre69avisos. Sem redução do teste ou mudança de escopo.

## Git / produção / conclusão

Branch de implementação `codex/position-overview-v221`; entrega integrada por fast-forward na main da origem oficial GitHubHRT-Prisma. SHA funcional publicado `eac1a9dbfa1db0448a039c6d76b52da0440a5d7f`. CI branch37842890634 e main37843025560 success;831testes/golden/demo/ledger/scriptseletivo/auditoria PASS. CI inicial falhou antes de produção e foi corrigida como registrado acima; nenhuma proteção removida.

Plano/ensaio derivam35arquivos: web/hosting/documentação/contextos/testes, sem banco, Edge, Parser ou Synthesis. Dispatcher executou push/CI/integração main/build/recriação somenteweb. O curl imediato recebeu404 durante recriação e encerrou com22; não foi repetido o deploy. Smoke posterior independente confirmou estabilização:17HTTP200 e13checks PASS, SHA e2.2.1 no bundle, layout/centralização no CSS, assets antigos/novos disponíveis. Recibo `publication-recovery.json` distingue a falha transitória do resultado operacional verificado.

Web novo container22fe0573, imagem5300ddffa5b81c6faa535ee4fa6bb4d0a5a944f427d059f1ba0361a9c48f58c6 running/zero reinícios. Rollback `prisma-web:rollback-before-eac1a9dbfa1d` preserva imagemf8349547 anterior. Parser/Synthesis/gateway conservam exatamente IDs/imagens/reinícios; Parser/Synthesis healthy. Nenhuma mutation/IA/dado real de teste. Baseline e conclusão em production-before.json/production-after.json.

Fechamento documental/evidências/contextos em main, com push/pullff da VPS e sem novo build. Registros locais/origin/main/VPS sincronizados na verificação final; runtime conserva SHA funcional acima. Arquivos alheios não rastreados e worktrees preexistentes preservados. Avisos de manutenção automática de worktrees durante o dispatcher não impediram integração; nenhum worktree removido pelo movimento. Servidores temporários de testes encerrados.

Todos os D-* e P-* aplicáveis PASS, F-01 preservado; sem desvio material. Entrega funcional/visual comprovada com componentes reais e dados sintéticos. Jornada autenticada real permanece NOT TESTED e não é inferida do smoke público.
