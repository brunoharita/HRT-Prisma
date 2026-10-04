# AoT — Prisma v2.0.3, erros corrigíveis

Contrato: [agreement-actionable-feedback-v203.md](agreement-actionable-feedback-v203.md), versão 1.0.0, decisão explícita de Bruno em 04/10/2026. Baseline Git/main/VPS `6401d72d34b1133a9d9d328c68ae3ffeb5dd2eb6`, runtime web/Parser `96e3ecba4696994993e9b661ec37ae0ff49a3c5f`.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | Catálogo de orientação integrado ao tradutor compartilhado, preserva tradutores de evidências/educação/verificação | 37 testes dirigidos PASS, catálogo em motivos legados/envelope vigente e mensagens controladas | PASS |
| D-02 | Normalizador existente antecipa rejeição de telefone na revisão | Dois números/incompleto/nacional/internacional/vazio/contato prévio/sem mutação; 248 person-flow PASS | PASS |
| D-03 | Campos/ação conhecidos, limites nomeados, prioridade de sessão/permissão e detalhe seguro | Negativos de autorização, detalhe inválido/injetado/erro desconhecido PASS; inspeção da navegação existente | PASS |
| D-04 | Registro único v2.0.3, documentação e rollout web | Tipos/build/testes PASS; contexto/CI/SHA/HTTPS/assets/rollback pendentes | PARTIAL |

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
| Versão/web | direct | Registro único/build PASS; implantação pendente | PARTIAL |
| Banco/Parser/Unicode/Knowledge/matching | no_impact_identified | Diff e person-flow preservam, nenhuma mudança de produtores persistidos; conferência pós-rollout pendente | PARTIAL |

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

Tipos do projeto e web/build web PASS. 37 testes dirigidos e 248 person-flow PASS (sem IA/banco remoto ou currículos reais). Warnings de chunk e importação dinâmica já existentes não impedem build. Baseline VPS verificado antes da implantação: checkout 6401d72, web/Parser/gateway running sem reinícios; Parser imagem `dc3fd8022d202ea893fb55547a9c97907fd5d9ac595966307d3b3cf385470bf3`, web imagem `4d0e0f81faa56a70145a7e799d86904b91686af419c6dcedbf46825d3f149b2c`. Nenhuma nova consulta/mutação de banco exigida. Logs locais ignorados: `tmp/actionable-feedback-v203-person-flow.log`.

## Conclusão

Movimento em execução; publicação pendente.
