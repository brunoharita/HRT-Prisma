# AoT — Acompanhamento Pessoa–Posição v2.2.0

Contrato de referência: `docs/qa/agreement-position-follow-up-v220.md`1.0.0; execução associada. PO Bruno autorizou implementação/main/publicação em08/10/2026. v2.2.0 publicada, SHA funcional `87a18653f136750cd777978352e4d6d5de9bdfab`; fechamento documental posterior preserva esse runtime.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-01 | Contexto Posição, Lista/Kanban | PositionFollowUpPage, rotas/abas | browser-results + routes | PASS | Browser sintético dirigido |
| D-02 | Inclusão explícita e independente | AddToPositionFollowUp + RPC add | SQL idempotência/duas Posições, browser descoberta | PASS | Browser sintético dirigido |
| D-03 | Lista/filtros/indicadores | projeção filterFollowUp e Table/mobile | testes Node + browser | PASS | Local sintético |
| D-04 | Quatro colunas e concluídos | followUpColumns, estados RPC | Node/SQL/browser | PASS | Local sintético |
| D-05 | Arraste/Escape/alternativa/concorrência | alça nativa, Select, revisão RPC | mouse real/Escape/teclado/falha/conflito | PASS | Browser sintético dirigido |
| D-06 | Cartão aprovado sem denominador | identidade/título/idade/score azul | browser e visual | PASS | Local sintético |
| D-07 | Detalhe/fontes/versões/rascunho | Drawer, Profile, score snapshot, guard | browser e regressão Pessoa | PASS | Local sintético |
| D-08 | Entrevista explícita opcional | RPC schedule/cancel, fuso validado | SQL e interviewInstant Node | PASS | Sintético, nenhum convite |
| D-09 | Decisão/encerramento/reabertura | RPCs separadas, justificativa | SQL, sem preseleção browser | PASS | Browser sintético dirigido |
| D-10 | Score independente | read-only matching states/evaluations | SQL invariância +96Node +6browser estável | PASS | Sem IA/Pessoa real |
| D-11 | Autorização/tenant/PII/audit | RLS/revokes/definer auth.uid + payload/revisões | SQL negativo/rotas/backend-release | PASS | Corpos remotos 3/3 iguais, RLS/grants conferidos |
| D-12 | Estados/mobile/versionamento/release | skeletons, loading escopado, registry/context | testes dirigidos, CI, rollout/smoke/rollback | PASS | 2.2.0 publicada; jornada autenticada real NOT TESTED |
| D-UX-01 | Shell/header/abas/indicadores/quatro colunas | tokens/componentes reais Prisma | renders desktop/referências normativas | PASS | Dados iguais, viewport equivalente |
| D-UX-02 | Detalhe lateral/mobile legível | Drawer, seletor de coluna/filtros | renders390x844 | PASS | Full-screen, sem corte/overflow horizontal |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Sem decisão/score/idade inventados | arraste não agenda/decide, score salvo/indisponível | sql.txt/browser | PASS |
| P-02 | Sem contaminação Perfil/ocupação/Knowledge | invariância e independência por Posição | sql.txt + diff | PASS |
| P-03 | Sem recálculo operacional/client score | payload forged recusado e invariância | SQL + stable regression | PASS |
| P-04 | Sem sobrescrever/PII/acesso ampliado | SQL auth/tenant/revision/grants/minimização | sql.txt | PASS |
| P-UX-01 | Sem descaracterizar referência | topologia, arraste, numeral sem denominador/mobile próprio | renders/browser | PASS |

## Mapa de Impacto e Preservação

Baseline main8b34391ca904bcac8f66283cf3b91a95f06a462c, v2.1.7; rastreados inicialmente limpos. Arquivos alheios não rastreados preservados. Mapa inicial no acordo.

| Capacidade / área | Relação | Impacto previsto | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- | --- |
| Posição/descoberta/comparação | direct | ação humana independente + aba |105testes Node,6cenários stable browser, routes,25checks browser novo | PASS |
| Banco/RPC/histórico | direct | tabelas/RPCs novas | PostgreSQL17 localhost55479 vazio, rollback; sql.txt | PASS |
| Auth/tenant/PII | critical_transversal | mesmo acesso de Posições | negativos SQL/rotas/sem contato/DOB/currículo integral | PASS |
| Score/Perfil/fontes | plausible_indirect | apenas referências/leitura | SQL snapshot78 inalterado;96Node +6browser estável | PASS |
| Pessoa/navigation/visual | plausible_indirect | links na rail existente |15cenários browser Pessoa e7tooling, preserva72/28 | PASS |
| Parser/Synthesis/Knowledge | no_impact_identified | nenhum runtime/dado/prompt alterado | diff/plano sem deploy, IDs/imagens/restarts preservados | PASS |
| Versão/contexto/release | direct | geração2/movimento2/entrega0 | registry/contexto/CI/rollout/smoke/rollback | PASS |

### Novidade e preservação

Persistência operacional própria; decisões contextuais de matching permanecem distintas. Nova consulta auxiliar minimizada no Perfil, extraída em componente próprio para não importar a página de Posição nem suas dependências. QA remoto separado inexiste: fixtures locais precedem a aplicação aditiva autorizada no remoto único. Produção não é alvo de testes que criem decisões fictícias.

## Fora de escopo preservado

F-01/F-02: nenhuma integração/calendário/mensagem/candidatura pública/backfill/IA/Parser/Synthesis/Knowledge/fórmula/redesign global. Diff/plano e invariância confirmados; nenhuma biblioteca adicionada.

## Evidência de fidelidade visual

Referências `references/position-follow-up-v220/kanban.png` e `drag.png`. Mesmo conjunto fictício: Rafael64 sem idade; Marina78/32; Joana81/38 entrevista agendada; Pedro76/41 decisão aguardando; Posição Coordenação de Operações v3, Avaliação01 ativa, não ocupada, indicadores4/1/0.

| Referência / viewport | Render | Comparação estrutural | Divergências | Status |
| --- | --- | --- | --- | --- |
| Desktop /1448x980 | kanban-desktop.png, drag-desktop.png, list-desktop.png | shell navy, header/abas/indicadores/toolbar/quatrocolunas, cartão compacto, score tonal azul, alça/ações | tokens/shell reais, ícones/textos adaptados; topologia e hierarquia preservadas | PASS |
| Mobile /390x844 | kanban-mobile.png, detail-mobile.png | coluna selecionada, cartão inteiro, detalhe full-screen | filtros recolhíveis, menu/abas responsivos; conteúdo sem corte/rolagem horizontal | PASS |

## Desvios do contrato / mudanças autorizadas

Nenhuma mudança material de comportamento proposta. Comparação visual desktop/mobile conferida nos renders sintéticos. Fechar processo preserva etapas individuais, conforme D-09; não cria rejeições. Arraste por toque é coberto pela alternativa mobile aprovada, não prometido como interação nativa.

## Validação final

- SQL local transacional com fixtures sintéticas, rollback e 44assertivas/negativos: PASS.
- Node dirigido:105/105 PASS (96 de matching/loading/versão/acompanhamento +9 de exclusão definitiva) (score, estabilidade/orquestração, Posições, revisão, loading, versão, filtros/fuso).
- Tooling de rotas/feedback:7/7 PASS; avisos com recuperação contextual:3/3 PASS; release tooling:19/19 PASS.
- Browser Score:6/6cenários PASS,1280/390, sem chamadas externas/erros. Nova evidência em regression-stable-score; evidências históricas originais preservadas.
- Browser Pessoa:15/15cenários PASS,2048/1024/390/1448, incluindo falhas/rascunho/member/recruiter; regression-person.
- Tipos web e build raiz: PASS. Build web final: PASS, com avisos de chunk/import dinâmico conhecidos.
- Browser novo:25/25 checks PASS, mouse/teclado/escape/falha/conflito/entrevista/decisão/rascunho/filtros/descoberta/mobile/sem acesso. Sem chamadas externas ou IA.
- Lint/foundation/contexto/diff check PASS em cópia dos rastreados, excluindo arquivos alheios não rastreados. Plano oficial: somente migration nova e web, sem Edge/Parser/Synthesis. Ledger local PASS, db push permanece bloqueado.
- CI final branch37822940856 e main37823360589 success: validação completa automática,831 testes PASS, golden/demo, ledger, script e auditoria sem vulnerabilidades conhecidas. Sem suíte completa local adicional.

A primeira CI (37822369879) detectou três avisos novos sem ação inline. Corrigidos com retry explícito na inclusão, navegação em acesso negado e foco contextual no formulário de validação, preservando o rascunho. Browser acrescentou provas de foco/retry; CI final passou antes de publicar.

## Git / QA / ambiente

Branch técnica `codex/v2-m2-position-evaluation-v220`, baseline8b34391. Remote oficial e VPSsrv1038882 /opt/prisma conferidos. Supabaseioldpnqqvobprjiontre ACTIVE_HEALTHY/PG17.6.1.155. Não existe QA remoto separado.

Baseline VPS: web imagem0d6a7664, container6b2f1e20; Parser imagem8682af7d/containered00303a; Synthesis imagem8526717f/container9c0944d4, todos running/0reinícios. Gateway2eed2dd3/d061cea3 running0. Container experimental paddle-vl-llama-test já estava unhealthy no baseline e permaneceu intocado; não é o Parser IA publicado.

### Publicação e preservação operacional

Branch integrada por fast-forward em main. SHA funcional `87a18653f136750cd777978352e4d6d5de9bdfab`; fechamento documental/contexto posterior sincroniza local/origin/VPS sem rebuild. Plano e recibos em `evidence/position-follow-up-v220`.

Migration remota `20261008181745_position_follow_up`, arquivo local `20261008120000_position_follow_up.sql`; alias registrado sem reparar/reaplicar histórico. Corpos das três funções comparados por hash e iguais; RLS nas três tabelas, grants diretos revogados inclusive service_role; duas RPCs somente authenticated, helper privado. Tabelas novas vazias antes do frontend: nenhum processo/decisão fictício em produção. `backend-release.json`.

Advisors: [RLS sem policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) INFO14→17 corresponde às três tabelas intencionalmente fechadas ao acesso direto. [Definer authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) WARN101→103 corresponde às RPCs revisadas com auth/tenant internos. Nenhuma nova função anon; dois avisos anon anteriores e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) permanecem preexistentes. Não é prova de ausência universal de risco.

Somente prisma-web recriado: imagem `58b326d654a5f00b8769652538fdb5ab07e85caeea7b5f610a78a11c2ce4796c`, container2ea49f6b8de5, running0. Rollback `prisma-web:rollback-before-87a18653f136` aponta à imagem anterior0d6a7664. Rollback retorna a imagem web e conserva tabelas/dados/histórico; nenhuma exclusão de registros. Parser/Synthesis/gateway mantêm IDs/imagens/restarts do baseline, Parser/Synthesis healthy.

Smoke público:21HTTP200 incluindo rotas/assets novos e antigos,10checks SHA/versão/funcionalidades/estilo/loading/negação anônima PASS. Ambas RPCs sem credenciais retornaram401. Site `https://prisma.hrtsolutions.com.br`, entry `index-CNZ6sVmM.js`; deploy concluiu sem404 transitório. `production-smoke.json`, `publication.json`, `release-plan.json`, `infrastructure.json`.

Limites: concorrência coberta por negativos de revisão, locks transacionais e conflitos de UI, sem benchmark de transações paralelas. Exclusão definitiva da Pessoa preserva o contrato anterior e remove seus registros dependentes; operações de acompanhamento não apagam histórico. A vaga backend citada na conversa é exemplo de utilização, não cadastro a criar em produção.

## Conclusão

PASS para os D/P e critérios aplicáveis: v2.2.0 publicada com frontend e persistência operacional. Jornada autenticada com Pessoas reais em produção permanece NOT TESTED; fixtures, HTTP/bundle e metadata não comprovam essa jornada nem qualidade universal dos Perfis ou justiça de decisões humanas. Nenhuma decisão real foi fabricada.
