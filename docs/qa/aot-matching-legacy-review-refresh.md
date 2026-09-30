# AoT — checagem explícita de discordância antiga

Contrato: `docs/qa/agreement-matching-legacy-review-refresh.md` v1.0.0. Baseline: `main` `2663c5e165c42b97bfb42838d1b173f7143f7fa7`, Edge v14 e web em produção. Observação remota em 2026-09-30: na Posição backend, Diego e Bruno tinham cache `READINGS_DISAGREE` sem último par; a carga de revisão do Diego retornou HTTP 504, enquanto fontes/claim responderam 200. O par não pode ser reconstruído das respostas antigas.

## Acordos -> implementação -> teste -> evidência

| ID | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-01 | Carga de par legado devolve `PAIR_NOT_STORED`; tela explica ausência sem inventar itens | SQL sintético/Deno e RPC remota com cache legado real retornando o código esperado; bundle web publicado contém a mensagem | PASS |
| D-02 | Botão explícito chama RPC service-only com papel, tenant, versões, contexto, chave, solicitante e horário | SQL negativo/positivo, Deno sem provedor na carga; grants remotos conferidos, bundle publicado contém o botão; clique pago autenticado não exercitado | PASS |
| D-03 | Lease existente, conclusão auditada, tentativa 4 real e bloqueio de retry automático após falha | SQL nos prompts 1.1/1.2; Deno com duas leituras simuladas | PASS |
| D-04 | Fallback e score só mudam após resultado íntegro; erros de configuração/fonte/concorrência têm causa | Testes de domínio/Edge, UI compilada e bundle publicado; nenhuma IA real acionada no smoke | PASS |
| P-01 | Busca/carga não acionam nova IA | Testes Deno e guarda SQL | PASS |
| P-02 | Sem acesso por member/anon/tenant alheio; par não vai ao navegador | Negativos SQL/Deno, RLS/grants | PASS |
| P-03 | Sem diff em pesos, prompt/modelo, Knowledge, Perfil ou Posição | Inspeção do diff | PASS |

F-01 preservado: sem reprocessamento em massa, backfill ou IA real para smoke. A-01: reuso do cache, lease e auditoria; sem base paralela.

## Impacto e preservação

| Área | Relação | Baseline/risco | Regressão |
| --- | --- | --- | --- |
| Cache, par, revisão, migration | direct | Legados sem par; retry normal não pode cobrar novamente | PostgreSQL sintético com rollback, 1/3/4 tentativas, falha e autoridade |
| Edge e provedor | direct | Duas leituras independentes só após claim | Deno 33 testes; sem chamadas reais |
| Busca, tela, score | direct | Cálculo interno e mensagem causal | Typecheck/build, bundle na VPS e HTTP 200; visual autenticado não exercitado |
| Auth/tenant/RLS/PII | critical_transversal | Service-only e fontes minimizadas | Negativos SQL/Deno, grants remotos e Edge anônima 401 |
| Snapshot/Knowledge/requisitos | plausible_indirect | Nenhuma regra modificada | Domínio 112 testes, diff e smoke seletivo HTTP 200 |

## Validação e rollout

Local: PostgreSQL 17 descartável, migração aplicada e quatro scripts SQL de regressão rodados em transação com rollback para prompts 1.1 e 1.2. Deno handler 33/33, domínio 112/112, TypeScript raiz/web, build web, lint, runtime gerado e ledger checker passaram. Branch CI `36774775442` e main CI `36775030973` PASS para `487bb27d0b714ce18baf59c6d977f6cb0b0afa00`. Migration remota `20260930204823_matching_legacy_review_refresh` ativa; RPC nova executável por `service_role` e não por `authenticated`, 24 caches legados intactos. Chamada de carga em cache legado de produção devolveu `PAIR_NOT_STORED` sem pagamento. Edge `matching-trajectory` v15 ACTIVE, `verify_jwt=true`, POST anônimo 401. VPS no SHA funcional, somente web recriada, contêiner `running`/zero reinícios, imagem `sha256:668091fb1267488e26c1dca121bf2ea98a1609a93c60bbf7d24aca8b5d6ea080`; rollback `prisma-web:rollback-before-487bb27d0b71` aponta para a imagem anterior. O script recebeu 404 no smoke imediato, mas `/`, `/login` e `/index.html` responderam 200 na checagem posterior; o bundle servido contém o botão novo. QA remoto separado não existe. Não houve IA real nem mutação de Perfil real. O clique autenticado e a decisão sobre Pessoa real permanecem **NOT TESTED** em produção e só devem ocorrer por ação do operador autorizado.

## Desvios

Nenhum desvio funcional conhecido. A ausência de smoke autenticado pago é limite de evidência, não prova de que uma nova leitura real concluirá com concordância ou itens revisáveis. A causa exclusiva do HTTP 504 anterior não foi demonstrada; o novo caminho de par ausente respondeu prontamente na RPC remota.
