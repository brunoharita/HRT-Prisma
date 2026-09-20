# AoT — M8.2 Classificação global de competências

Contrato: `docs/agreements/agreement-m82-global-competency-classification.md` v1.0.0. Prompt: `docs/qa/execution-m82-global-competency-classification.md`. Evidência abaixo distingue lote local, banco remoto e Perfil real. Estado: **PARCIAL** apenas pela inspeção visual autenticada do Perfil real ainda pendente.

## Matriz de Acordos

| ID | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- |
| D-01 | Classificador ESCO/O*NET sobre fonte oficial e nove subgrupos | Revisão semântica e URI de Comunicação | 13.939 URIs ESCO processadas; 37/44 habilidades O*NET classificadas; 1 conceito Prisma H4 | PASS | Lote local |
| D-02 | 14 migrations ESCO e migrations O*NET/Prisma | QA SQL de cobertura local e remoto | Produção: 22.876/22.885 elegíveis (99,96%); nove pendentes; 17 migrations M8.2 no ledger remoto | PASS | Único Supabase remoto |
| D-03 | Comunicação ESCO → S1 na classificação canônica | QA SQL e projeção v6 | URI `15d76317-c71a-4fa2-aadc-2ecc34e627b7` em S1; RPC autenticada do Perfil real: uma associação de Comunicação em Soft/S1 | PARTIAL | A tela hospedada do Perfil ainda não foi inspecionada autenticada |
| D-04 | Método `ai_assisted`, constraint e razão/versão/fonte por linha | Migration e teste negativo de proveniência | QA SQL PASS; classificação humana conserva método distinto | PASS | Restore local |
| D-05 | Auditoria independente, arbitragem e overrides por URI | 1.011 Soft + 1.289 Hard amostrados; 820 divergências arbitradas; revisão manual de exemplos | 13.936 URIs ESCO classificadas, três pendentes; oito correções explícitas; nenhum dado pessoal enviado | PASS | A auditoria reduz erros conhecidos; não prova acurácia perfeita |
| D-06 | Classificação global com `not exists` para corrente | QA SQL de escopo/histórico e revisão das migrations | Zero `ai_assisted` organizacional/ocupação/certificação; zero sobrescrita humana no restore e no QA remoto | PASS | Produção conferida |
| D-07 | Preflight de mapping, migrations idempotentes, reversão documentada | 14 lotes ESCO + O*NET + Prisma aplicados em PostgreSQL isolado; rerun representativo; QA remoto | QA local/remoto PASS; restore removido; runbook de reversão; projeção v6 do Perfil real confirmada | PASS | Rollout remoto concluído |

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

Nenhum desvio de implementação identificado. O backend do Perfil real foi provado; falta a conferência visual da tela autenticada.

## Mudanças autorizadas durante a execução

A decisão do Product Owner de 2026-09-20 autoriza a classificação inteligente em quase todos os casos, superando A-12 do M8.1 apenas para o catálogo global.

## Validação final

As chamadas de IA receberam somente dados públicos de conceitos. Custo estimado pelo uso registrado: ESCO US$11,55; O*NET US$0,024; auditorias US$0,8225 + US$0,8567; arbitragem US$1,1464; total aproximado US$14,40, abaixo do teto US$20 comunicado. A autoconfiança do classificador não foi usada como prova. O restore local foi aplicado em contêiner PostgreSQL Supabase 17.6.1 sem rede nem volume persistente, incluindo M8.1 e M8.2; QA `m82_global_competency_verification.sql` retornou 22.876/22.885 e teste negativo de proveniência PASS. O contêiner foi removido. A tentativa de projeção sem usuário autenticado rejeitou como esperado. No Supabase remoto, o mesmo QA passou, a cobertura é 22.876/22.885, e a RPC v6 autenticada retornou uma associação de Comunicação em Soft/S1 para o Perfil citado, sem novo vínculo pessoal.

## Git / QA / ambiente

Branch `codex/m82-global-competency-classification`; commit `6525cfc2ade94106c449d34f84dc5d0ca5ec6c74`. CI `Prisma foundation CI` [#35534203056](https://github.com/brunoharita/HRT-Prisma/actions/runs/35534203056) PASS. `main`, `origin/main` e VPS `/opt/prisma` alinhados nesse SHA. As 17 migrations M8.2 constam no ledger do único Supabase remoto. Somente `prisma-web` foi reconstruído e recriado; imagem `sha256:7650d70d8bde9fcb5383a528b9f8e02fd6df464f8859d054eb4092ca6b43896e`, contêiner `running`, zero reinícios. `release:verify`: Git alinhado e HTTPS 200. Login hospedado exibiu `v1.8.2` após recarga; o menu consome o mesmo registro de versão.

## Conclusão

Banco, release web e projeção autenticada do Perfil real validados em produção. CA-02 permanece parcial até confirmar visualmente a tela hospedada do Perfil; nenhuma acurácia perfeita é alegada.
