# AoT — recuperação da evidência semântica

Contrato: `docs/qa/agreement-trajectory-evidence-recovery.md` v1.0.0; acordos M8.6 e fallback vigentes. Baseline: `main` SHA `77ff4d92f2d9b9be697ddcd2a41ad33313d254b0` (código funcional `3fd1a8703bcd717f5b597515785ededd32281b75`).

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | `trajectoryEvidenceInput` e `readTrajectoryEvidenceResponse`; Edge converte ID em citação literal | `semanticTrajectory.test.ts` e `handler.test.ts` com referências válidas/inválidas, ambiente local | PASS |
| D-02 | Duas leituras e fallback pré-IA preservados | 33 testes Edge/snapshot; 99 testes de domínio/triagem, ambiente local | PASS |
| D-03 | Prompt 2.1.0, migration de guard e metadados de retry; busca/comparação sem botão falso | Testes de cache no handler; typecheck/build web; banco/UX autenticada ainda pendentes | PARTIAL |
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
| Cache, migration e snapshot | direct | Prompt 2.0.0, três tentativas, cooldown | Guard remoto 2.0.0 conferido; migration/smoke pendentes | PARTIAL |
| Busca e comparação | direct | Aviso com atualização enganosa | Typecheck/build; smoke autenticado pendente | PARTIAL |
| Knowledge, triagem, autorização e score | critical_transversal | M8.6, gate 2.0.0, fallback | 99 testes de domínio/triagem e negativos Edge | PASS |
| Parser/publicação/requisitos/dados reais | no_impact_identified | Somente leitura | Diff não altera estes fluxos; nenhuma mutação de Pessoa | PASS |
| Custo/modelo | plausible_indirect | Duas leituras por tentativa, modelo único | Sem nova chamada por Perfil fora do gate; custo real não medido | PARTIAL |

Entrega nova: referência de segmento com citação literal derivada; UI informa retry real. Capacidades preservadas: gate seletivo, decisões humanas, tenant, score e fallback. Relação reclassificada: os scripts de avaliação simples e complexo compartilham o prompt e precisaram adaptar entrada/decoder e diagnóstico sanitizado. O CI inicial apontou dois testes do avaliador complexo ainda no formato antigo; ambos passaram após a correção direcionada. Limite: corpus sintético não prova qualidade universal nem desempenho do modelo real. A prova paga com dados sintéticos foi bloqueada pelo revisor de segurança até autorização específica do usuário; não foi contornada.

## Fora de escopo preservado

F-01/F-02: diff sem pesos, taxonomia, curadoria, troca de fornecedor, backfill ou alteração de dados reais. PASS.

## Referência visual

A captura do erro é diagnóstico/contraexemplo, não alvo normativo de composição. Não há redesenho da tela.

## Desvios e mudanças

Nenhum desvio do comportamento aprovado identificado localmente. Não houve nova decisão do Product Owner durante a execução.

## Validação final, Git e ambientes

Pendente: checagens finais, commit/push, CI, migration, Edge, web, smoke e sincronização.

## Conclusão

PARTIAL até publicação e evidência operacional.
