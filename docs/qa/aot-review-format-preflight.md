# AoT — Validação antecipada de formatos, complemento v2.0.3

Contrato: [agreement-review-format-preflight.md](agreement-review-format-preflight.md), 1.0.0, decisão de Bruno em 04/10/2026. Baseline main/origin/VPS `d207e114412893037021d9697426fe697a3f2f72`, web `cacc388d16aea712e57249547e8191247b4a0c30`, Parser `96e3ecba4696994993e9b661ec37ae0ff49a3c5f`. Risco D; validação proporcional, sem suíte integral local.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- |
| D-01 | Diagnóstico inicial/reativo e Input vermelho com mensagem/aria; resumo e campo de conteúdo personalizado respeitam limite existente | 61 testes dirigidos; navegador local, segunda experiência e segunda/terceira formação, correção sem reload | PASS | Dados sintéticos; inclui ISO impossível antes da normalização |
| D-02 | Formatos parciais aceitos, aviso amarelo para ambiguidade/Atual sem início; vazio opcional preservado | 52 golden cases TS/SQL; normalização/importação preservam texto inválido, fato/evidência e política de século | PASS | Sem exigir ou inventar precisão |
| D-03 | Resumo com links, tab/registro por ID estável e foco; ajuda ligada ao input; destaque removido ao corrigir | Edge headless: 16 verificações no viewport 1416 e 390; fonte preservada e sem overflow horizontal; renders vermelho/amarelo | PASS | Fixture local sem API/gravação, não smoke autenticado |
| D-04 | Helpers privados, gate somente save/approve após auth/replay/lock; ingestion e histórico intactos | 117 verificações PostgreSQL local, cinco publicações sintéticas/replay/rollback, auth/tenant/stale, erro/caminho/ordinal e grants | PASS | PostgreSQL descartável, não banco produtivo |
| D-05 | Docs/contexto, migração seletiva e rollout web/Parser no mesmo SHA | CI branch/main, SQL remoto/grants, HTTPS/assets/readiness/rollbacks e smoke sintético no container PASS | PASS | SHA funcional d88fbff, real autenticado NOT TESTED |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem invenção/fato negativo, dúvida bloqueante, reescrita de evidência, enfraquecimento de auth/tenant/replay, decisão humana real fictícia | Golden/SQL/navegador e negativos; apenas dados sintéticos em QA local, DDL produtivo revisado, sem mutação de dados pessoais | PASS |

## Mapa de Impacto e Preservação

| Capacidade | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Revisão, foco, save/compare/publish | direct | Campos já tinham validação inicial; agora datas/avisos/resumo e navegação correta. 61 dirigidos, navegador e SQL real local | PASS |
| Auth/tenant/locks/replay/auditoria/histórico/evidência | critical_transversal | RPCs SECURITY DEFINER e grants existentes preservados; negativos/rollback/pub/replay na fixture local | PASS |
| Normalizador e ingestão/Parser hospedado | direct | Descoberta: ISO impossível podia virar intervalo. Guard anterior à normalização mantém texto revisável; 26 worker/cache/recovery/hosted/benchmark e teste Parser sem provider | PASS |
| Datas/educação/cálculo válido | plausible_indirect | `resume-dates-1.1.0`, política 2050, precisão/origem e método raiz preservados; testes datas/educação e 52 exemplos de paridade | PASS |
| Matching/Knowledge e gateway | plausible_indirect / no_impact_identified | Nenhuma fórmula/taxonomia/curadoria/prompt/infra alterados; proteção de data inválida não cria fato útil, cálculo válido coberto; gateway baseline running/0, imagem d061cea | PASS |
| Web/Parser na VPS | direct | Rollout d88fbff; web 4111e55, Parser 8682af7 running/0 e Parser healthy; gateway d061cea preservado; HTTPS/assets/readiness e rollbacks PASS | PASS |

### Novidade e preservação

- Nova: diagnóstico explícito de datas impossíveis/invertidas, aviso não bloqueante, resumo/foco no item correto, ajuda acessível e gate SQL selecionado.
- Preservada: campos obrigatórios atuais, confirmação acadêmica antes de publicar, precisão parcial, fonte/listas/evidências, isolamento e operação transacional, composição da revisão e escolha humana.
- Mapa revisado: normalizador compartilhado participa de importação/Parser, portanto precisa de atualização do runtime hospedado; não muda parser raiz, modelo, prompt, método de datas válidas ou cache bruto. Campo existente de período em ensino médio com problema fica disponível para correção, sem torná-lo obrigatório.
- Limite: baseline não prova comportamento autenticado de Pessoa real; esse smoke permanece NOT TESTED. QA de banco e navegador são sintéticos.

## Fora de escopo e desvios

F-01 preservado: sem novos campos/modelo de contato, pontuação/cálculo válido, regra de data futura, modelo/prompt/OCR/infra, saneamento histórico, biblioteca ou redesenho. Ajuste técnico necessário registrado no mapa: normalizador compartilhado e rollout de Parser. Não há nova decisão de produto nem publicação real de Perfil.

## Evidência visual

Não há nova referência normativa a copiar. Reuso do destaque e da composição existentes, com resumo antes das abas e ajuda abaixo do campo. Fixture: `tests/ui/review-format.html`, config correspondente e mobile iframe com viewport real 390. Evidências locais ignoradas: `tmp/review-format-run-1416.json` e `tmp/review-format-run-390.json` (16 verificações cada, PASS), `tmp/review-format-error-1416.json`, `tmp/review-format-error-390.json`, `tmp/review-format-warning-1416.json`. Renders inspecionados: `tmp/review-format-desktop.png`, `tmp/review-format-red-mobile390.png`; wrapper vermelho/input vermelho/explicação/fonte preservada, colunas empilhadas no mobile. Iframe é apenas o harness para contornar largura mínima de janela headless, sem alterar viewport interno. Helpers CUA/sky falharam no carregamento de assets; Edge já instalado permitiu render/teste local sem autenticação ou alteração de segurança.

## Validação e segurança

254 testes person-flow PASS; 61 testes dirigidos PASS (`reviewFieldLifecycle`, `reviewOperationErrors`, `resumeDates`, `parserIa`); 26 testes de worker/cache/recovery/hosted/benchmark PASS. SQL `node scripts/verify-import-evidence.mjs 55479 import_evidence_v202_final --formats`: 117 verificações PASS com ROLLBACK, incluindo 52 exemplos de paridade, caminhos de formação 2 e legado 3, conteúdo importado inválido ainda revisável, rejeição de save/pub sem mutação, correção, save permitido de aviso, replay, stale e tenant. Chaves de operações rejeitadas não persistem. Helpers sem EXECUTE para anon/authenticated; RPCs conservam SECURITY DEFINER/search_path/grants. Originais/cache não são exportados ou saneados. Body MD5 baseline remoto: save `a84454eac23697744733e38ed55570a5`, approve `c69dd4ac889e5281feefc8292010243a`.

Tipos web e harness, build TypeScript/web e compilação do Parser PASS. Lint no índice limpo (807 arquivos), foundation (18 tabelas/6 versões), Context Pack e 18 testes de tooling PASS (inclui roteamento seletivo do Parser). Avisos de chunk/importação dinâmica já existentes não impedem build. Ledger passa com migração nova pendente; histórico não será reaplicado.

## Git / QA / ambiente

Implementação em `codex/review-format-preflight`; preservados `.tmp.driveupload`, acordo de matching alheio, Dockerfile GPU e cópia de teste de matching. PostgreSQL local descartável 127.0.0.1:55479; escrita somente sintética com rollback. Sem mutation/publicação de Perfil real em produção. Release direcionada pelo dispatcher 1.0.2: database + web + Parser; Parser é dependência runtime compartilhada na mesma hospedagem, explicitada no mapa. Nenhuma Edge Function, gateway, migration histórica ou serviço não afetado foi publicado.

## Conclusão

D-01 a D-05 e P-01 PASS. Funcional local e publicação do SHA conjunto comprovadas; registro de fechamento acompanha as mesmas mudanças, sem novo rebuild. Smoke autenticado de Pessoa real permanece NOT TESTED, fora da evidência afirmada.

A CI do commit funcional inicial `b34bdd4ef07ee2bcefd56cd746f7192b9e5c3ef4` passou nas execuções branch `37205219082` e main `37205297648`. Antes de qualquer implantação, o plano 1.0.1 foi insuficiente para o consumidor Parser compartilhado. O roteamento 1.0.2 adiciona somente esse destino com testes negativos: componente web comum, docs, script de deploy e gateway não acendem Parser; runtime Parser isolado não acende web/banco/Edge. A integração Git inicial não foi tratada como prova de rollout. Produção recebeu somente o SHA conjunto validado d88fbff.

## Publicação verificada

- SHA funcional conjunto `d88fbff5bdb3e61f10129bdd74924de3b7227715`; CI branch `37205655796` e main `37205732467` SUCCESS; main/origin/VPS alinhados no rollout. Recibos locais `tmp/review-formats-release-plan.json`, `tmp/review-formats-publish.json`, log `tmp/review-formats-vps-release.log`.
- Migração aplicada no projeto existente: `review_period_format_preflight`, remoto `20261004132949`. MD5 pós-gate save `a55889f9ab1791480d14d79d44f87c45`, approve `c00140d64817249442ddeef25d74f62d`. SECURITY DEFINER/search_path/grants anteriores preservados; anon=false, authenticated=true; auth e operação precedem gate. Helper não é executável por authenticated. Diagnósticos puros remotos: ISO inválido/reverso retornam motivos esperados; anos válidos/texto ambíguo não bloqueiam.
- Parser imagem `8682af7d98e7f4704a3c465020dc62821a32e7ebccad97a3aad1178708044616`, web `4111e554f74b1fab0448d2be7899aa4671715d24b4f05353bb7bbd457d0d0958`; ambos running/0, Parser healthy e available/ready. Gateway mantém `d061cea3ae0a785f5cc0879704e1918666d22aa51236ec4ff7384b1387d2cf99`, running/0. Smoke JS sintético no container confirma guard/calendário/ordem/formato válido sem API, cache, provider ou dados pessoais.
- HTTPS `/`, `/sign-in`, `/profiles`, entry `/assets/index-BuKOGLjh.js`, PDF `/assets/pdf-Du5hpUXa.js` e quatro chunks anteriores retornaram 200. Bundle contém v2.0.3, resumo, aviso e mensagem do calendário. Primeiro curl retornou 404 durante recriação; conferência estabilizada passou sem repetir build.
- Rollbacks `prisma-web:rollback-before-d88fbff5bdb3` → imagem 8d578d5 e `prisma-parser-ia:rollback-before-d88fbff5bdb3` → dc3fd80 preservados. SQL é aditivo; helpers privados permanecem e não alteram dados históricos. Retirada do gate, se necessária, exige migration nova revisada, nunca reedição da aplicada.
- A confirmação do frontend usa fixture sintética; produção tem smoke de código/saúde/arquivos e metadata SQL. Isso não prova publicação autenticada de um currículo real. Nenhuma decisão humana foi fabricada.
