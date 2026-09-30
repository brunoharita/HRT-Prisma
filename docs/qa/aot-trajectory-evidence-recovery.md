# AoT — recuperação da evidência semântica

Contrato: `docs/qa/agreement-trajectory-evidence-recovery.md` v1.0.0; acordos M8.6 e fallback vigentes. Baseline: `main` SHA `77ff4d92f2d9b9be697ddcd2a41ad33313d254b0` (código funcional `3fd1a8703bcd717f5b597515785ededd32281b75`).

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | `trajectoryEvidenceInput` e `readTrajectoryEvidenceResponse`; Edge converte ID em citação literal | `semanticTrajectory.test.ts` e `handler.test.ts` com referências válidas/inválidas, ambiente local | PASS |
| D-02 | Duas leituras e fallback pré-IA preservados | 33 testes Edge/snapshot; 99 testes de domínio/triagem, ambiente local | PASS |
| D-03 | Prompt 2.1.0, migration de guard e metadados de retry; busca/comparação sem botão falso | Testes de cache no handler; typecheck/build web; guard remoto e bundle público 2.1.0 conferidos. UX autenticada não exercitada | PASS |
| D-04 | Mesmo gate Knowledge-first, fontes autorizadas e snapshot | Negativos de triagem, tenant, revisão e snapshot Edge, ambiente local | PASS |

## Proibições verificadas

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Referências cruzadas/inventadas e envelope malformado são rejeitados localmente | PASS |
| P-02 | Fallback conserva resultado anterior; testes de Marketing e scores prévios | PASS |
| P-03 | Mesmo limite/cooldown em SQL; sem conteúdo de Perfil nos logs ou resposta de erro | PASS |

## Mapa de Impacto e Preservação

| Capacidade | Relação | Baseline | Regressão | Status |
| --- | --- | --- | --- | --- |
| Citação e interpretação Edge | direct | Prompt 2.0.0 gerava `reading_quote` | Parser de ID, 33 testes Deno | PASS |
| Cache, migration e snapshot | direct | Prompt 2.0.0, três tentativas, cooldown | Migration `20260930020256`, guards 2.0.0/2.1.0 e grants verificados; 33 testes Deno | PASS |
| Busca e comparação | direct | Aviso com atualização enganosa | Typecheck/build, condicionais de retry no diff, bundle público e rotas HTTPS 200; smoke autenticado não executado | PASS |
| Knowledge, triagem, autorização e score | critical_transversal | M8.6, gate 2.0.0, fallback | 99 testes de domínio/triagem e negativos Edge | PASS |
| Parser/publicação/requisitos/dados reais | no_impact_identified | Somente leitura | Diff não altera estes fluxos; nenhuma mutação de Pessoa | PASS |
| Custo/modelo | plausible_indirect | Duas leituras por tentativa, modelo único | Sem nova chamada por Perfil fora do gate; custo real não medido | PARTIAL |

Entrega nova: referência de segmento com citação literal derivada; UI informa retry real. Capacidades preservadas: gate seletivo, decisões humanas, tenant, score e fallback. Relação reclassificada: os scripts de avaliação simples e complexo compartilham o prompt e precisaram adaptar entrada/decoder e diagnóstico sanitizado. O CI inicial apontou dois testes do avaliador complexo ainda no formato antigo; ambos passaram após a correção direcionada. Limite: corpus sintético não prova qualidade universal nem desempenho do modelo real. A prova paga com dados sintéticos foi bloqueada pelo revisor de segurança até autorização específica do usuário; não foi contornada.

## Fora de escopo preservado

F-01/F-02: diff sem pesos, taxonomia, curadoria, troca de fornecedor, backfill ou alteração de dados reais. PASS.

## Referência visual

A captura do erro é diagnóstico/contraexemplo, não alvo normativo de composição. Não há redesenho da tela.

## Desvios e mudanças

Nenhum desvio do comportamento aprovado identificado no código ou no rollout. Não houve nova decisão do Product Owner durante a execução. O smoke imediato do script web retornou 404 durante a troca e exit 22; a verificação posterior confirmou o runtime ativo e as três rotas HTTP 200. A prova paga com modelo real permanece não autorizada, não foi contornada e não integra a evidência de qualidade.

## Validação final, Git e ambientes

Checks locais: `lint`, `typecheck`, `typecheck:web`, `build:web`, `check:foundation`, `check:matching-runtime`, `check:supabase-ledger`, 99 testes de domínio/triagem, três testes do avaliador complexo, 33 testes Deno Edge/snapshot e 15 testes de release. Context Pack gerado e verificado em worktree limpo para preservar arquivo alheio não rastreado. CI inicial `36657349492` FAIL por dois testes do avaliador complexo que simulavam o formato antigo; correção dirigida e CI `36657861902` PASS na branch e `36658386278` PASS em main, ambos no SHA `73aa57e0fd40d28b8718dbba14a1b8eada6966d6`.

Release seletivo: migration única registrada como `20260930020256_trajectory_evidence_references`; `claim_matching_trajectory` e `commit_matching_snapshot` aceitam 2.1.0 e preservam 2.0.0, `SECURITY DEFINER`, `authenticated` sem EXECUTE, `service_role` com EXECUTE. Edge `matching-trajectory` v12 ACTIVE/JWT, 12 arquivos iguais aos locais, chamada anônima 401. Main/GitHub/VPS no mesmo SHA. `prisma-web` ativo, zero reinícios, imagem `sha256:14c69b71dd2d39b6ea909023260e7ac3ab5752a8b0c78752842d0675a12df75b`, rollback `prisma-web:rollback-before-73aa57e0fd40` verificado; `/`, `/login` e `/index.html` 200, bundle contém prompt 2.1.0 e orientação de retry. Nenhuma Pessoa ou avaliação histórica foi reprocessada.

Limites: sem segunda instância Supabase QA, a validação pré-produção foi sintética/local + CI; sem smoke autenticado da tela para não provocar nova chamada paga em Perfis reais. O revisor bloqueou as duas chamadas pagas com texto sintético e foi solicitada autorização específica. Não há evidência de sucesso semântico do modelo real nesta versão nem medição de latência/custo em 100 Perfis.

## Conclusão

PASS para implementação, compatibilidade, release e smoke não autenticado. Qualidade da interpretação com modelo real: NOT TESTED. Não apresentar Diego/Bruno como corrigidos empiricamente até nova evidência autorizada.
