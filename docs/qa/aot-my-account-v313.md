# AoT — Meu cadastro3.1.3

Acordo e execução my-account-v313 v1.0.0. Baseline9b6273813fefbcfe3b4a51bb773f854796cca64f. Implementação em codex/my-account-v313; riscoD.

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / preservação | Validação / fechamento |
| --- | --- | --- | --- |
| Próprio cadastro/menu/sessão | direct | menu apenas Sair, edição administrativa existente | quatro perfis, UI, sessão/IDOR/CAS |
| Identidade/contato/senha/envio | critical_transversal | ADR086, username único, e-mail compartilhável, Auth UUID/senha e Resend atuais | handlers fake, SQL, login/reset e e-mail sem envio real |
| Owner e administração | direct | criação automatizada, lifecycle3.0.7 | bloqueio de username na UI/backend, regressão Owner/autoridade |
| Memberships, RLS, recuperação | critical_transversal | escopos/roles e first-access existentes | snapshots/negativos, sessão revogada, integração SQL |
| Dados de Pessoa, Tokens, IA | no_impact_identified | cadastro de operador é distinto; nenhuma chamada/integração comercial nova | revisão das superfícies e snapshots de autoridade |
| Layout/navegação | plausible_indirect | shell, guard de alterações, tokens visuais compactos | renders/ações em desktop/celular e regressão shell |

Provas funcionais sintéticas/offline; smoke produtivo não cria/edita usuários nem envia e-mail. Sem referência visual normativa nova. Reuso de Auth/Resend/shared/guard documentado no ADR086 e owner; sem nova biblioteca ou credencial.

## Acordos, implementação, teste e evidência

| ID | Implementação / preservação | Evidência | Estado |
| --- | --- | --- | --- |
| D01 | Meu cadastro no menu, rota autenticada sem membership obrigatório e leitura para quatro perfis | browser/checks.json e SQL | PASS local |
| D02 / P02 | nome/celular/username, revisão otimista; Owner bloqueado UI/handler/trigger, incluindo administração | SQL duplicidade/reservado/Owner/concorrência e browser | PASS local |
| D03 / P01 | alvo/sessão JWT verificados, auth.sessions/not_after, role/status/first-access e whitelist | SQL negativos de sessão/overposting, handlers payload inválido/IDOR/limite | PASS local |
| D04 | código vinculado a conta/sessão, hash, TTL/limites/cancelamento, contato compartilhável e antigo preservado | handlers9; SQL expirado/lock/reenvio/replay/CAS; UI | PASS local |
| D05 | senha atual/8caracteres/checks, Auth API e novo login; recibo recente após revogação | SQL receipt após delete da sessão/imutabilidade, handler de senha/falha de auditoria, browser callback | PASS local |
| D06 | autoridade/memberships/audit/CAS, shell atualizado, guard e layout compacto | snapshots SQL; substituição Owner real após trigger; Deno login/reset; renders1448/390 | PASS local |
| D07 | validação offline, CI, integração, migração, Edges e web publicadas | production.json, production-public.json e production-edge-http.json | PASS |
| P03 | nenhuma inferência/envio de teste real/novo segredo; HTTP fake e localhost restrito | handlers, Deno e browser sem rede externa | PASS local |

303 checks PostgreSQL17 isolado PASS (inclui baseline multiempresa/identidade/Owner e regressão após guard),9 testes de handlers reais com transporte injetado PASS,4 testes Deno de Edges reais anteriores PASS,18 Node dirigidos PASS,52 checks browser desktop/celular PASS e5 guards de carregamento/avisos PASS e22 tooling PASS. Tipos/build root e web, Deno check PASS; warning de chunk>900kB existente. Sem suíte integral local; CI continua obrigatória.

Falhas intermediárias corrigidas: fixture de grupo precisava configuração lifecycle, import NodeNext explícito, nomes acessíveis dos campos readonly e alinhamento do grid. Seletores do harness foram ajustados para loading/diálogo e espera da atualização React. Conferência da implementação oficial do Auth identificou revogação de sessões na troca de senha; o fluxo foi estabilizado com recibo service-only vinculado a intent, informação prévia e retorno ao login, mantendo D05/A01. Quatro screenshots representam dados fictícios equivalentes; não comprovam login humano ou entrega de e-mail em produção. Avisos do Modal estático pertencem ao guard existente, preservado neste movimento.

Baseline operacional: main9b627381; web3.1.2; Supabase ioldpnqqvobprjiontre, sem QA remoto separado. Arquivos não rastreados preexistentes preservados e excluídos do Context Pack por snapshot dos documentos rastreados. Não há desvios do escopo. Os rótulos PASS local identificam a prova funcional; publicação/smoke abaixo complementam a conclusão.

CI inicial39189537275 recusou dois contratos da nova página (aviso sem ação e operação sem registro no indicador global). Corrigidos com focusNoticeFields e useLoadingFeedback existentes;5 checks em snapshot rastreado PASS,52 checks browser PASS (inclui foco do campo e callback de novo login). A cópia não rastreada ProcessAssessmentPage (1).tsx interfere no inventário local; foi preservada e excluída da prova por snapshot, como no checkout limpo da CI. Sem mudança no backend/SQL para essa correção.

## Publicação e smoke

Versão3.1.3, SHA funcionala6d6a238abb010fdab8df5e2fdc20c0c7fcaae08. CI obrigatória branch39189878619/main39190011867 SUCCESS. Dispatcher1.0.6 confirmou exclusivamente migração, operator-self-service/platform-users e web; não publicou Parser/Synthesis/Knowledge/outros destinos. Migração operator_self_account20261019022718 equivale canonicamente à local20261018230000 (stripCR/trim,14891 caracteres,SHA256726a36e271ee986592872c9fb6b2e8d16fa93fb942a546149e8491bbe984a493). Esquema aditivo sem backfill,8 usuários/8AuthUsers/10memberships e fingerprints de dados/Owners iguais antes/depois. Nenhuma edição de conta real; zero solicitações de e-mail/intents de segurança criados para teste.

RLS das duas tabelas privadas, negação de acesso direto inclusive service_role e RPCs service-only conferidos; trigger Owner ativa. Leitura privilegiada de metadados do contrato para quatro perfis usou identidades/sessões existentes e ROLLBACK; sessão ausente negada. Não representa login humano ou prova de escrita. HTTP real da Edge sem autenticação401, preflight200/CORS; nenhum e-mail ou IA. Funções ACTIVE: operator-self-service1 e platform-users11, JWTtrue, fontes equivalentes. GetEdge de platform-users omite prefixo supabase/functions no caminho; comparação foi por caminho relativo da função e conteúdo normalizado, sem diferença real.

Web189593912b34 running0, entry index-C22fNyK9.js; rollback8c6c75a9fe84 disponível. Smoke imediato retornou404 durante recriação; verificação independente depois confirmou12 rotas/assets HTTP200 e sete invariantes de SHA/versão/menu/rota/backend/regra Owner/custos anteriores, sem rebuild. Outros cinco serviços mantêm imagem/início e não foram recriados. Documentação/ledger/recibos têm fechamento posterior sem novo build.

D01–D07/P01–P03 PASS dentro das evidências identificadas; F01 preservado (guard de username Owner é preservação da regra, sem nova administração de terceiros). Limites: sem QA remoto separado, sem jornada humana autenticada produtiva, sem troca real de senha/contato ou entrega de e-mail de teste. Rollback conserva esquema, trigger e histórico, restaura fontes/imagem consumidoras e não executa down destrutivo. Encerramento exige sincronização documental e sua CI, sem reabrir a implementação.
