# AoT — preservação do primeiro acesso3.1.3

Acordo/execução: agreement-first-access-preservation.md1.0.0. Baseline895120b5ce2eeb979c9e4c5607ac906baf7b23e3; codex/preserve-first-access-v313, riscoD. Correção mantém versão3.1.3.

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline e preservação | Prova proporcional |
| --- | --- | --- | --- |
| Edição administrativa/status | direct | pending convertido em active no formulário e persistido pela RPC | UI real e SQL de edição entre grupos/payload active |
| Primeiro acesso/login/reset | critical_transversal | must_change_password ainda true no incidente; conclusão pela RPC3.0.7 | SQL conclusão/concorrência e Edges offline |
| Owner/grupos/empresas | plausible_indirect | save compartilhado com guard/lifecycle | regressão local Owner pendente não ativa grupo |
| Authority/RLS/memberships | critical_transversal | RPC service-only com actor e tenant revalidados | negativos e snapshots |
| Conta de Juliano | direct | auditoria user_updated de19/10 promoveu pending→active junto ao vínculo; sem first_access_completed; flag true | CAS/audit restrito ao incidente, vínculos e credenciais preservados |
| IA/Pessoas/Tokens | no_impact_identified | RPC de operador não chama IA nem altera esses domínios | revisão do diff/plano; sem chamadas externas |

## AoT

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D01 | formulário distingue habilitação e primeiro acesso; envia estado controlado | browser.json /27 checks em1448,390,320 | PASS |
| D02/P01 | status derivado sob lock na RPC | postgres.json /325 checks incluindo22 novos | PASS |
| D03 | conclusão/lifecycle/identidade preservados | PostgreSQL baseline/Owner/self-account e4 Deno reais/14 Node | PASS |
| D04 | reparo específico com lock/CAS, prova histórica e auditoria | production-database.json | PASS |
| P02 | sem IA/e-mail de teste; única escrita real é o reparo autorizado do incidente | recibos mínimos e fingerprints | PASS |

Sem QA remoto separado. Provas funcionais sintéticas locais; leitura produtiva comprova o incidente, não representa login humano. Rascunhos não rastreados preservados e excluídos da release/contexto.


Validação local:325 checks PostgreSQL17 em banco isolado PASS; migração não altera registros/ACL, edição entre grupos, payload active/mustChangePassword adulterado, inativação/reativação pendente, conta bloqueada, legado ativo sem timestamp, conclusão concorrente e automações Owner.4 testes Deno de handlers reais com transporte fake PASS;14 Node dirigidos PASS; root build, typecheck web/build web PASS (warnings existentes de chunks/dynamic import). Sem suíte integral local; CI obrigatória permanece.

UI real:27 checks em1448/390/320 PASS, três renders com estado pendente e formulário compacto, edição/salvamento e envio explícito de inactive, bloqueado desabilitado e active preservado. O label usa Pendente com explicação completa, evitando truncamento móvel. A investigação também mostrou que status não é um campo registrado no Form: o envio agora usa o estado controlado do Segmented. Seletores de dropdown/radio do harness precisaram ajuste; o popup sintético ficou fora do viewport. A prova visual limita-se a edição básica/status; a transferência entre grupos/empresas foi exercitada na RPC real PostgreSQL, sem extrapolar a evidência browser. Avisos de depreciação AntD são preexistentes, sem pageerror. Sem teste de acesso humano produtivo, envio de mensagem ou IA.


## Publicação e fechamento

SHA funcionalff26d790912b8af2ed16bb3f30700038511dab03, mesma versão3.1.3. CI branch39239657653 e main39239906858 SUCCESS. Dispatcher1.0.6 do diff com baseline confirmou somente database/web/documentação; Edge Functions/Parser/Synthesis/gateway/mail não foram publicados. Comandos de validação deduplicados; pnpm test integral sugerido pelo dispatcher foi substituído localmente pelos checks dirigidos acima, mantendo CI completa obrigatória. Ledger checker PASS, sem db push/replay histórico.

Migração aplicada20261019104726 preserva versão local20261019110000 por alias revisado. Fingerprint stripCR/trim exterior1.244 caracteres/SHA256972df8a54032a6ad1f8384f1bb214df3f816d195dccd3f351019d38a8ff15024 idêntico. Primeira comparação SQL btrim removeu só espaços e reteve newline final; método ajustado para whitespace exterior, sem alterar fonte. Guard instalado e RPC continua service-only. Backup da definição anterior restrito ao tmp ignorado; sem nova tabela/grant ou backfill.

Reparo de Juliano: conta bloqueada por lock, status active/activation_link/must_change_password true, timestamp exato da edição e evento histórico pending→active confirmados; qualquer alteração posterior ou first_access_completed abortaria. Somente status voltou a pending_first_access; flag/timestamp de primeiro acesso e grupo VCI Brasil/empresa VCI - Bauru preservados. Auditoria first_access_status_repaired anexada uma vez, ator sistêmico explícito, referência ao incidente/SHA; histórico original intacto. Fingerprints antes/depois iguais de todos os memberships, grupos, credenciais Auth e demais usuários;8 usuários/8Auth/10memberships. Não inferimos uso humano da ausência de login: a prova determinante é a transição administrativa auditada e o estado ainda pendente de definição de senha.

Webefc8034d3485 running/restarts0, rollback189593912b34 preservado. Smoke imediato404 na recriação;20 checks independentes de rotas/assets/SHA/versão3.1.3/textos novos e entry anterior HTTP200 após estabilizar, sem rebuild. Cinco serviços adjacentes mantêm imagem/início; Edges não alteradas. Produção: recibos production-database.json, production-hosting.json e production-public.json. Sem QA remoto separado, login humano autenticado, envio real de teste ou IA; o reparo é correção do dado relatado, não teste em usuário real.

D01–D04/P01–P02 PASS dentro das evidências delimitadas; sem desvio do acordo ou expansão F01. O status inativo agora usa explicitamente o estado do controle, evitando omissão no payload. Rascunhos não rastreados/locks/worktrees alheios preservados; manutenção automática Git reportou permissões antigas em worktrees, sem invalidar commits e sem limpeza. Snapshot rastreado protegeu o Context Pack. Fechamento documental/ledger segue para main/VPS sem nova construção ou publicação de runtime; sua CI permanece obrigatória.
