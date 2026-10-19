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
| D07 | validação offline concluída; integração/rollout ainda pendentes | seção final de publicação será acrescentada após smoke | PARTIAL |
| P03 | nenhuma inferência/envio de teste real/novo segredo; HTTP fake e localhost restrito | handlers, Deno e browser sem rede externa | PASS local |

303 checks PostgreSQL17 isolado PASS (inclui baseline multiempresa/identidade/Owner e regressão após guard),9 testes de handlers reais com transporte injetado PASS,4 testes Deno de Edges reais anteriores PASS,18 Node dirigidos PASS,52 checks browser desktop/celular PASS e5 guards de carregamento/avisos PASS e22 tooling PASS. Tipos/build root e web, Deno check PASS; warning de chunk>900kB existente. Sem suíte integral local; CI continua obrigatória.

Falhas intermediárias corrigidas: fixture de grupo precisava configuração lifecycle, import NodeNext explícito, nomes acessíveis dos campos readonly e alinhamento do grid. Seletores do harness foram ajustados para loading/diálogo e espera da atualização React. Conferência da implementação oficial do Auth identificou revogação de sessões na troca de senha; o fluxo foi estabilizado com recibo service-only vinculado a intent, informação prévia e retorno ao login, mantendo D05/A01. Quatro screenshots representam dados fictícios equivalentes; não comprovam login humano ou entrega de e-mail em produção. Avisos do Modal estático pertencem ao guard existente, preservado neste movimento.

Baseline operacional: main9b627381; web3.1.2; Supabase ioldpnqqvobprjiontre, sem QA remoto separado. Arquivos não rastreados preexistentes preservados e excluídos do Context Pack por snapshot dos documentos rastreados. Não há desvios do escopo; pendência operacional D07 impede declarar conclusão até publicação/smoke/sincronização.

CI inicial39189537275 recusou dois contratos da nova página (aviso sem ação e operação sem registro no indicador global). Corrigidos com focusNoticeFields e useLoadingFeedback existentes;5 checks em snapshot rastreado PASS,52 checks browser PASS (inclui foco do campo e callback de novo login). A cópia não rastreada ProcessAssessmentPage (1).tsx interfere no inventário local; foi preservada e excluída da prova por snapshot, como no checkout limpo da CI. Sem mudança no backend/SQL para essa correção.
