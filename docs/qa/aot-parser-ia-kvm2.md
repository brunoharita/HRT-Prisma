# AoT — Parser IA totalmente online na KVM2

## Aditivo autorizado em publicação

Bruno aprovou transferência exata da chave, teste sintético pago e publicação Prisma v2.0.1 em main/produção. Acordo/execução 1.1.0 acrescentam D-06/CA-D06: registro único, histórico preservado e web como superfície direta. Secret já provisionado em `/etc/prisma/parser-ia.env`, modo 400/UID 1000, sem exposição do valor. Bloqueios do checkpoint abaixo foram resolvidos por essa autorização; ativação, parse real, reinício e versão hospedada ainda aguardam prova. Regressão incremental: registro/histórico, typecheck/build web, contexto e smoke. O checkpoint abaixo permanece histórico até o fechamento operacional.

Contrato `docs/qa/agreement-parser-ia-kvm2.md` 1.0.0, execução correspondente, ADR-075. Baseline `efdadeb64fbe8399d718018cf6080cb9737774e6`; branch `codex/parser-ia-kvm2`; risco D/E por localização/secret/ciclo de vida de PII. Evidência parcial até publicação.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste/evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Sem PC/túnel | singleton KVM2/18787, gateway existente | imagem/HTTP sintético na KVM2 PASS | BLOCKED | credencial real ainda não autorizada pela revisão automática |
| D-02 | Autoridade e interpretação preservadas | gateway inalterado, somente diretório do lock | auth/tenant/hash/limites/cache/evidência, 86/86 | PASS | QA local sintético |
| D-03 | Secret/cache/endpoint privados | Compose secret/node/loopback/hardening/volume | QA real UID 1000, pasta 700/arquivos 600 PASS | BLOCKED | secret real não transferido |
| D-04 | Restart sem lock antigo ou retry | tmpfs separado/cache persistente/healthcheck | novos testes + restart Docker real/cache sem rede PASS | PARTIAL | prova na instância de produção pendente |
| D-05 | Publicar/provar no servidor | script específico e rollback | main/GitHub e CIs PASS; imagem QA pronta | BLOCKED | ativação/parse real e sincronização VPS pendentes |

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
| Gateway/auth/tenant | critical_transversal | gateway ativo/zero restart | negativos/HTTP PASS; público anônimo 401 | PASS |
| Importação/revisão | plausible_indirect | parser-ia 1.0.0, mesma UI/saída | 26 domínio/recuperação/readiness PASS | PASS |
| Web/gateway/Traefik | plausible_indirect | IDs/imagens/restarts coletados | mesmos IDs após QA, HTTPS 200 | PASS |
| Dados/matching/Knowledge | no_impact_identified | sem SQL/Edge/banco no smoke | diff/plano/binding/cache | PASS |
| Paddle/experimento | no_impact_identified | fora da rota automática | mesmo ID d991a574e45e, estado pré-existente preservado | PASS |

### Novidade e preservação

Quatro testes novos; preservação por 41 gateway/Parser existentes, 26 domínio e 15 release/contexto: 86/86 PASS. Build TS raiz e compilação específica PASS. Sem suíte integral local; CI existente executou seus gates automaticamente. Baseline real não tinha Parser disponível; sintéticos não medem qualidade de currículos reais.

Imagem `prisma-parser-ia:qa-57b306d`, ID `sha256:225afd6a2f211a3451b6f3a81e62700032bb63d7945f458de29136f587bd6f2a`, construída de archive do SHA funcional. QA descartável sem rede, chave fictícia, UID 1000, read-only/cap_drop/no-new-privileges/768 MiB/1 CPU: parse HTTP 200, rejeição de origem/hash, cache replay e permissões 700/600 PASS. Segundo QA usou diretório cache sintético persistente; restart real removeu lock sintético e devolveu HTTP 200 cached=true, nenhuma chamada paga/banco. O stdin PowerShell acrescentou CRLF final e causou erro shell após o resultado PASS e cleanup; verificação posterior confirmou ausência do container de QA. Não é erro de restart ou Parser. Imagem/diretório de build/cache sintético preservados para concluir o movimento.

## Fora de escopo preservado

F-01/F-02: nenhum OCR, container/modelo histórico removido, Pessoa/Perfil/Knowledge alterado ou schema/Edge/UX/matching modificado; IDs reais conferidos após QA. Instância de produção ainda não ativada.

## Fidelidade visual

Não aplicável: captura é incidente, tela não alterada. Smoke autenticado depende de sessão; não implica envio de currículo.

## Desvios do contrato

Nenhum desvio de produto identificado. A revisão automática rejeitou a transferência da chave da `.env.local` para `/etc/prisma/parser-ia.env` por exigir autorização suficientemente específica de payload/origem/destino. Não houve transferência ou contorno. O pedido específico foi apresentado ao PO; ativação/validação real aguardam resposta. A-02 não sobrepõe a aprovação exigida pela plataforma.

## Validação final

`pnpm run build` PASS. `node --test tests/tooling/parserIaHosted.test.mjs tests/tooling/parserIaService.test.mjs tests/tooling/paddleGateway.test.mjs` 45/45 PASS. `node --test dist/tests/parserIa.test.js dist/tests/parserIaRecovery.test.js dist/tests/parserReadiness.test.js tests/tooling/releaseDispatcher.test.mjs tests/tooling/prismaContext.test.mjs` 41/41 PASS. Sem IA paga/banco nessas provas.

`node node_modules/typescript/bin/tsc -p services/parser-ia/tsconfig.json --noEmit` PASS, além da compilação Linux no Docker. A primeira compilação específica revelou declarações Vite ausentes; reutilizada `src/vite-assets.d.ts`, recompilação PASS. Lint PASS (787 arquivos). Geração/check Context Pack em cópia do índice Git excluindo acordo não rastreado alheio: PASS. O pnpm 11 tentou reinstalar módulos na cópia ligada por junction e abortou sem TTY; nenhum purge foi autorizado. Reexecução com `--config.verify-deps-before-run=false` usou os scripts existentes e passou. Não houve mudança de dependências.

Dispatcher 1.0.1: docs/context/hosting/infrastructure/tests/tooling, sem migration/Edge/paths desconhecidos. Recomendações genéricas `pnpm run test` e publish web foram substituídas por 86 testes afetados e publicação específica do Parser conforme mapa; não há código/UI web alterado, nem rebuild web necessário.

## Git / QA / ambiente

Baseline local/origin/VPS alinhado. KVM2 2 CPUs, 7.940 MiB RAM/5.287 MiB disponíveis, 81 GiB livres. Web/gateway zero restart; experimento não saudável existente preservado. `.tmp.driveupload/`, acordo M8 alheio, Dockerfile.gpu, teste duplicado não rastreado e `models/` remoto preservados. Context Pack usa fontes versionadas para excluir o acordo alheio não rastreado.

SHA funcional `57b306d308b5df40d28c5b3366d79b62500fbf7a`: main local/origin e branch, CI branch `37137776343` PASS e main `37138060686` PASS. Publicação Git pelo dispatcher com SHA explícito; recibo ignorado em `tmp/parser-ia-git-release.json`. VPS produção checkout ainda `efdadeb64fbe8399d718018cf6080cb9737774e6`; somente build/QA isolado executados na KVM2. IDs preservados: web `8fb20f65ddb6`, gateway `2eed2dd379ea`, Traefik `5e25fdc6d2e6`, experimento `d991a574e45e`. HTTPS 200, readiness anônima 401/session_required. Secret real ausente, PC sem listener 8787/processo SSH. Aba de importação redirecionou a sign-in com campos vazios; login humano solicitado, nenhum dado enviado. Não houve chamada paga ou mutação de Pessoa.

## Conclusão

Implementação, CI e QA da imagem prontos. Ativação na KVM2 bloqueada por autorização específica de transferência de credencial; D-01/D-03/D-05 BLOCKED, D-04 PARTIAL. Operação totalmente online em produção ainda não comprovada ou concluída.
