# AoT — Prisma v2.0.2: compatibilidade das evidências de importação

Contrato: `agreement-import-evidence-v202.md` 1.0.0, execução 1.0.0, autorização de Bruno em 2026-10-03. Risco D, baseline `e55c2b7`, branch `codex/fix-import-evidence-v202`. Este registro separa QA local comprovada de rollout ainda pendente; o fechamento operacional será acrescentado após publicação.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste/evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Categorias e fontes compatíveis | adaptador determinístico, caminhos SQL/revisão alinhados | 71 testes dirigidos; SQL categorias/IDs curtos e máximos/reabertura | PARTIAL | sintético local; replay do incidente no servidor pendente |
| D-02 | Preflight e autoridade equivalente | validador TS/SQL, alvo/página/arrays/limites/box | negativos, rollback sem páginas/tentativas, método/origem | PASS | PostgreSQL 17 descartável e domínio |
| D-03 | Diagnóstico seguro e transacional | RPC reviewer tenant-scoped, evento existente/idempotência | SQL auth/papel/tenant/PII e serviço com falha da auditoria | PASS | falha de sincronização explícita sem erro bruto |
| D-04 | Estado e recuperação coerentes | progresso em estruturação, mensagens/ações próprias | testes de estado; renders desktop 1440 px e mobile 390 px PASS | PASS | composição existente; aviso mobile recebe quebra da ação |
| D-05 | Recuperação original/cache sem publicação | preparação revalida vínculo e adapta resposta antiga | cache/modelo/prompt/hash; recuperação com fonte sintética; Perfil vigente SQL intacto | PARTIAL | incidente real ainda não retomado; nenhum modelo externo chamado |
| D-06 | v2.0.2/main/produção | registro único, migration/Parser/web seletivos | verificações locais e Context Pack/CI/rollout em fechamento | PARTIAL | produção ainda no baseline |

## Proibições verificadas

| ID | Guardrail | Teste/evidência | Status |
| --- | --- | --- | --- |
| P-01 | Auth/tenant/fonte/geometria/limites | negativos domínio, serviço e SQL/RLS; QA localhost distinta | PASS |
| P-02 | Sem IA paga/Perfil aprovado/cache apagado | provider mock, cache mock, fixture SQL aprovado intacto, diff | PASS |
| P-03 | Sem colapso/reclassificação/trabalho alheio | descriptors preservados integralmente; categorias separadas; Git status | PASS |

## Mapa de Impacto e Preservação

| Capacidade / área | Relação | Baseline | Regressão/evidência | Status |
| --- | --- | --- | --- | --- |
| Parser/adaptador/cache | direct | parser-ia-1.0.0, prompt/hash originais | IDs/raízes, cache antigo sem mutação, provider mock/cache/binding | PASS |
| Persistência/revisão | direct | RPC privada/migrations reais | PostgreSQL synthetic + rollback, idempotência, abertura/reabertura, histórico categorias | PASS |
| Diagnóstico/auditoria | direct | evento processing_failed | metadata allowlist, função privada inacessível, RPC sem anon, transação | PASS |
| Auth/tenant/Perfil | critical_transversal | gates existentes | recruiter/member/outsider/no session/RLS, Perfil baseline intacto | PASS |
| UX/processamento | direct | screenshot do incidente, contraexemplo de estado | estados testes, quatro renders e sem overflow a 390 px | PASS |
| Versão/hosting | direct | runtime v2.0.1/4ccfbf1 | version tests, rollout pendente | PARTIAL |
| Gateway/Traefik | plausible_indirect | containers existentes preservados | transporte/loopback tests PASS, smoke remoto pendente | PARTIAL |
| Matching/Knowledge/OCR | no_impact_identified | não consomem adaptador novo; deploy excluído | análise do diff: sem regras/matching/score/taxonomia/OCR | PASS |

### Novidade e preservação

- Novidade: adaptador aditivo, títulos/fontes compatíveis, diagnóstico sanitizado e recuperação causal.
- Preservação: prompt/modelo/chave/cache, fatos/evidências/listas, isolamento, gates, Perfil vigente, publicação humana e material não rastreado.
- Dependência descoberta: duas constraints e RPC de evidência manual/histórico precisaram acompanhar as raízes existentes; revisão SQL real incluída. Estilos do aviso mobile são necessários para o texto e ação caberem sem overflow.
- Limites: PostgreSQL local reproduz as migrations/persistência reais com bootstrap mínimo auth/storage; não representa todos os serviços remotos. Produção não foi usada para fixtures.

## Fora de escopo preservado

F-01/F-02 PASS no diff: sem novos formatos, OCR, fila, matching, Knowledge, schema de Perfil ou redesenho da jornada. Ferramentas/contextos são categorias preexistentes; apenas sua evidência/revisão é compatibilizada.

## Fidelidade visual

A imagem fornecida é contraexemplo de estado, não target de redesenho. Quatro renders locais conferidos: permanent/transient/ready a 1440×900 e permanent a 390×844, sem erro JS ou overflow horizontal; captures sintéticas ficam em `assets/import-evidence-v202/`. Estado de persistência/falha permanece em Estruturando e não apresenta Revisão como concluída.

## Desvios e limitações

Sem alteração do escopo aprovado. A revisão automática rejeitou exportar o cache privado de produção para QA local por PII sem autorização específica; não houve cópia nem contorno. A alternativa é validação sintética e inspeção/replay no próprio servidor, imprimindo apenas contagens/metadados. O mecanismo CUA não iniciou por erro de caminho dos assets; a renderização local usa Chromium headless independente, sem acessar abas/sessões do usuário.

## Validação final / Git / ambiente

71/71 testes dirigidos, 243/243 da regressão person-flow e 4/4 de versão PASS. `node scripts/verify-import-evidence.mjs` PASS: todas as gravações em localhost:55479/import_evidence_v202 foram revertidas por ROLLBACK. Typecheck web, build TypeScript, build web e lint PASS. Context Pack regenerado/verificado e 3/3 testes PASS em snapshot do índice sem documento alheio não rastreado; exports copiados pelo gerador, nunca editados manualmente. Migration final aplicada em clone QA com gates anteriores restaurados e smoke SQL PASS/rollback. CI e Git/main/rollout pendentes. Arquivos não relacionados preservados: `.tmp.driveupload/`, acordo matching, Dockerfile GPU e teste duplicado.

## Conclusão

Implementação local validada nas fronteiras de persistência. D-01/D-05/D-06 ainda PARTIAL até completar replay/smoke e publicação; não constitui declaração de entrega em produção.
