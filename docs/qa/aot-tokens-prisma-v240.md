# AoT — Tokens Prisma v2.4.0

Contrato: `docs/qa/tokens-prisma-v240.md` Agreement/Execution v1.0.0, aprovação explícita de Bruno, incluindo escala ×1.000 e versão final2.4.0. Baseline f3fa07bed260f3bdac87f6faf10cf1ce6d90bea5. Risco D/E; ADR-083. Este fechamento separa fixtures de rollout produtivo.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limite |
| --- | --- | --- | --- | --- |
| D-01 | Conta tenant, franquia1m, tipos/formatadores | SQL71novos, browser54 | PASS | Unidade comercial, sem equivalência técnica |
| D-02 | Catálogo3pacotes e tarifas versionadas, cotação/pedido congelados | SQL catálogo/pricefreeze; cadastro browser | PASS | Oferta configurável, margem não aferida |
| D-03 | Ensure privado, aniversário/mês curto, período atual apenas, pending quota/day | SQL ciclos/skipmonth/dia31/transição; disputa renovação | PASS | Consulta calcula reposição, sem backfill |
| D-04 | Modal avaliação, hints de upload/recovery/documento, síntese explícita; wrappers3consumidores | SQL3consumidores, Node transporte/cache/Synthesis, Deno5, browser avaliação80/síntese8 | PASS | Sem provider pago; hints/readiness não executam IA |
| D-05 | Locks org→objeto, FEFO, reserva/débito/release/reconcile | SQL negativo/falha/entrega/quotes/15min;5disputas | PASS | Worker que encerra fora da completion pode exigir conciliação |
| D-06 | /tokens, saldo/origens/validade/tarifas/filters/tabela desktop/lista mobile | SQL papel/ownhistory; browser4viewports | PASS | Grandes volumes históricos não aferidos |
| D-07 | Pedido assistido e estados; pagamento explícito com referência | SQL state/pay/replay; browser bloqueio sem confirmação e liberação sintética | PASS | Nenhum pedido/pagamento produtivo de teste |
| D-08 | /platform-tokens,4abas, versões/franquia/ciclo/concessões/conciliação/custos | SQL super-only; browser cadastro/configuração/payment; técnico desconhecido explícito | PASS | Super registra verificação comercial real |
| D-09 | Warning<20%, quote10min, loading/drafts/fail/retry/idempotency | SQL insuficiência/expiry; browser refresh preserva conteúdo, erro conserva modal, mesma chave; quoteService dedup/binding | PASS | Resposta incerta nunca vira zero |
| D-UX-01/02 | Shell, saldo dominante, métricas secundárias, funções/como funciona/histórico, modal discreto/mobile | visual/reference-state-1513.png,company390 e token-confirm390; comparação abaixo | PASS | Adaptações de escala/ênfase/pacote autorizadas |
| D-10 | Ownerdocs/ADR/contextos/testes, publicação seletiva2.4.0 | SHA2998ea1, CI branch/main, migrations/Edge/3runtimes,26HTTP+9DB, preservação | PASS | Jornada autenticada real NOT TESTED |

## Proibições verificadas

| ID | Prova negativa | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Consultar/publicar Perfil não enfileira; Score/Perfil/Posição preservados; questões5alternativas/revisão humana; navegar não gera | SQL79baseline+71novo, Node assessment/synthesis, browser80, Deno | PASS |
| P-02 | Anon/inativo/role/tenant/DML/quote/lease/payment negados; não backfill; payload minimizado/segredos sanitizados | SQL/concorrência/transporte; hash produtivo igual | PASS | |
| P-03 | Nome próprio, tabela/quantidade acessível, escala sem alegar token fornecedor | UI/ownerdocs | PASS |

## Mapa de Impacto e Preservação final

| Área | Relação | Baseline e regressão | Evidência / status |
| --- | --- | --- | --- |
| Créditos/catálogo/RPC | direct | Nova camada privada;71SQLnovos,5disputas, quoteService | PASS local |
| Assessment/geração/modal/Edge/portal | direct | v2.3.5;79SQLbaseline,28Nodeassessment,5Deno,80browser | PASS sintético |
| Parser/cache/transporte/todas entradas | direct | Cache e original preservados; worker/recovery/hosted/gateway/benchmark | PASS sintético + runtime/codehash/health produtivos |
| Synthesis/queue/request/complete | direct | Modelo/perguntas/fontes intactos;40Node+SQLcompletions/publicação/consulta/lease/retry/erasure | PASS sintético + ID/imagem/restarts preservados |
| Shell/navigation/loading | critical_transversal | Tipos/build,9Nodeestado/navegação/coverage, browser4larguras | PASS sintético |
| Ledger técnico/matching/Knowledge | plausible_indirect | Private history reutilizado, meta somente, matching/global sem inclusão comercial | SQL/server review e Nodehistory PASS |
| Convites/e-mail/candidatos | plausible_indirect | Portal1,5alternativas/outbox/lease preservados | SQLbaseline,assessmentNode/Deno/browser PASS |
| Gateway | direct (reclassificado) | Quote precisa atravessar proxy; publicação isolada adicionada | Gateway/tooling PASS |
| Paddle/mail/Traefik | no_impact_identified | Sem alteração de arquivo/config e publicação--no-deps; IDs/imagens/restarts antes/depois | IDs/imagens/restarts iguais antes/depois PASS; Paddle unhealthy já no baseline |
| Dados históricos/trabalho alheio | critical_transversal | Migration aditiva/sem backfill; root untracked preservados; hashes agregados produtivos | Local PASS; counts/hashes produtivos iguais PASS |
| Release/versão/contexto | direct |2.4.0, plano SHA, checks próprios, Context Pack | Local e rollout PASS |

Descoberta principal: síntese anteriormente enfileirava durante publicação/consulta. Guard novo evita execução paga sem ação explícita. Member conserva direito de síntese, sem ampliar gerador/Parser. Cotação de síntese ligada à versão exibida pelo adapter; previews concorrentes compartilhados e hints sincronizados. Transporte gateway foi reclassificado antes de publicar. Uma análise anterior continua visível enquanto nova base aguarda solicitação; ação explícita de gerar/retry e cotação acessíveis também nesse estado (8checks browser). Nenhum serviço novo, lib/provider/modelo novo ou checkout.

## Fora de escopo

F-01 preservado: diff não inclui checkout/cobrança automática/e-mail novo/mensalidade SaaS/matching/Knowledge/infra nova. PASS.

## Fidelidade visual

Referências originais são inspiração de conteúdo, normativas de topologia; estão em visual/reference-01-administracao.png/02-avaliacao.png/03-mobile.png. Screenshot financeiro anexado é contraexemplo do problema. Dados ilustrativos, sem autoridade de pagamento.

Comparação mesma viewport1513×1033 e estado: saldo5.800×1.000, plano3.800×1.000, adicionais2.000×1.000, consumo1.200×1.000, franquia5.000×1.000, renovação01/11; funções650/350/200×1.000. Histórico preserva40/10/0×1.000 com linhas anteriores que explicam o agregado, sem dados reais. Render visual/reference-state-1513.png. Saldo à esquerda dominante, métricas secundárias à direita, funções/como funciona lado a lado, filtros no cabeçalho/tabela abaixo. Em390/320, saldo completo e métricas2col com títulos completos, cards/filtros empilhados e histórico em lista; sem overflow global. Referência mobile transformada ao shell atual. Confirmação avaliação80checks e token-confirm1448/390/320: quantidade/déficit, consumo em texto secundário, ação abaixo, sem dinheiro.

Adaptações autorizadas: escala×1.000, consumo menos destacado, Comprar→Solicitar pacote, shell/acessibilidade real, catálogo/pedidos/validade abaixo do histórico. Indicador geral do plano suprimido para reduzir ênfase conforme PO; barras por função conservadas. Sem desvio material não aprovado.

## Validação local

150SQLPASS (79históricos+71comerciais),5disputas PostgreSQL17 descartável (DB própria removida), Node dirigidos143+9+10+5+3=170PASS,5DenoPASS,54browserTokens+80browseravaliação+8browserSíntesePASS. Types raiz/web/Parser, builds raiz/web, lint, foundation, Context Pack/ledger PASS. Ledger histórico divergente mantém dbPushAllowed=false. Dispatcher é roteador; pnpm test integral sugerido pelo plano substituído pela regressão dirigida conforme AGENTS§10, sem executar validate integral local. CI remoto branch/main success (882 testes cada).

Avisos conhecidos: chunks web grandes/import estático+dínamico e PDFfontwarnings de fixtures. Não são regressões deste movimento. Sem chamadas pagas, sem perfil/pagamento/decisão real fictícia. Sem QA remoto separado; provas sensíveis executadas no local descartável antes da produção autorizada.

## Git / produção / conclusão

Worktree codex/tokens-prisma-v240 isolado; main/origin/VPS receberam por fast-forward o SHA funcional `2998ea1ee05759562a9caa0c778a186161d33d57`. CI branch38101524418/main38101652685 success,882testes cada, incluindo lint/types/build/foundation/contexto/ledger/auditoria de dependências do workflow existente. Primeiro CI falho corrigido antes do rollout, sem contornar gate. O dispatcher publicou branch; promoção main feita no checkout canônico porque main já estava aberta nele, sem force-push.

Migrations novas aplicadas individualmente em ioldpnqqvobprjiontre: `20261011012432`/`20261011012443`, statements SHA256 iguais aos arquivos locais. Ledger recebeu somente essas duas observações; snapshot histórico/divergências e cliDbPushAllowed=false preservados. Dez tabelas privadas com RLS e DML/SELECT negados para anon/authenticated/service_role;12writers privados inacessíveis;7wrappers públicos/assinaturas/search_path e guard de síntese conferidos. Catálogo3pacotes/tarifas3, zero pedidos/débitos comerciais de teste. Edge position-assessment3 ACTIVE, custom auth/JWTfalse anteriores preservados e2arquivos idênticos ao código validado.

Somente gateway/Parser/web reconstruídos com --no-deps. Web2a593110 running0; Parser8542b81c healthy0; gatewaycf414afd running0/socket válido. Codehash de Parser/gateway igual ao checkout. Synthesis/mail/Paddle/Traefik preservaram IDs/imagens/status/restarts. Paddle já estava unhealthy e segue assim; não declarado saudável. Rollbacks `rollback-before-2998ea1ee057` mantêm imagens anteriores7b3355a7/786219d0/d061cea3. Probe imediato web404 durante recriação estabilizou em200 sem reconstrução adicional;26checksHTTP PASS, incluindo SHA no bundle, CSS, assets/worker/asset antigo e negativas anônimas RPC/Edge/gateway. Browser produtivo renderiza login v2.4.0 nas rotas protegidas.

Pessoas11/Perfis15/Avaliações2 mantêm counts e hashes íntegros. Nenhum Perfil/questão/pagamento/pedido real foi fabricado ou IA paga chamada para testar. Journey autenticada com dados reais e operação comercial real NOT TESTED: browser disponível sem sessão; testes de tela completos usam transporte sintético e banco descartável. Carga em grandes históricos, margem comercial e qualidade empírica de IA não aferidas neste movimento. Desvios de contrato: nenhum; limitações explícitas mantidas.

Evidências: `docs/qa/evidence/tokens-prisma-v240/production/` contém plano/dry-run/Git, CI, fingerprints, grants/RLS/catálogo, runtimes/rollbacks/codehash, hashes protegidos, HTTP e leitura browser. Fechamento documental/contextos/ledger sincroniza Git/VPS sem reconstruir o runtime funcional.

A CI inicial38101216159 detectou aviso novo sem ação contextual. Corrigido: falha da consulta oferece nova tentativa; falha comercial aparece no próprio modal e permite repetir com a mesma chave. Auditoria de79avisos (3Node) e54checks browser nas4larguras PASS; tipos/build web repetidos PASS. O primeiro SHA não foi publicado em produção.
