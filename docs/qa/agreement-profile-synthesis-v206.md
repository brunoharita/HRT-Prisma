# Acordo e execução — Recuperação autorizada e versão 2.0.6

Versão 1.0.0, agreed, 2026-10-04. Autoridade: Bruno autoriza a única nova tentativa explicitamente solicitada após o bloqueio de revisão automática e determina a versão 2.0.6. Baseline main/origin/VPS `64e1d54c1749bd6c050a0d4c3d175ac93f5fbdfa`. Risco D/C na recuperação operacional, B na identificação de release. O acordo `agreement-profile-synthesis-exceptions.md` v1.0.0 foi lido integralmente e permanece vigente; apenas a decisão de manter produto2.0.5 é supersedida por D-R02. Nenhum contrato de resultado, prompt, modelo ou pergunta muda.

- D-R01: reenfileirar somente o job do incidente ainda failed, tentativa1, RESPONSE_INVALID sem diagnóstico, Perfil aprovado/vigente e mesma base. Executar uma única nova tentativa pelo worker normal, preservando contador/histórico e identificar o resultado com diagnóstico/métricas seguros. Se já recuperado, consultar sem duplicar. Falha nova não autoriza outra chamada cega.
- D-R02: registrar e publicar Prisma v2.0.6 na fonte central, login/sidebar, documentação e Context Pack; publicação seletiva de web, CI, smoke e sincronização.
- P-R01: não alterar fatos/publicar Perfil humano, zerar tentativas, expor fontes pessoais ou segredos, inventar subcausa antiga ou mudar tenant/modelo/prompt.
- F-R01: novas funcionalidades, redesenho, backfill, Parser, matching, migração e novo worker sem necessidade demonstrada.
- A-R01: reutilizar fila/diagnóstico/release existentes; consultas guardadas, testes e registro de evidência são escolhas de engenharia.
- Q-R01: nenhuma decisão material pendente. Sucesso da IA não é presumido; eventual falha deve ser identificada e declarada.

## Mapa de impacto e critérios de aceite

| IDs / capacidade | Relação | Baseline / prova mínima |
| --- | --- | --- |
| D-R01, job/diagnóstico/histórico | direct | failed/attempt1/diagnosticnull, base igual; leitura prévia, único reenfileiramento guardado, resultado e histórico sem PII |
| P-R01, Perfil/tenant | critical_transversal | Perfil aprovado/vigente, fontes com hash igual; guardas de organização/pessoa/Perfil/base, nenhuma gravação canônica |
| D-R02, registro/consumidores web | direct | v2.0.5 central, webd3b30ec; teste de versão, tipos/build, CI, bundle servido e HTTP/rollback |
| Exceções/consulta/fontes | plausible_indirect | 31 testes contratos/worker, 256 person-flow, 33 asserts SQL, 28 renders anteriores PASS; código funcional preservado, testes focados de contrato |
| Parser/gateway/banco/modelo | no_impact_identified | release somente registro/docs/web; conferir imagens e saúde, sem rollout dessas superfícies |

## Prompt congelado

Implementar D-R01/R02 sob P-R01/F-R01/A-R01 e registrar implementação, testes e evidência no AoT. Resultado failed explicitamente diagnosticado atende à recuperação controlada, mas nunca pode ser declarado síntese recuperada. A autorização é para uma chamada adicional, não repetição ilimitada. Preservar a evidência histórica do bloqueio anterior.
