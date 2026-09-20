# AoT — M8.2 Classificação global de competências

Contrato: `docs/agreements/agreement-m82-global-competency-classification.md` v1.0.0. Prompt: `docs/qa/execution-m82-global-competency-classification.md`. Evidência abaixo distingue lote local, banco remoto e Perfil real. Estado: **PARCIAL** até publicação e smoke.

## Matriz de Acordos

| ID | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-01 | Classificador ESCO/O*NET sobre fonte oficial e nove subgrupos | Revisão semântica e URI de Comunicação | 13.939 URIs ESCO processadas; 37/44 habilidades O*NET classificadas; 1 conceito Prisma H4 | PASS | Lote local |
| D-02 | 14 migrations ESCO e migrations O*NET/Prisma | QA SQL de cobertura | Restore isolado: 22.876/22.885 elegíveis (99,96%); nove pendentes | PARTIAL | Aplicação remota pendente |
| D-03 | Comunicação ESCO → S1 na classificação canônica | QA SQL e projeção v6 | URI `15d76317-c71a-4fa2-aadc-2ecc34e627b7` em S1 no restore; Perfil da captura ainda tinha zero associações no backup anterior | PARTIAL | Smoke do Perfil real remoto pendente |
| D-04 | Método `ai_assisted`, constraint e razão/versão/fonte por linha | Migration e teste negativo de proveniência | QA SQL PASS; classificação humana conserva método distinto | PASS | Restore local |
| D-05 | Auditoria independente, arbitragem e overrides por URI | 1.011 Soft + 1.289 Hard amostrados; 820 divergências arbitradas; revisão manual de exemplos | 13.936 URIs ESCO classificadas, três pendentes; oito correções explícitas; nenhum dado pessoal enviado | PASS | A auditoria reduz erros conhecidos; não prova acurácia perfeita |
| D-06 | Classificação global com `not exists` para corrente | QA SQL de escopo/histórico e revisão das migrations | Zero `ai_assisted` organizacional/ocupação/certificação; zero sobrescrita humana no restore | PASS | Produção pendente |
| D-07 | Preflight de mapping, migrations idempotentes, reversão documentada | 14 lotes ESCO + O*NET + Prisma aplicados em PostgreSQL isolado; rerun representativo | QA local PASS; restore removido; runbook de reversão criado | PARTIAL | Rollout e Perfil remoto pendentes |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Sem inferência ou elevação de evidência pessoal | Diff não altera Pessoa/evidência; projeção v6 reutilizada | PASS local | PASS |
| P-02 | Sem regra lexical/tipo nativo/confiança isolada | Prompts, amostra independente e arbitragem; Comunicação `knowledge` → S1 | PASS local | PASS |
| P-03 | Sem escopo incorreto ou sobrescrita humana | Trigger/constraint, `not exists`, QA SQL negativo | PASS local | PASS |
| P-04 | Sem dado pessoal/segredo enviado à IA | Inspeção dos campos dos scripts e arquivos de resultados | Só dados públicos ESCO/O*NET; chave lida de `.env.local`, não impressa | PASS |
| P-05 | Sem equivalência/identidade duplicada | Join por URI/external ID; seis pares de URI revisados | Um conceito canônico ambíguo ficou pendente, sem duplicação | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | Diff não altera limpeza, matching, Score, parser, Assessment, cadastro de subgrupos ou layout | PASS |
| F-02 | Só conceitos Globais recebem `ai_assisted`; proposta humana M8.1 permanece | PASS |

## Evidência de fidelidade visual

Não aplicável: o movimento reusa a projeção e as telas M8.1; não cria nem altera layout.

## Desvios do contrato

Nenhum desvio identificado no escopo local. O Perfil real e a produção ainda não estão provados.

## Mudanças autorizadas durante a execução

A decisão do Product Owner de 2026-09-20 autoriza a classificação inteligente em quase todos os casos, superando A-12 do M8.1 apenas para o catálogo global.

## Validação final

As chamadas de IA receberam somente dados públicos de conceitos. Custo estimado pelo uso registrado: ESCO US$11,55; O*NET US$0,024; auditorias US$0,8225 + US$0,8567; arbitragem US$1,1464; total aproximado US$14,40, abaixo do teto US$20 comunicado. A autoconfiança do classificador não foi usada como prova. O restore local foi aplicado em contêiner PostgreSQL Supabase 17.6.1 sem rede nem volume persistente, incluindo M8.1 e M8.2; QA `m82_global_competency_verification.sql` retornou 22.876/22.885 e teste negativo de proveniência PASS. O contêiner foi removido. A tentativa de projeção sem usuário autenticado rejeitou como esperado. O backup antecede a associação do Perfil citado, logo não comprova essa jornada real.

## Git / QA / ambiente

Branch `codex/m82-global-competency-classification`; commit, main, remoto e web ainda pendentes.

## Conclusão

Localmente validado. A entrega completa depende do rollout e smoke remoto.
