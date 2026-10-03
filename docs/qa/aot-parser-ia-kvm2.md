# AoT — Parser IA totalmente online na KVM2

Contrato `docs/qa/agreement-parser-ia-kvm2.md` 1.0.0, execução correspondente, ADR-075. Baseline `efdadeb64fbe8399d718018cf6080cb9737774e6`; branch `codex/parser-ia-kvm2`; risco D/E por localização/secret/ciclo de vida de PII. Evidência parcial até publicação.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste/evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Sem PC/túnel | singleton KVM2/18787, gateway existente | HTTP com Host lógico PASS | PARTIAL | produção pendente |
| D-02 | Autoridade e interpretação preservadas | gateway inalterado, somente diretório do lock | auth/tenant/hash/limites/cache/evidência, 86/86 | PASS | QA local sintético |
| D-03 | Secret/cache/endpoint privados | Compose secret/node/loopback/hardening/volume | negativos/cache PASS, inspeção Docker pendente | PARTIAL | produção pendente |
| D-04 | Restart sem lock antigo ou retry | tmpfs separado/cache persistente/healthcheck | quatro novos testes PASS | PARTIAL | restart real pendente |
| D-05 | Publicar/provar no servidor | script específico e rollback | baseline remoto verificado | NOT TESTED | CI/publicação pendentes |

## Proibições verificadas

| ID | Guardrail | Teste negativo / evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem exposição/redução de proteção | auth/tenant/origem/loopback/sanitização PASS; inspeção pendente | PARTIAL |
| P-02 | Prompt/modelo/dados/revisão/no retry | referência inventada/zero fatos/partial/cache; diff | PASS |
| P-03 | Sem mutação humana/material alheio | QA sintético sem banco e Git status preservado | PASS |

## Mapa de Impacto e Preservação

Mapa inicial no acordo; sem expansão de domínio. Dependências operacionais novas: secret protegido e volume privado na KVM2.

| Capacidade / área | Relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- | --- |
| Parser/readiness | direct | PC/18787 VPS ausentes | HTTP/cache/lock/health, 45 tooling PASS | PARTIAL |
| Gateway/auth/tenant | critical_transversal | gateway ativo/zero restart | negativos/HTTP PASS; smoke público pendente | PARTIAL |
| Importação/revisão | plausible_indirect | parser-ia 1.0.0, mesma UI/saída | 26 domínio/recuperação/readiness PASS | PASS |
| Web/gateway/Traefik | plausible_indirect | IDs/imagens/restarts coletados | pós-rollout/HTTPS pendentes | NOT TESTED |
| Dados/matching/Knowledge | no_impact_identified | sem SQL/Edge/banco no smoke | diff/plano/binding/cache | PASS |
| Paddle/experimento | no_impact_identified | fora da rota automática | comparar IDs após rollout | NOT TESTED |

### Novidade e preservação

Quatro testes novos; preservação por 41 gateway/Parser existentes, 26 domínio e 15 release/contexto: 86/86 PASS. Build TS raiz PASS. Compilação específica do container em validação. Sem suíte integral. Baseline real não tinha Parser disponível; provas locais sintéticas não medem qualidade de currículos reais.

## Fora de escopo preservado

F-01/F-02: nenhum OCR, container/modelo histórico removido, Pessoa/Perfil/Knowledge alterado ou schema/Edge/UX/matching modificado. Verificação operacional pós-rollout pendente.

## Fidelidade visual

Não aplicável: captura é incidente, tela não alterada. Smoke autenticado depende de sessão; não implica envio de currículo.

## Desvios do contrato

Nenhum desvio identificado na revisão local; conclusão depende de evidência operacional.

## Validação final

`pnpm run build` PASS. `node --test tests/tooling/parserIaHosted.test.mjs tests/tooling/parserIaService.test.mjs tests/tooling/paddleGateway.test.mjs` 45/45 PASS. `node --test dist/tests/parserIa.test.js dist/tests/parserIaRecovery.test.js dist/tests/parserReadiness.test.js tests/tooling/releaseDispatcher.test.mjs tests/tooling/prismaContext.test.mjs` 41/41 PASS. Sem IA paga/banco nessas provas.

## Git / QA / ambiente

Baseline local/origin/VPS alinhado. KVM2 2 CPUs, 7.940 MiB RAM/5.287 MiB disponíveis, 81 GiB livres. Web/gateway zero restart; experimento não saudável existente preservado. `.tmp.driveupload/`, acordo M8 alheio, Dockerfile.gpu, teste duplicado não rastreado e `models/` remoto preservados. Context Pack usa fontes versionadas para excluir o acordo alheio não rastreado.

## Conclusão

Implementação local em validação. D-01/D-03/D-04/D-05 ainda não PASS; entrega e produção não concluídas neste estado.
