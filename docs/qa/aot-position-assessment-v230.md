# AoT — Avaliação para Posição v2.3.0

09/10/2026. Agreement/Execution v0.5.0 congelados pela ordem explícita do PO de implementar, integrar main e publicar2.3.0. Baseline31d5965ade8f834da538561972bc5a5fc9d76e90; branch codex/position-assessment-v230. Entrega integral publicada, SHA funcional3e271e32d6e9c7b7bd3b77571507ccd71d037956 em main/origin/VPS. Template docs/qa/aot-template.md.

## Matriz de Acordos

| ID | Implementação | Teste / Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-01 | Ação contextual após acompanhamento, workspace não cria registros | assessment-sql/sql.txt; browser/checks.json; baseline-follow-up/sql.txt | PASS | Sintético local, sem criar candidato em produção |
| D-02 | Configuração/requisitos/versão/snapshot/revisão otimista persistidos | SQL, domínio, browser/configuration-*.png | PASS | Imutabilidade/versionamento negativos |
| D-03 | Banco/IA/Misto explícitos, déficit por requisito/dificuldade, geração manual | Deno/runtime e SQL/budgets; browser/composition-*.png; production/benchmark.json/functions.json | PASS | Benchmark vivo sintético estrutural/técnico; dificuldade não calibrada; revisão humana obrigatória |
| D-04 | Cinco alternativas distintas/uma correta/justificativa; catálogo privado compatível | SQL inválidos/tenant/cópia contextual; domínio | PASS | Itens antigos de quatro opções intactos/inelegíveis |
| D-05 | Registry e distribuição exata1–5, múltiplos10, snapshot | Domínio, SQL20nível3=6/8/6, composition12+8 | PASS | Sem arredondamento/admin novo |
| D-06 | Editar/substituir/aprovar, revisão final, snapshot imutável | SQL pendências/cópia banco; browser/review-*.png | PASS | Aprovação humana não fabricada |
| D-07 | Fila/claim/lease/token/override e Resend idempotente, dispatcher no Synthesis | email-transport.txt; Deno; SQL configuração/fila; disputa lease; production/schema.json/resend-credential.json/smoke.json | PASS | Instalação protegida/chave autenticada e dispatcher conferidos; nenhum envio real nem entrega alegados |
| D-08 | Portal/instruções, buffer/autosave/retomada/revisão/comprovante, correção backend | SQL tokens/prazo/revogação/replay/submit; browser/portal-*.png; disputa autosave | PASS | Sem gabarito/nota no portal, sem LLM para corrigir |
| D-09 | Foco/mouse/zoom/atalhos por instância/versão, sequência/tempo/método/dedup | Domínio/atividade, SQL events/replay, browser/result-*.png | PASS | Sinais parciais/lacunas/suporte explícitos |
| D-10 | Limites antes/durante/depois, sem fraude/decisão/captura universal | Negativos payload/keylogging/clipboard, render portal/resultado | PASS | Sem destino de janela/coordenadas/imagens |
| D-11 | Resumo/respostas/gabarito/atividade privados, consulta auditada | SQL roles/tenant/auditoria; browser/result-*.png | PASS | Humano decide no acompanhamento |
| D-12 | Auth/RLS/tenant/versão/secret/PII/auditoria; loading/erro/retry preservam escolha | SQL/grants,43Deno, browser rede falha/retry38checks | PASS | Testes reais de Pessoas NOT TESTED |
| D-13 | Metadados2.3.0, plano seletivo, docs/contexto, main/produção/smoke | production/ci.json/functions.json/migrations.json/smoke.json; Context Pack e sincronização | PASS | Mesmo SHA funcional; fechamento documental sem rebuild |
| D-14 | ai_requests + ai_usage_events v2 e todos os consumidores runtime | SQL56, consumidores Node/Deno, disputa do mesmo attempt; production/schema.json/functions.json/smoke.json | PASS | Ativação remota e um pedido/tentativa de benchmark de plataforma; sem backfill/cobrança |

## Proibições verificadas

| ID | Implementação / teste negativo | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Nova submissão preserva Score/Perfil/Posição/etapas; sem etapas ambíguas | SQL snapshots e baseline48 | PASS |
| P-02 | Sem IA/aprovação implícitas, gabarito público, reescrita histórica/promoção global | SQL e browser leituras sem generate/send | PASS |
| P-03 | Override só convite, fila não é envio, aceitação não é entrega; nenhuma mensagem a candidato real | Deno/email/SQL e execução | PASS |
| P-04 | Só sinais limitados, nenhuma imagem/clipboard/keylog/coordenada/decisão | Domínio/coletor/SQL/render | PASS |
| P-05 | Tenant fail-closed, mínimo contexto, ledger sem prompts/PII/secrets, nenhuma automação de Score/etapa | SQL56+63, consumidores e source review | PASS |
| P-06 | Quatro migrations aditivas, sem db push geral; não alegar rollout até recibos | Plano/diff e este AoT | PASS |

## Mapa de Impacto e Preservação

Mapa docs/qa/impact-position-assessment-v230.md revisado antes da integração D-14: Parser/Synthesis/matching/Knowledge/gerador legado e novo são consumidores diretos; shell/portal/auth são transversais críticos. Baseline live do VPS srv1038882 e Supabase ioldpnqqvobprjiontre conferidos. Novo fluxo não reutiliza mutação legada de matching na submissão. Original catálogo quatro opções/política desabilitada preservados.

| Capacidade protegida | Baseline | Regressão / Evidência | Status |
| --- | --- | --- | --- |
| Acompanhamento/Score/Perfil/Posição | main31d5965, QA local vazio |48baseline e SQL novo antes/depois submit | PASS |
| Banco histórico/catálogo compartilhado | Itens legados intactos |28testes legados prévios; SQL copy-on-edit/erasure | PASS |
| Parser/ingestão/cache/recovery | Runtime hosted existente | Testes serviço/hosted/recovery e consumer ledger | PASS |
| Synthesis/fontes/revisão/diagnóstico | Worker existente1.1 | Testes worker e ledger, fila de convites isolada | PASS |
| Matching duas leituras/cache/conflito | Handler atual |35Deno incluindo provider/cache/tenant/revisão/ledger | PASS |
| Knowledge políticas/opt-in/globais | Handler atual e3normalização | Teste quatro consumidores e normalização, custo platform | PASS |
| Auth/portal/loading/shell | Tokens/componentes atuais |38browser sem exceções/IO externo +SQLnegativos | PASS |
| Gateway/Traefik/Paddle | IDs/imagens live antes | production/smoke.json: IDs/imagens/restarts preservados, controles HTTP mantidos | PASS |

### Novidade e preservação

Nova jornada contextual completa, portal/correção/atividade, fila de e-mail e ledger genérico instrumentado. Preservação comprovada pelos testes dirigidos, sem transformar baseline ou smoke público em prova de candidato real. Não há QA remoto separado. QA local teve arquivo físico legado profile_synthesis_jobs ausente; baseline vazio e guardado permitiu TRUNCATE transacional local com ROLLBACK para recriar a relação somente na fixture. Não houve reparo/limpeza de produção ou uso de dados pessoais reais.

## Fora de escopo preservado

F-01..F-04 PASS: sem admin distribuição/proctoring/canais extras, automação de decisão/cadastro/Score/global, candidato real fictício, novo fornecedor/ambiente/plano pago, preço/fatura/pacote/cobrança. Aviso final/expurgo temporal adiados explicitamente pelo PO; exclusão explícita/direitos permanecem.

## Evidência de fidelidade visual

Referências normativas: três imagens1536×1024 com dois estados cada, inspecionadas diretamente. Dados sintéticos equivalentes Ana Martins/Desenvolvedor backend/20questões/40min/nível3 e12+8; renders1448×980 e390×980 fullPage, sem rótulos externos de proposta. Comparação de regiões normalizada ao retângulo de cada estado (referência tem dois painéis numa imagem), não identidade pixel.

| Critério | Render / Comparação estrutural | Divergências e autonomia | Status |
| --- | --- | --- | --- |
| D-UX-01/02 | configuration/composition-*.png: shell/contexto/4etapas/principal2:1/resumo; requisitos antes parâmetros; modos/filtros/tabela e déficit/IA lateral | Sidebar/componentes/tokens atuais; Select nível em vez de cartões, decoração A-01; quantidades reais têm paginação | PASS |
| D-UX-03 | review/invitation-*.png: questão/5opções/gabarito/justificativa/editar/substituir/banco; revisão e envio laterais | Textos/contagens reais, campos acessíveis e prazo datetime A-01; ordem/ações preservadas | PASS |
| D-UX-04 | portal-*.png: topo compacto/contexto/tempo; navegação esquerda/questão central/info direita; mobile centro primeiro/nav recolhível | Tokens atuais, aviso parcial explícito; sem sidebar admin | PASS |
| D-UX-05 | result-*.png: resultado privado/abas/contagens/tabela/timeline/limites/volta | Tabela paginada cinco para densidade/mobile, A-01; dados ilustrativos não viram fatos | PASS |
| P-UX-01 | Nenhum menu novo Avaliações/Relatórios; topologia e ordem aprovadas reconhecíveis | Sem desvio material identificado | PASS |

## Desvios do contrato

Nenhum desvio material de comportamento identificado. Adaptações menores A-01 acima. Decisão superveniente do PO supersede Q-04c e congelou v0.5.0 com aviso/expurgo adiados; não é parecer jurídico nem base legal inventada. Obrigações operacionais concluídas nos recibos abaixo.

## Validação final

SQL local: 63asserções novas,56histórico e48baseline, sempre ROLLBACK;95testes Node dirigidos,43Deno,20tooling,38checks browser e3disputas reais por conexões independentes. Tipos/build PASS. Sem suíte integral local. Evidências na pasta evidence/position-assessment-v230.

Context/lint/foundation PASS no snapshot exato preparado para commit, excluindo untracked alheios sem apagá-los:1180arquivos no lint/18tabelas e6contratos de versão na foundation. Root lint anterior varreu dumps alheios em output e falhou por whitespace; não constitui defeito corrigido nem autorização para alterar esses arquivos. Gerador/checker e own-diff PASS; fechamento documental repete apenas checks afetados. CI obrigatório GitHub branch38001471365/main38001581033 success,868testes/868pass/0fail; nenhuma suíte integral local executada.

## Git / QA / ambiente

Baseline31d5965; codex/position-assessment-v230. SHA funcional3e271e32 em main/origin/VPS e runtime2.3.0. Quatro migrations remotas20261009225307/26/32/37 equivalentes aos payloads revisados dos arquivos locais20261009140000/150000/160000/170000, SHA256 de statements conferido; sem replay/db push histórico. position-assessment v1 ACTIVE/custom auth; matching-trajectory v18, knowledge-agent v20 e assessment-item-generator v7 ACTIVE/JWT preservado. Parser/Synthesis healthy0restarts; web running0restarts. Gateway/Traefik/Paddle mantêm exatamente IDs/imagens/restarts anteriores. Paddle piloto já unhealthy no baseline, fora do plano e não apresentado como recuperado.

Bootstrap único consumido; Resend ciphertext backend-only, segredo dispatcher e token worker de propósito restrito instalados por SSH stdin/DPAPI, modo400 UID1000 nos arquivos de runtime. Valores nunca registrados em Git/SQL/logs/argumentos. Resend alcançou validação422 de payload vazio sem destinatário, comprovando autenticação sem produzir mensagem. Dispatcher200/processed0 e negação de segredo inválido; token worker válido recusou escopo platform com AI_HISTORY_WORKER_SCOPE_DENIED/42501. Browser não lê credencial e bootstrap consumido recusa reinstalação. Contagens remotas:0avaliações/0tentativas/0entregas,1pedido/1evento exclusivamente benchmark; nenhum candidato/Perfil/decisão fictício produtivo.

Benchmark sintético único:10itens,6easy/3medium/1hard, cinco alternativas distintas/uma correta/justificativa; inspeção técnica dos gabaritos PASS. gpt-5.6-luna/Responses/store:false/sem tools/identidade,377entrada+1907saída,17.345ms, custo estimadoUS$0,0023638/custo observadoNULL. Pedido920758b4-8746-4a0e-a618-a5883ef5662d de platform concluído succeeded; não salvo no banco de questões nem aplicado a candidato. Dificuldade nominal/distratores não certificam calibração, equidade ou todas as gerações futuras; itens continuam pending_human.

Smoke50checks PASS em production/smoke.json: versão/SHA no bundle,14assets atuais/anteriores, cinco rotas200, portal no-store/no-referrer, Nginx válido/readiness privado, gateway autenticado recusando chamadas anônimas, ações de operador401, convite inexistente403 sem gabarito, origem indevida403/contrato antigo409, controles secretos e serviços preservados. release-web.sh recebeu404 transitório imediatamente após recriação; aplicação estabilizou e passou sem reconstrução adicional. Imagens rollback-before-3e271e32d6e9 das três superfícies preservadas; schema aditivo/filas/histórico/cache permanecem no rollback, sem apagamento. Arquivos alheios preservados.

Jornada autenticada de Pessoa real, envio/entrega real de e-mail, calibração/justiça empírica: NOT TESTED e não alegados como aceite. Smoke adicional em navegador contra produção ficou NOT TESTED por restrições locais de rede/execução do Chrome; não substitui os38checks visuais locais nem os50checks HTTP/runtime remotos. Aviso final/expurgo temporal: adiados por decisão explícita do PO. Nenhum parecer jurídico ou consentimento inventado.

## Conclusão

Entrega integral2.3.0 publicada e verificada. Todos os D/P aplicáveis PASS nos ambientes/cenários acima. Fechamento documental/contextos sincroniza main/origin/VPS sem reconstruir o runtime funcional3e271e32.


CI inicial38001052095 negou a integração: teste de versão ainda esperava2.2.1 e três avisos novos de erro não tinham ação no próprio Alert. Corrigidos o teste oficial de2.3.0 com histórico preservado e os avisos com retry contextual. Regressão dirigida productRelease/actionableNotices, tipos e38checks browser; nenhuma produção alterada durante a falha.
