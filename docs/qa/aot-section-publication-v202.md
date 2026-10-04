# AoT — publicação de seções personalizadas v2.0.2

Acordo/prompt `agreement-section-publication-v202.md` 1.0.0. Baseline `39e72b9`, risco D; branch `codex/fix-section-publication-v202`. Produto mantém v2.0.2 e formatos persistidos 1.0.0. Mapa do acordo: publicação/trigger direct; evidências/IDs/histórico/auth/tenant critical_transversal; extração de títulos aprendidos plausible_indirect; web/Parser/matching/Knowledge/OCR/Unicode no_impact_identified.

## Diagnóstico e acordos

Logs de 2026-10-04 01:55:48/01:56:03 UTC: SQLSTATE 23505 em `private.learn_approved_custom_profile_sections`, no INSERT de definição, rollback durante `approve_profile_review` chamado por `publish_profile_review`. Consulta tenant-scoped confirmou revisão draft/lock 1, zero Perfis/operações de aprovação; título coincidente/mesmo formato, IDs diferentes. Reprodução local com duas Pessoas sintéticas confirmou mesma constraint de nome normalizado. A mensagem genérica de conflito não era prova de publicação anterior.

| ID | Implementação / evidência | Status |
| --- | --- | --- |
| D-S01 | nome normalizado exato antes de chave; SQL primeira/segunda publicação com IDs diferentes mantém uma definição e proveniência por fonte | PASS |
| D-S02 | advisory lock transacional por organização reutiliza padrão existente; confirmações idempotentes; SQL formato/renomeação/replay e duas conexões com lock até rollback | PASS |
| D-S03 | grants/gates/RLS/histórico e IDs de fontes preservados; negativos SQL; 243/243 person-flow PASS | PASS |
| D-S04 | migration forward-only ativa; CI branch/main, Context Pack, função/grants/HTTPS/readiness e main/origin/VPS PASS | PASS |
| P-S01 | apenas metadados, coincidência exata, fonte/histórico/autoridade preservados; nenhum Perfil real publicado pelo agente | PASS |

## Validação e limites

14 testes dirigidos customProfileSections/lifecycle/Delta PASS; TypeScript build PASS. SQL real PostgreSQL 17 local: 52 verificações PASS, cinco primeiras publicações e seus replays, chaves distintas/mesmo título, mesma chave/formato/renomeação, catálogo canônico, contagem, ledger, vínculos/descritores de evidência intactos, rollback por lock desatualizado, negativas member/outsider/no session/anon/DML, isolamento entre tenants e imutabilidade, tudo revertido. Duas conexões comprovam que uma publicação detém o lock do catálogo até rollback e outra não consegue adquiri-lo; após rollback o lock fica disponível. Regressão SQL original import/Unicode/evidências PASS com rollback. A fixture de ator outsider foi alinhada à validação vigente de membership; assert SQL ganhou qualificação explícita de coluna; no session esperado 42501, sem alterar gates do produto.

Person-flow teve falhas ENOTEMPTY na limpeza do Temp Windows; execução com Temp dentro do repositório resolveu limpeza mas invalidou a expectativa do runner de pasta sem Git. Verificação final com acesso normal ao Temp PASS: 243/243, mesmos testes/assertions e runner, sem mudança no produto. Os probes intencionais de relatório de falha passaram. Lint 805 arquivos e foundation 18 tabelas públicas/seis versões PASS.

Context Pack gerado no snapshot limpo do índice (arquivo alheio não versionado excluído), checker e 15 testes release/context tooling PASS. Dispatcher indica apenas migration e tooling/documentação; nenhuma superfície web/Edge Function/Parser exige deploy. A seleção local cobre SQL/negativas e regressão dirigida; a suíte integral de foundation permanece na CI existente, não foi adicionada uma execução integral local. Diff revisado, sem desvio do acordo ou nova dependência.

Publicação autenticada da revisão real não executada; nenhum dado pessoal foi exportado e nenhuma decisão humana simulada em produção. Browser autenticado indisponível no ambiente permanece limite NOT TESTED; consulta read-only após rollout deve confirmar preservação da revisão. A captura fornecida é exemplo da falha, não alvo de redesenho visual.

## Produção

SHA funcional deste complemento `a9fa4da67c6b8594c867fa201f4cf9b2be19f94e` em main/origin/VPS, CI branch `37171126316` e main `37171190935` PASS. Migration local `20261004023000_custom_section_publication_identity` ativa no backend existente `ioldpnqqvobprjiontre` sob versão remota `20261004022925`, alias registrado no ledger; fingerprint de statements unverified, divergências históricas não foram reparadas. Hash MD5 do corpo da função com CR removido `7a193b20aaceb4221e178169c111628f` coincide com QA local. Trigger continua privado, publicação authenticated permitida/anon negada, RLS nas duas tabelas ativo.

Nenhuma reconstrução: Parser `62002e8523d8` healthy/running/zero reinícios, web `1f3622e635c8`, gateway `2eed2dd379ea` e Traefik `5e25fdc6d2e6` running/zero reinícios, IDs iguais ao baseline. Runtime web/Parser permanece no SHA de build `96e3ecb`, pois esta mudança é somente SQL. `/`, `/sign-in`, `/assets/index-B-jkzCiv.js` HTTPS 200 e readiness available/ready. O primeiro comando de readiness falhou por terminação de linha no transporte PowerShell; reexecução do comando corrigido PASS, sem alterar serviço. `models/` não versionado na VPS e os quatro arquivos/diretórios locais fora do escopo preservados. PostgreSQL temporário próprio encerrado.

Consulta read-only pós-rollout: revisão real continua draft/lock 1, zero Perfis e approved_profile_id null. O operador pode atualizar a comparação e clicar “Publicar Perfil v1”; essa ação real não foi executada pelo agente. Conclusão: comportamento novo e preservação PASS nas provas descritas; smoke autenticado real NOT TESTED, explicitamente admitido no acordo. O fechamento documental será sincronizado sem reconstruir runtime.

Rollback: alteração restrita ao corpo do trigger, sem DDL destrutivo ou saneamento de dados. Em incidente, restaurar o corpo anterior de `20260830201029_review_approval_runtime_hardening.sql` em migration forward-only revisada, preservando revokes e histórico; isso restaura o baseline e sua limitação conhecida. Não remover confirmações/Perfis nem reparar o ledger para fazer rollback.
