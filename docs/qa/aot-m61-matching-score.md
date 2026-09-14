# AoT — M6.1 Pontuação de matching

Contrato de referência: `docs/qa/agreement-m61-matching-score.md` 1.1.0 e `docs/qa/execution-m61-matching-score.md` 1.1.0. Evidência coletada em 2026-09-13.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | Score observado inteiro de 0 a 100 | `calculateMatchingScore` preserva decimais e arredonda somente o total | unitário e golden | caso 85 aplicáveis resulta em 91 | PASS | local |
| D-002 | Descoberta precede score | `findPeople` calcula score somente depois de carregar e resolver candidatos | unitário | filtro de descoberta independe de `score` | PASS | local |
| D-003 | Grupos principal e relacionado | `discoveryGroup` e seções distintas na lista | unitário | Beatriz no grupo principal; menção isolada no relacionado | PASS | local |
| D-004 | Pesos 30/20/35/15 | `WEIGHTS` congelado | unitário | breakdown integral e golden cases | PASS | local |
| D-005 | Denominador somente aplicável | dimensões ausentes retornam `not_applicable` | unitário e golden | sem desejável usa 85; zero aplicável fica indisponível | PASS | local |
| D-006 | Escala de área 30/24/0 | `scoreArea` e `matchVacancyArea` | unitário | experiência, área declarada, outra área e ausência cobertos | PASS | local |
| D-007 | Função 20/17/12/8/0 e senioridade 0/-1/-4 | `assessVacancyFunction` e `assessSeniority` | unitário | mesma função, Beatriz e Gerente de Marketing | PASS | local |
| D-008 | Obrigatórios dividem 35 | `scoreRequirements("required")` | unitário | divisão igual com escala completa | PASS | local |
| D-009 | Desejáveis dividem 15 ou saem | `scoreRequirements("desired")` | unitário | dimensão ausente e divisão igual | PASS | local |
| D-010 | Requisito 100/50/25/0 | mapeamento direto/parcial/relacionado/sem evidência | unitário | quatro estados com pesos fracionários exatos | PASS | local |
| D-011 | Zero epistemologicamente neutro | texto “Sem evidência suficiente” | unitário e inspeção de UI | nenhuma afirmação de incapacidade | PASS | local |
| D-012 | M5.1 fortalece somente requisito exato | consulta tenant-scoped e `findDemonstratedEvidence` versionado | unitário negativo e smoke | exato, nível inferior, versão desconhecida e leitura RLS em QA | PASS | local + Prisma-QA |
| D-013 | Cobertura separada | `coveragePoints` e `coveragePercent` independentes do total | unitário e golden | zero avaliado coberto versus evidência insuficiente | PASS | local |
| D-014 | Estado provisório | razões para cobertura menor que 60%, `unclassified` e dependência material | unitário | três causas cobertas | PASS | local |
| D-015 | `unclassified` não bloqueia descoberta | requisito fica fora das dimensões e marca provisório | unitário | descoberta preservada e score não ordena | PASS | local |
| D-016 | Ordenação autorizada | grupo, decisão humana, score definitivo e nome/id neutros | unitário | provisórios não usam valor numérico | PASS | local |
| D-017 | Condições objetivas fora do score | input puro não contém localidade, regime ou remuneração | unitário negativo | nome/localidade alterados sem mudar resultado | PASS | local |
| D-018 | Decomposição auditável | resultado e drawer expõem dimensões, itens, pontos, fontes e motivos | unitário e smoke autenticado | drawer mostrou 92/100, 46/50, área 30/30, função 16/20 e versões | PASS | frontend local + Prisma-QA |
| D-019 | Versões e fingerprint | versões de Posição, Perfil, matching, score e Knowledge no resultado | unitário | versão desconhecida indisponível e fingerprint determinístico | PASS | local |
| D-020 | Função local pura | módulo de domínio sem I/O | unitário e inspeção | p95 local menor que 5 ms; sem chamadas externas | PASS | local |
| D-021 | Sem persistência/cache novo | score derivado em memória | diff | nenhuma migration, tabela ou cache novo | PASS | local |
| D-022 | Sem atributos proibidos ou keyword stuffing | input profissional mínimo e matching por evidência categorizada | unitário negativo | PII, nome, volume e repetição não alteram pontos | PASS | local |
| D-023 | UI compacta e explicável | score, estado, cobertura e drawer progressivo | teste estrutural, build e smoke autenticado | desktop e 390×844 exibiram grupos, score, cobertura, estado e disclosure sem overflow | PASS | frontend local + Prisma-QA |
| D-024 | Sem faixas semânticas | UI usa somente estado observado/provisório/indisponível | inspeção e unitário | ausência de baixa/média/alta/excelente | PASS | local |
| D-025 | Relatório sombra | `buildMatchingScoreShadowReport` e script dedicado | unitário e execução | fixture sintética reproduzível com ordem anterior versus nova | PASS | local; não é validação com Pessoas reais |
| D-026 | Separação área/função/requisitos | extensão compatível do matching versionado 3.0.0 | regressão do matching | 53 testes focados passam | PASS | local |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-001 | Score não decide emprego | inspeção de saída e UI | rótulo observado e alerta explícito | PASS |
| P-002 | Score não decide descoberta | teste de descoberta | `isVacancyDiscoveryCandidate` não consulta score | PASS |
| P-003 | Sem score opaco/probabilístico | teste determinístico | fórmula e breakdown reproduzíveis | PASS |
| P-004 | Sem IA/Web/provider no cálculo | inspeção de dependências | módulo puro sem cliente externo | PASS |
| P-005 | Falta de evidência não vira ausência | teste sem evidência | zero reduz cobertura e texto permanece neutro | PASS |
| P-006 | Sem atributos sensíveis | teste de invariância | identidade e atributos proibidos não mudam score | PASS |
| P-007 | Condições operacionais não pontuam | inspeção do tipo de input | campos não existem no contrato da função | PASS |
| P-008 | Sem bônus genérico de verificação | teste M5.1 | evidência afeta somente o requisito exato | PASS |
| P-009 | Cálculo não altera Perfil/evidência | teste determinístico | entradas não são mutadas | PASS |
| P-010 | Cálculo não publica Knowledge | inspeção do módulo | nenhuma escrita ou resolução no score | PASS |
| P-011 | Sem importância inventada | teste `unclassified` | item não entra nos pesos | PASS |
| P-012 | Provisório não ordena por score | teste de ordenação | desempate neutro entre provisórios | PASS |
| P-013 | Sem cutoff | inspeção de domínio e UI | nenhum limiar de exclusão | PASS |
| P-014 | Decisão humana preservada | teste de ordenação e snapshot | decisão continua prioritária e auditada | PASS |
| P-015 | Sem cache não versionado | diff | nenhum cache criado | PASS |
| P-016 | Sem arquitetura paralela | diff e regressão | matching existente foi estendido | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-001 a F-004 | pesos fixos; nenhuma configuração por empresa, ML ou LLM | PASS |
| F-005 a F-010 | nenhum preditor, cutoff, faixa definitiva ou condição objetiva no score | PASS |
| F-011 a F-012 | nenhuma reescrita de Perfil/Knowledge e nenhum provider | PASS |

## Desvios do contrato

Nenhum desvio do contrato 1.0.1. O CA-008 original foi substituído pela decisão explícita do Product Owner: a fórmula permanece normativa e, portanto, `score <= cobertura`.

## Mudanças autorizadas durante a execução

Em 2026-09-13, Bruno aprovou a recomendação de corrigir o critério contraditório, preservando a fórmula, o caráter provisório por baixa cobertura e a separação conceitual entre score e cobertura.

## Validação final

- `pnpm run build`: PASS.
- `node --test dist/tests/matchingScore.test.js dist/tests/vacancyIntelligence.test.js`: PASS, 53/53.
- `pnpm run test:golden`: PASS, 23/23, regressões 0.
- `pnpm run typecheck:web`: PASS.
- `pnpm run build:web`: PASS; aviso não bloqueante de chunk maior que 900 kB já pertencente à fundação.
- `pnpm run lint`: PASS, 472 arquivos.
- `pnpm run report:matching-score-shadow`: PASS; fixtures sintéticas produziram 100/100, 92/100, 75/79 e 0/59 provisório.
- Smoke visual autenticado desktop: PASS em `Pessoas para Analista de Marketing`; grupos A/B, scores e drawer íntegros, com `document.scrollWidth === document.clientWidth`.
- Smoke visual autenticado 390×844: PASS após corrigir wrapping de ações e evidências; lista, resumo e drawer sem elementos internos com overflow maior que 1 px e sem overflow do documento.
- `pnpm run validate`: não executado, conforme a proibição de gate integral automático sem autorização específica para risco transversal.

## Git / QA / ambiente

Implementação e provas determinísticas são locais. O smoke usou o frontend local em `http://127.0.0.1:5555` conectado ao Prisma-QA `ioldpnqqvobprjiontre`; seis Perfis publicados foram analisados sob a sessão autenticada e a leitura tenant-scoped de Evidência Demonstrada não falhou. A abertura do disclosure conserva o comportamento auditável existente de `recordEvaluation`; nenhuma decisão humana foi alterada.

O commit funcional `c6b1f669c04bbe505a18c2826a83543974e17ae6` foi publicado em `origin/codex/m6-1-matching-score`. O diff contra `main` não contém migration, Edge Function ou outro artefato sob `supabase/`; portanto, o alinhamento do Prisma-QA é um no-op verificado, não uma implantação omitida. O comando de fechamento `AoT` autorizou o fast-forward da `main` local e remota pela revisão de encerramento desta entrega. Produção permanece fora de escopo.

## Conclusão

PASS. D-001 a D-026 e P-001 a P-016 possuem implementação e evidência proporcional. CA-018 passou na rota autenticada em desktop e 390×844 depois que o smoke revelou e a implementação corrigiu dois overflows internos de conteúdo. Não há requisito obrigatório pendente, desvio ativo ou autorização de produção.

## Adendo 1.1.0: classificação obrigatória de requisitos

Em 2026-09-13, Bruno esclareceu que todo requisito salvo precisa ser obrigatório ou desejável e autorizou a correção completa em AoT. A causa confirmada era uma divergência entre apresentação e valor: a inclusão manual criava `unclassified`, enquanto o controle sem valor projetava visualmente a primeira opção, “Obrigatório”. A correção anterior que expunha “A classificar” como terceira opção foi superada por esta decisão.

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-027 / CA-021 | `newManualVacancyRequirement` cria `required` e `importanceConfirmed`; o editor oferece somente Obrigatório e Desejável | teste de domínio e estrutural da página | PASS |
| D-028 / CA-022 | validação local e RPC rejeitam `unclassified`; migration preserva autorização antes da validação | teste direcionado e prova SQL transacional com rollback | PASS |
| D-029 / CA-023 | constraint histórica conserva `unclassified`; correção gera nova versão em vez de atualizar snapshot anterior | Definição v2 permaneceu intacta e Definição v3 foi criada | PASS |
| P-017 | valor visual e valor persistido usam a mesma propriedade controlada | teste estrutural e helper de criação manual | PASS |
| P-018 | nenhuma nova versão aceita requisito fora de `required`/`desired` | RPC retornou `VACANCY_REQUIREMENT_CLASSIFICATION_REQUIRED` no caso negativo | PASS |

### Evidência local e Prisma-QA

- `pnpm run build`: PASS.
- `node --test dist/tests/vacancyIntelligence.test.js dist/tests/matchingScore.test.js`: PASS, 54/54.
- `pnpm run typecheck:web`: PASS.
- `pnpm run build:web`: PASS; permanece apenas o aviso histórico de chunk acima de 900 kB.
- `pnpm run lint`: PASS, 475 arquivos.
- `pnpm run generate:prisma-context` e `pnpm run check:prisma-context`: PASS, 5 fontes canônicas.
- A migration forward-only `20260914015642_m61_requirement_classification_invariant.sql` usa o mesmo identificador no repositório e no ledger do Prisma-QA.
- Inspeção pós-migration: `anon_execute = false`, `authenticated_execute = true`, wrapper `save_vacancy_definition_m546` sem execução para `authenticated`, guard de classificação e gravação de `vacancy-definition-1.2.0` presentes.
- `supabase/qa/m61_requirement_classification_invariant_verification.sql`: PASS com rollback; criou uma versão temporária com 1 obrigatório e 1 desejável, confirmou o contrato 1.2.0 e provou a rejeição de `unclassified`.
- `supabase/qa/m61_marketing_position_requirement_repair.sql`: PASS com guardas de identidade, versão e conjunto exato; a Posição `Analista de Marketing` avançou da Definição v2 para v3, com 3 obrigatórios, 2 desejáveis e zero `unclassified`. O snapshot v2 continua com os três valores históricos, sem reescrita.
- Advisors de segurança e performance não apontaram objeto ou regressão nova específica da migration, que não cria tabela, índice ou chave estrangeira. O aviso genérico de RPC `SECURITY DEFINER` inclui a função intencionalmente exposta a `authenticated`; a função valida `auth.uid()` e papel tenant-scoped antes do payload, com `anon` negado.
- Smoke visual autenticado do adendo: não executado porque a nova aba local não herdou a sessão do navegador já aberta; nenhuma credencial foi solicitada ou manipulada. O fluxo real de persistência foi provado pelo mesmo RPC do frontend e pela versão v3 conectada.

`matching-score-1.0.0` e seus pesos não mudaram. A mudança material pertence a `vacancy-definition-1.2.0`; não cria cache, provider, LLM, ranking novo ou decisão automática. Produção permanece fora de escopo.
