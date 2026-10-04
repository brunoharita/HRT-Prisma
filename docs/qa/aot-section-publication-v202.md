# AoT — publicação de seções personalizadas v2.0.2

Acordo/prompt `agreement-section-publication-v202.md` 1.0.0. Baseline `39e72b9`, risco D; branch `codex/fix-section-publication-v202`. Produto mantém v2.0.2 e formatos persistidos 1.0.0. Mapa do acordo: publicação/trigger direct; evidências/IDs/histórico/auth/tenant critical_transversal; extração de títulos aprendidos plausible_indirect; web/Parser/matching/Knowledge/OCR/Unicode no_impact_identified.

## Diagnóstico e acordos

Logs de 2026-10-04 01:55:48/01:56:03 UTC: SQLSTATE 23505 em `private.learn_approved_custom_profile_sections`, no INSERT de definição, rollback durante `approve_profile_review` chamado por `publish_profile_review`. Consulta tenant-scoped confirmou revisão draft/lock 1, zero Perfis/operações de aprovação; título coincidente/mesmo formato, IDs diferentes. Reprodução local com duas Pessoas sintéticas confirmou mesma constraint de nome normalizado. A mensagem genérica de conflito não era prova de publicação anterior.

| ID | Implementação / evidência | Status |
| --- | --- | --- |
| D-S01 | nome normalizado exato antes de chave; SQL primeira/segunda publicação com IDs diferentes mantém uma definição e proveniência por fonte | PASS |
| D-S02 | advisory lock transacional por organização reutiliza padrão existente; confirmações idempotentes; SQL formato/renomeação/replay e duas conexões com lock até rollback | PASS |
| D-S03 | grants/gates/RLS/histórico e IDs de fontes preservados; negativos SQL; 243/243 person-flow PASS | PASS |
| D-S04 | migration forward-only; CI/produção/contexto/sincronização pendentes | PARTIAL |
| P-S01 | apenas metadados, coincidência exata, fonte/histórico/autoridade preservados; nenhum Perfil real publicado pelo agente | PASS |

## Validação e limites

14 testes dirigidos customProfileSections/lifecycle/Delta PASS; TypeScript build PASS. SQL real PostgreSQL 17 local: cinco primeiras publicações e seus replays, chaves distintas/memo título, mesma chave/formato/renomeação, catálogo canônico, contagem, ledger, negativas member/outsider/no session/anon/DML, isolamento entre tenants e imutabilidade PASS com rollback. Duas conexões comprovam que uma publicação detém o lock do catálogo até rollback e outra não consegue adquiri-lo; após rollback o lock fica disponível. Regressão SQL original import/Unicode/evidências PASS com rollback. A fixture de ator outsider foi alinhada à validação vigente de membership; assert SQL ganhou qualificação explícita de coluna; no session esperado 42501, sem alterar gates do produto.

Person-flow teve falhas ENOTEMPTY na limpeza do Temp Windows; execução com Temp dentro do repositório resolveu limpeza mas invalidou a expectativa do runner de pasta sem Git. Verificação final com acesso normal ao Temp PASS: 243/243, mesmos testes/assertions e runner, sem mudança no produto. Os probes intencionais de relatório de falha passaram. Lint 805 arquivos e foundation 18 tabelas públicas/seis versões PASS.

Publicação autenticada da revisão real não executada; nenhum dado pessoal foi exportado e nenhuma decisão humana simulada em produção. Browser autenticado indisponível no ambiente permanece limite NOT TESTED; consulta read-only após rollout deve confirmar preservação da revisão. A captura fornecida é exemplo da falha, não alvo de redesenho visual.

## Produção

Pendente: somente migration, nenhuma reconstrução web/Parser. O AoT será fechado com migration/ledger, função instalada/grants, CI, HTTPS/readiness e main/origin/VPS alinhados.
