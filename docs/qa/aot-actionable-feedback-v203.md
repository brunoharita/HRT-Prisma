# AoT — Prisma v2.0.3, erros corrigíveis

Contrato: [agreement-actionable-feedback-v203.md](agreement-actionable-feedback-v203.md), versão 1.0.0, decisão explícita de Bruno em 04/10/2026. Baseline Git/main/VPS `6401d72d34b1133a9d9d328c68ae3ffeb5dd2eb6`, runtime web/Parser `96e3ecba4696994993e9b661ec37ae0ff49a3c5f`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | Catálogo de orientação integrado ao tradutor compartilhado, preserva tradutores de evidências/educação/verificação | 37 testes dirigidos PASS, catálogo em motivos legados/envelope vigente e mensagens controladas | PASS |
| D-02 | Normalizador existente antecipa rejeição de telefone na revisão | Dois números/incompleto/nacional/internacional/vazio/contato prévio/sem mutação; 248 person-flow PASS | PASS |
| D-03 | Campos/ação conhecidos, limites nomeados, prioridade de sessão/permissão e detalhe seguro | Negativos de autorização, detalhe inválido/injetado/erro desconhecido PASS; inspeção da navegação existente | PASS |
| D-04 | Registro único v2.0.3, documentação e rollout web | Tipos/build/testes/contexto/15 tooling/CI branch-main e smoke público PASS; SHA cacc388 e rollback conferidos | PASS |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem mutação automática/relaxamento de gates/PII/resposta técnica/decisão humana fictícia | Testes negativos e fixtures sintéticas; nenhum produtor de dados alterado | PASS |

## Mapa de Impacto e Preservação

| Capacidade | Relação | Baseline / prova proporcional | Status |
| --- | --- | --- | --- |
| Tradução compartilhada | direct | 37 dirigidos e 248 person-flow PASS, fronteiras de serviços não expõem mensagem bruta | PASS |
| Revisão/comparação/publicação | direct | Sem mudança de RPC; validação usa regra já vigente, person-flow PASS | PASS |
| Auth/tenant/privacidade | critical_transversal | Sem nova leitura/grants; negativos de precedência PASS; teste não é nova prova de RLS real | PASS |
| Navegação/foco | plausible_indirect | `errorAction`, `returnToReview`, storage/foco existentes; campos exatos testados, consumidores inspecionados | PASS |
| Versão/web | direct | Registro único/build e versão no bundle público, HTTP 200 nas rotas/chunks atuais/anteriores | PASS |
| Banco/Parser/Unicode/Knowledge/matching | no_impact_identified | Diff/plano e person-flow preservam, sem produtores persistidos alterados; Parser/gateway nas imagens de baseline, readiness available/ready | PASS |

### Novidade e preservação

- Nova orientação e antecipação de validação comprovadas localmente; nenhuma escolha automática de telefone.
- Não há nova dependência ou alteração de contratos persistidos.
- Testes locais não provam publicação autenticada real; esta ação permanece humana.

## Fora de escopo preservado

F-01 PASS: múltiplos telefones, banco/Parser/IA, matching/Knowledge, redesenho, correção histórica e publicação real para testar permanecem excluídos.

## Fidelidade visual

Capturas são contraexemplos de mensagem de erro, sem composição visual nova. Layout/ações existentes reutilizados; nenhuma alegação de comparação pixel a pixel. Smoke autenticado real NOT TESTED.

## Desvios do contrato

Nenhum desvio identificado; preservado o modelo atual com um telefone, como autorizado no escopo de mensagens. Não há nova decisão de produto durante a execução.

## Validação final / Git / QA / ambiente

Tipos do projeto e web/build web PASS. 37 testes dirigidos e 248 person-flow PASS (sem IA/banco remoto ou currículos reais). A única alteração posterior na fixture substituiu números do exemplo por números sintéticos; build e 10 testes de revisão repetidos PASS. Lint (809 arquivos), foundation (18 tabelas/6 versões), Context Pack e 15 testes tooling PASS. Warnings de chunk e importação dinâmica já existentes não impedem build. Baseline VPS verificado antes da implantação: checkout 6401d72, web/Parser/gateway running sem reinícios; Parser imagem `dc3fd8022d202ea893fb55547a9c97907fd5d9ac595966307d3b3cf385470bf3`, web imagem `4d0e0f81faa56a70145a7e799d86904b91686af419c6dcedbf46825d3f149b2c`. Nenhuma nova consulta/mutação de banco exigida. Logs/recibos locais ignorados: `tmp/actionable-feedback-v203-person-flow.log`, `tmp/actionable-feedback-v203-plan.json`, `tmp/actionable-feedback-v203-publish.json`.

Plano do diff comprometido: somente web/hosting/documentação/contexto/testes; banco e funções skip. O comando amplo de testes sugerido pelo dispatcher foi coberto localmente pela união proporcional dos testes dirigidos/person-flow/tooling, sem `pnpm run validate` local. CI obrigatório existente executou seu gate normal: [branch 37173451026](https://github.com/brunoharita/HRT-Prisma/actions/runs/37173451026) e [main 37173503983](https://github.com/brunoharita/HRT-Prisma/actions/runs/37173503983), ambos success no mesmo SHA funcional `cacc388d16aea712e57249547e8191247b4a0c30`.

Publicação manual seletiva pelo script existente `deploy/release-web.sh`, após promoção pelo dispatcher. O recibo do dispatcher marca configuração VPS pendente porque a implantação foi chamada separadamente; evidência abaixo confirma a conclusão, sem adulterar o recibo original:

- Checkout VPS no SHA funcional cacc388; web running/zero reinícios, imagem `8d578d5e1a9d228deece2d99ddc7e8a94d987b521cd41f50e457598f3c936d2e`.
- HTTPS `/`, `/sign-in`, `/profiles`, entry `/assets/index-C31HnJo-.js`, PDF `/assets/pdf-5RoAUGLr.js` e chunks anteriores `/assets/index-B-jkzCiv.js` e `/assets/pdf-BHWpnsdb.js`: HTTP 200. Bundle contém entrega 2.0.3, orientação de telefone, motivo conhecido, ação de correção e fallback sem campo inventado.
- Primeiro smoke recebeu 404 durante recriação; conferência posterior estabilizada PASS, sem outro build. Não é defeito de importação nem prova de publicação autenticada.
- Rollback `prisma-web:rollback-before-cacc388d16ae` preserva imagem `4d0e0f81faa56a70145a7e799d86904b91686af419c6dcedbf46825d3f149b2c`; Parser/gateway preservam imagens baseline, readiness `available/ready`.
- Arquivos alheios não rastreados locais e `models/` na VPS preservados. Nenhuma revisão ou Perfil real foi confirmado pelo agente.

## Conclusão

Implementação e publicação funcional PASS. Encerramento documental e sincronização final registrados no commit de fechamento deste AoT; não exigem reconstruir a web. Runtime funcional permanece cacc388, enquanto Parser mantém build 96e3ecb. Smoke autenticado real NOT TESTED; para este incidente, o operador deve atualizar a página e corrigir Telefone pela revisão antes de confirmar a publicação.
