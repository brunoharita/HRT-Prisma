# AoT — Qualidade da importação de currículos em produção

Contrato de referência: `docs/qa/agreement-production-resume-quality-pipeline.md` 1.3.0.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | Validação e PDF.js nativo antes da IA | `nativeOnlyForParserIa` preserva todas as páginas e evita estruturação/OCR intermediário | teste dirigido de código, typecheck e build | 17 testes dirigidos aprovados localmente | PASS | Rollout remoto desta revisão ainda não executado |
| D-02 | Página nativa insuficiente segue no PDF completo para a IA | modo nativo preserva a página mesmo abaixo do limiar local e delega a validação final ao Parser IA | teste negativo de roteamento | Branch local aprovada; Parser IA continua validando fatos e referências | PASS | PDF image-only real ainda precisa de teste de qualidade após rollout |
| D-03 | Paddle e Tesseract desativados na importação automática | três entradas usam `nativeOnlyForParserIa`; modo força `baseline` antes de qualquer canvas/worker | teste dirigido, build e futura inspeção de rede | Código local não cria canvas nem carrega worker nessa rota | PARTIAL | Falta deploy e importação autenticada observando a rede |
| D-04 | Parser IA após etapa documental | Cliente autenticado, capacidade isolada e HTTP nativo preservando Host | 31 testes de gateway/parser e comparação ponta a ponta | Inferência nova anterior: 34.053 ms; retestes de 17/09 persistiram Documentos v2/v3 e abriram revisão com resultado de IA em cache | PARTIAL | Persistência e qualidade comprovadas; falta uma execução pós-rollout com inferência nova |
| D-05 | Sequência e falha explícita sem continuação local | Parser IA é pré-condição; CTA e estado `localRetry` foram removidos | teste dirigido de UI e mensagem de falha | 17 testes dirigidos aprovados localmente | PASS | Falha oferece nova tentativa, sem persistir perfil incompleto |
| D-06 | Transporte autenticado e mínimo | Gateway 1.1.0 valida origem, sessão, operador, papel, organização, contrato, PDF e hash; remove credenciais | `paddleGateway.test.mjs` e smoke público | 13 testes do gateway; origem indevida 403; sem sessão 401; portas VPS somente 127.0.0.1 | PASS | Sem conteúdo pessoal no smoke/logs |
| D-07 | Revisão humana preservada | Persistência continua usando o draft/evidência e fluxo de revisão existente | person-flow | publicação/revisão e proibições cobertas na suíte dirigida | PASS | Nenhum Perfil publicado nesta execução |
| D-08 | Limites operacionais sem teto financeiro do Prisma e sem retry | Worker loopback mantém 15 MB, 30 páginas, timeout, lock, cache e uma única chamada; não lê nem grava o ledger histórico para autorizar uso | `parserIaService.test.mjs`, gateway e cliente | ledger esgotado preservado e ignorado; códigos financeiros reais sanitizados; concorrência, timeout, cache e resposta limitada aprovados | PASS | Revisão ativa no frontend, gateway e worker; smoke não fez chamada paga |
| D-09 | Observabilidade aditiva | Migration `20260916203000_production_resume_quality_observability` | teste SQL e verificação conectada | migration aplicada; RLS ativo, 2 policies e 5 colunas estruturais presentes | PASS | Advisors não indicaram falha nova nesta tabela |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 a P-08 | Sem falso positivo por caracteres, chamada Paddle/Tesseract, segredo server-side no bundle, organização confiada ao cliente, fato sem referência, publicação, retry automático ou bloqueio financeiro local | gates negativos de domínio, gateway, parser e person-flow | ledger histórico esgotado não bloqueia nem é alterado; transporte só encaminha códigos fixos allowlisted | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 a F-04 | Diff não redesenha revisão, não troca fornecedor/modelo, não reprocessa histórico e mantém dependência do PC/túnel | PASS |

## Desvios do contrato

O teste autenticado contradisse a expectativa de fluxo completo: timeout documental perdeu a saída Paddle e o bloqueio global impediu a IA. Após o cooldown, apareceu uma segunda falha 502. D-03 e D-04 estão `FAIL`; a declaração anterior de ausência de desvios não se sustenta. Os PASS das demais linhas são provas dirigidas locais e não significam sucesso ponta a ponta.

## Reteste autenticado — 2026-09-16

- Operador selecionou o PDF de Ivan no navegador interno; o agente acionou Importar currículo. Nenhum conteúdo do currículo, segredo ou identificador de sessão foi registrado neste relatório.
- Gateway às 19:32:30 UTC: structure 504, 239.964 ms; às 19:32:31 UTC: parser 429, 620 ms.
- Paddle local teve atividade de CPU e respondeu 200 depois do timeout do navegador. Isso prova execução, não aproveitamento da saída nem sua qualidade.
- Repetição manual com leitura preservada às 19:36:27 UTC: parser 429, 827 ms. Após expirar o cooldown, às 19:37:59 UTC: parser 502, 538 ms.
- Ledger permaneceu em 6 tentativas, última de 2026-09-13, aproximadamente US$0,6402342 contabilizados. A chave está configurada e o processo escuta em loopback 8787; isso não prova a execução remota nem explica o 502.
- Correção local: capacidades separadas de Paddle e Parser IA, mantendo ambas as rotas Paddle serializadas, cooldown por serviço, autorização, orçamento e ausência de retry automático. Não há alteração de contrato persistido nem de payload; versões de transporte mantidas por ser correção interna.
- Regressão: 15 testes do gateway aprovados, incluindo timeout sem bloqueio cruzado, serialização das duas rotas Paddle, cancelamento, tenant, sessão, origem e contrato. Correção ainda não implantada em produção.
- Nenhum perfil publicado e nenhuma continuação pela opção de leitura local acionada. Tela e arquivo selecionado preservados.
- Pendências: concluir diagnóstico do 502, ajustar tratamento/duração da etapa Paddle com evidência, implantar correção autorizada e repetir o fluxo completo. Não foi demonstrado que o Parser IA aproveita a saída canônica Paddle; o adaptador atual relê o PDF original para suas próprias linhas-fonte.

## Mudanças autorizadas durante a execução

Autorização original registrada no contrato 1.0.0. Durante a execução, nenhuma ampliação adicional foi feita. A tag da imagem web foi mantida em `1.6.4`, pois correções não criam uma entrega de produto no registry.

## Validação final

- `pnpm run lint`: PASS, 511 arquivos.
- `pnpm run check:foundation`: PASS, 18 tabelas públicas e 6 versões de processamento.
- `pnpm run typecheck:web`: PASS.
- `pnpm run build:web`: PASS, 3.240 módulos.
- `pnpm run test:person-flow`: PASS, 229 testes.
- Testes específicos finais: PASS, 33 testes.
- `git diff --check`: PASS antes do commit inicial.
- Validação integral `pnpm run validate`: não executada; não foi autorizada e a regressão dirigida cobre o risco alterado.

## Git / QA / ambiente

- Branch: `codex/production-resume-quality-pipeline`.
- Implementação: `ee90d43e334901351a5dca948e32a06b5715e612`; alinhamento de tag: `b36287dc12f2e17c1827c18014fcd5a3dab1aa9d`.
- Supabase único `ioldpnqqvobprjiontre`: migration aplicada com sucesso; RLS/policies verificados.
- VPS: `prisma-web:1.6.4` e `prisma-paddle-gateway:1.1.0` ativos; imagem anterior preservada como `prisma-web:rollback-55733a0-resume-pipeline` e gateway anterior como `prisma-paddle-gateway:rollback-55733a0`.
- PC: Paddle 8080/8081 e Parser IA 8787 em loopback; túnel reverso expõe somente VPS loopback 18080/18081/18787.
- Smoke: site 200, Paddle 200/200, worker Parser alcançável, parser público 401 sem sessão e 403 com origem indevida.
- Smoke autenticado: executado com o arquivo selecionado pelo operador; falhou conforme reteste acima.

## Conclusão

Atualização autorizada pelo PO: `7aa8c53` implantado no gateway e worker reiniciado com telemetria mínima. Reteste comprovou `403 PARSER_LOCAL_ONLY`, origem do 502; teste de integração HTTP revelou que o fetch não preservava Host. Correção por HTTP nativo preserva o contrato de loopback, redirects bloqueados e AbortSignal; 31 testes aprovados, incluindo sanitização dos logs. Não altera payload/modelo/prompt e não exige nova versão persistida. A pendência do timeout Paddle continua; resultado do próximo reteste será registrado após o rollout.

Resultado final deste rollout: `9d4375b` implantado, serviço de IA reiniciado e reteste autenticado aprovado na etapa de interpretação. Worker 200/PARSER_OK, 34.053 ms; gateway 200, 35.013 ms. Ledger aumentou de 6 para 7 tentativas, custo US$0,0120815, resultado partial: 56 fatos aceitos, 9 experiências, 2 formações. A tela aguarda confirmação de identidade; nenhuma Pessoa criada ou Perfil publicado pelo agente. Smoke sem sessão 401, 31 testes dirigidos, lint e Context Pack aprovados. Imagem anterior preservada como `prisma-paddle-gateway:rollback-before-7aa8c53`; banco e frontend não alterados neste rollout.

Movimento geral permanece incompleto: D-03 FAIL por timeout Paddle e D-04 PARTIAL pela ausência de prova ponta a ponta até rascunho persistido. O reteste usou leitura preservada após o timeout, não uma nova execução Paddle. A utilização da saída canônica Paddle pelo Parser IA ainda requer validação/correção. Não declarar o fluxo completo corrigido.

## Comparação ponta a ponta — 2026-09-17

- Critério de sucesso endurecido: fluxo completo, persistência, revisão e maioria dos blocos reconhecida; velocidade isolada não aprova o teste.
- Com Paddle habilitado: preflight 55,6 ms, leitura nativa 237,0 ms e estrutura 240.012,3 ms. A etapa Paddle expirou com `provider_timeout`; rota efetiva `native-fast`. O fluxo posterior persistiu o Documento v2 e abriu revisão, mas D-03 permanece `FAIL`.
- Sem Paddle deliberadamente, em modo local `baseline` contra o mesmo Supabase: partes automatizadas concluíram em aproximadamente 3,51 s, excluindo a seleção humana da Pessoa. O Documento v3 foi persistido e a revisão abriu corretamente.
- A chamada da IA no cenário sem Paddle levou 114,7 ms porque reutilizou resultado previamente autorizado em cache. Uma tentativa de forçar inferência nova foi bloqueada antes do envio externo; não há novo custo nem nova resposta de IA nesta rodada.
- Qualidade dos dois resultados persistidos: 9/9 experiências com empresa, cargo e período; 6/9 descrições; 2/2 formações; 10/10 competências; 1/1 idioma; resumo e contatos recuperados. Principais resultados não foram separados em cartões próprios.
- O adaptador atual do Parser IA relê o PDF original e substitui as páginas recebidas pelas páginas PDF.js produzidas pelo próprio worker. Portanto, o fluxo ainda não demonstra consumo da estrutura Paddle pela IA.
- Relatório não técnico e tabela completa: `docs/operations/resume-import-e2e-comparison-2026-09-17.md`.

Atualização do estado: D-04 continua `PARTIAL`, mas a limitação mudou. A persistência do rascunho e a revisão agora estão comprovadas; falta uma única execução sem cache e falta provar que a saída Paddle, quando necessária, é realmente consumida. Nenhum Perfil foi publicado.

## Desativação temporária do Paddle — 2026-09-17

- Decisão do PO incorporada no contrato 1.1.0: durante o teste, PDF.js segue diretamente ao Parser IA e nenhuma rota Paddle pode ser chamada.
- Rollout de produção: checkout `9dfa4d4f5a26d04a81a4d9483fa8c1f1514b8d5a`; somente `prisma-web` foi reconstruído e recriado.
- Bundle público `index-DBBU_HLn.js`: `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline`, `VITE_PARSER_IA_MODE=hosted` e `VITE_PRISMA_GIT_COMMIT=9dfa4d43a0` confirmados no asset efetivamente carregado pelo navegador.
- Smoke: site HTTP 200 e tela autenticada de importação carregada. Gateway 1.1.0 permaneceu ativo; requisições sem contexto autorizado aos endpoints Parser e Paddle foram recusadas antes de qualquer documento.
- Rollback: imagem anterior preservada como `prisma-web:rollback-before-baseline-20260917`, ID `sha256:93421b4a57d...`; imagem ativa ID `sha256:f167b7327089...`.
- Validação dirigida: `pnpm run build` e 12 testes de `documentIntelligence.test.js` aprovados, incluindo default/valor desconhecido fail-closed para `baseline`.
- Nenhum currículo foi enviado após o rollout pelo agente, nenhum registro foi criado e nenhum Perfil foi publicado. A tela ficou aberta para o Product Owner executar o teste real solicitado.

Status deste adendo: configuração e proteção `P-02` em `PASS`; `D-03` permanece `PARTIAL` somente porque o aceite exige observar uma importação real pós-rollout sem chamada Paddle.

## Desativação temporária de todo OCR automático — 2026-09-17

- Decisão do PO incorporada no contrato 1.2.0: a importação passa da leitura nativa PDF.js diretamente ao Parser IA, sem Paddle e sem Tesseract.
- Nova importação, upload dentro da Pessoa e retomada de intake interrompido usam `nativeOnlyForParserIa`.
- Páginas com pouco ou nenhum texto nativo permanecem no conjunto enviado ao Parser IA; a validação local de 120 caracteres não impede essa chamada. Resultado inválido ou sem fatos suportados continua falhando fechado no Parser IA.
- A importação exige Parser IA ativo. A continuação pela leitura local, o estado `localRetry` e a mensagem que sugeria essa alternativa foram removidos.
- O modo nativo força `baseline` antes de qualquer provider, canvas ou worker OCR. O Tesseract continua instalado para reversão e para seleção manual de região durante a revisão, que ficou fora do escopo.
- Validação local: lint PASS em 513 arquivos; TypeScript raiz e web PASS; build web PASS com 3.238 módulos; 17 testes dirigidos e 230 testes do person-flow PASS; Context Pack gerado e verificado com 5 fontes canônicas e 2 artefatos.
- Rollout concluído no único ambiente remoto a partir de `ae9d46c`: checkout avançou por fast-forward e somente `prisma-web` foi reconstruído/recriado com `baseline`, Parser IA `hosted` e identificação da revisão. Supabase, gateway e workers não mudaram.
- Smoke pós-rollout: site HTTP 200; container `running`, zero restart; tela autenticada de Pessoas carregada. Imagem anterior preservada como `prisma-web:rollback-before-native-only-20260917`.
- Inspeção de rede e teste autenticado com currículo real ainda não foram executados neste adendo. Portanto D-03 permanece `PARTIAL` e a qualidade ponta a ponta permanece `NOT TESTED` para esta revisão.

## Remoção do teto financeiro interno — 2026-09-17

- Decisão do PO incorporada no contrato 1.3.0: nenhuma chamada pode ser barrada por `budget.json`, teto de US$ 2, número local de tentativas ou reserva estimada. A conta OpenAI é a autoridade financeira.
- O Parser IA não lê nem grava o ledger histórico. Um teste cria um ledger já esgotado, confirma uma única chamada ao fornecedor e comprova que o arquivo permanece idêntico. Ausência de ledger também não cria reserva.
- Tamanho, timeout, lock, serialização, cache, vínculo organização/hash e ausência de retry permanecem. A estimativa de custo continua apenas na proveniência da resposta concluída.
- Erros reais são reduzidos a códigos fixos: saldo/crédito, limite de gastos, rate limit, credencial ou falha técnica. O gateway encaminha somente a allowlist; conteúdo livre do fornecedor é descartado. A interface apresenta orientação específica sem detalhes técnicos ou dados do currículo.
- Validação local: build TypeScript raiz PASS; typecheck web PASS; lint PASS em 513 arquivos; build web PASS com 3.238 módulos; 33 testes dirigidos de Parser/gateway PASS; 230 testes do person-flow PASS. Nenhuma chamada real à OpenAI foi feita nessa validação.
- Rollout concluído com a revisão `42510b1`: checkout remoto em fast-forward, frontend e gateway reconstruídos/recriados e Parser IA local reiniciado em `127.0.0.1:8787`. Paddle, Supabase, modelos e ledger histórico não foram alterados.
- A primeira construção web usou o padrão `disabled` porque `.env.production` não continha `VITE_PARSER_IA_MODE`; isso foi identificado antes de qualquer currículo e corrigido imediatamente por novo build explícito com `baseline` + `hosted`. Nenhuma chamada de importação ocorreu nessa janela.
- Imagens ativas: web `sha256:d3fc7d56...` e gateway `sha256:a8fceee9...`, ambos `running` e zero restart. Rollbacks: web `sha256:f99c253d...` e gateway `sha256:b93d2d32...`.
- Smoke sem custo: site 200; bundle contém `42510b17de` e a nova mensagem de saldo; sessão sintética foi recusada 403 antes do documento; worker local recusou chamada fora do contrato com 403; túnel permaneceu estabelecido e a credencial foi validada sem exibição. Logs contêm somente rota, status e duração.
- Nenhuma chamada real à OpenAI foi feita no smoke. A classificação dos erros financeiros foi provada com respostas sintéticas nos testes; o saldo efetivo continuará sendo decidido exclusivamente pela OpenAI em uma importação real.

## Correção da persistência do LinkedIn — 2026-09-17

- Teste autenticado real de Julia: 20,8 s do clique à resposta do Parser IA, sendo 15,954 s no gateway; nenhuma chamada Paddle/Tesseract. O resultado foi `partial`, com 37 fatos aceitos, 6 experiências, 2 formações, 3 competências e 1 certificação.
- A persistência falhou atomicamente em `extraction_drafts_structured_summary_shape_check`. O rótulo visual `(LinkedIn)` foi incorporado ao endereço do perfil; não houve insuficiência curricular, falha OpenAI ou publicação de Perfil.
- Correção autorizada: conservar fato/evidência originais, remover somente o rótulo conhecido na URL canônica e converter endereço ainda incompatível em `null` com pendência humana. É proibido inventar URL, relaxar a constraint ou descartar outros campos do currículo.
- Replay privado do mesmo resultado já autorizado: contrato do LinkedIn aceito e contagens curriculares preservadas, sem nova chamada à OpenAI e sem gravação no banco.
- Regressão dirigida inicial: build TypeScript e 21 testes do Parser IA em `PASS`, incluindo rótulo de PDF, URL Unicode, retomada em memória e endereço incompatível levado à revisão.
- Estado deste adendo antes do rollout: implementação local `PASS`; produção e reteste autenticado `NOT TESTED`.
- Rollout frontend: `adb2416` ativo, HTTP 200, bundle `baseline` + `hosted`, container sem restart e rollback `prisma-web:rollback-before-linkedin-normalization-20260917` preservado.
- Reteste em aba efetivamente nova: identificação alcançada em 22,6 s. A constraint de resumo não voltou a falhar; após vincular à Pessoa existente, o Postgres revelou `evidence.fact` nulo para uma formação com instituição declarada e curso ausente.
- Segunda correção: migration `20260917143000_preserve_institution_only_education_evidence` mantém `evidence.fact NOT NULL` e usa curso ou instituição já declarada. Teste dirigido prova que texto citado não vira substituto e que a nulabilidade não é relaxada.
- A migration foi aplicada atomicamente no Supabase de produção e registrada isoladamente no histórico como `20260917143000`. A definição instalada foi conferida: `security definer`, `search_path` vazio e fallback curso → instituição presente; nenhuma migration histórica divergente foi reparada.
- Smoke autenticado pós-migration: 24,1 s do clique até a identificação, 11,2 s da seleção da Pessoa até o resumo da análise e menos de 1 s do comando de abertura até a rota de revisão. O tempo observado de ponta a ponta foi 51,9 s, incluindo as pausas deliberadas de observação e a seleção humana.
- Resultado preservado: 3 páginas nativas, 2.527 caracteres úteis, 5 seções, 6 experiências, 2 formações e 3 competências. O banco confirmou documento v3 `in_review`, revisão `draft`, tentativa `structured`, 8 evidências, `pages_native = 3`, `pages_ocr = 0` e ausência de código de falha.
- Estado atualizado deste adendo: normalização do LinkedIn em produção `PASS`; persistência acadêmica em produção `PASS`; fluxo PDF.js → Parser IA → revisão `PASS`. Nenhum Perfil foi publicado.

## Proteção de persistência para abas antigas — 2026-09-17

- Ocorrência: uma aba ainda carregava `index-B_XLiCcR.js`, enquanto o servidor já entregava `index-DscR-FoQ.js`. A tentativa criou nova Pessoa e repetiu `extraction_drafts_structured_summary_shape_check`; documento v1 `failed/not_ready`, sem revisão e sem Perfil publicado.
- Implementação: migration `20260917154500_harden_linkedin_draft_persistence` com normalizador privado, idempotente e gatilho anterior à constraint. A cópia de revisão recebe a mesma canonicalização do frontend; páginas e texto de origem não mudam. Tipo não textual continua sob a constraint existente.
- Proibições preservadas: nenhuma constraint relaxada, nenhuma URL inventada, nenhum grant novo, nenhuma publicação, nenhuma chamada OpenAI e nenhuma exclusão do cadastro incompleto.
- Evidência local: 27 testes dirigidos, lint de 515 arquivos e `validate:person-flow` `PASS` nas quatro fases; os auto testes SQL cobrem rótulo conhecido, endereço incompatível e tipo malformado.
- Evidência remota: aplicação atômica, gatilho ativo, URL rotulada convertida para `https://www.linkedin.com/in/synthetic-profile`, URL de empresa convertida em `null`, e `anon`/`authenticated` sem execução. Histórico registra somente `20260917154500`.
- Estado: proteção servidor `PASS`; reprocessamento real do documento falho `NOT TESTED` por exigir nova operação e possível chamada paga. O cadastro incompleto continua preservado até decisão explícita de exclusão.
