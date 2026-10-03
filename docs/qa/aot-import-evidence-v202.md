# AoT — Prisma v2.0.2: compatibilidade das evidências de importação

Contrato: `agreement-import-evidence-v202.md` 1.0.0, execução 1.0.0, autorização de Bruno em 2026-10-03. Risco D, baseline documental `e55c2b7`/runtime `4ccfbf1`, branch `codex/fix-import-evidence-v202`. SHA funcional publicado `6a636059dcec30e3febe77a375bffdde4163f94f`, após `8ed9c3f`. Este fechamento distingue implementação/QA/replay e smoke de produção da retomada autenticada da tentativa antiga, que permanece NOT TESTED.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste/evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Categorias e fontes compatíveis | adaptador determinístico, caminhos SQL/revisão alinhados | 71 testes dirigidos; SQL categorias/IDs curtos e máximos/abertura/reabertura; replay real 31 fatos/39 evidências/dois títulos | PASS | PostgreSQL 17 local e PDF/cache exatos no servidor |
| D-02 | Preflight e autoridade equivalente | validador TS/SQL, alvo/página/arrays/limites/box | negativos, rollback sem páginas/tentativas, método/origem | PASS | PostgreSQL 17 descartável e domínio |
| D-03 | Diagnóstico seguro e transacional | RPC reviewer tenant-scoped, evento existente/idempotência | SQL auth/papel/tenant/PII e serviço com falha da auditoria | PASS | falha de sincronização explícita sem erro bruto |
| D-04 | Estado e recuperação coerentes | progresso em estruturação, mensagens/ações próprias | testes de estado; renders desktop 1440 px e mobile 390 px PASS | PASS | composição existente; aviso mobile recebe quebra da ação |
| D-05 | Recuperação original/cache sem publicação | preparação revalida vínculo e adapta resposta antiga | fluxo dirigido de retry/cache/fonte; idempotência SQL; Perfil vigente intacto; replay exato sem rede/cache alterado | PASS | capacidade provada em QA/replay; ação humana autenticada em produção NOT TESTED |
| D-06 | v2.0.2/main/produção | registro único, migration/Parser/web seletivos | Context Pack, CI branch/main, migration/grants, imagens/rollback, readiness e HTTPS/versão | PASS | runtime funcional em main/origin/VPS; fechamento documental não recria runtime |

## Proibições verificadas

| ID | Guardrail | Teste/evidência | Status |
| --- | --- | --- | --- |
| P-01 | Auth/tenant/fonte/geometria/limites | negativos domínio, serviço e SQL/RLS; QA localhost distinta | PASS |
| P-02 | Sem IA paga/Perfil aprovado/cache apagado | provider mock, cache mock, fixture SQL aprovado intacto, diff | PASS |
| P-03 | Sem colapso/reclassificação/trabalho alheio | descriptors preservados integralmente; categorias separadas; Git status | PASS |

## Mapa de Impacto e Preservação

| Capacidade / área | Relação | Baseline | Regressão/evidência | Status |
| --- | --- | --- | --- | --- |
| Parser/adaptador/cache | direct | parser-ia-1.0.0, prompt/hash originais | IDs/raízes, provider mock/cache/binding; replay real mantendo bytes do cache e todas as regiões | PASS |
| Persistência/revisão | direct | RPC privada/migrations reais | PostgreSQL synthetic + rollback, idempotência, abertura/reabertura, histórico categorias | PASS |
| Diagnóstico/auditoria | direct | evento processing_failed | metadata allowlist, função privada inacessível, RPC sem anon, transação | PASS |
| Auth/tenant/Perfil | critical_transversal | gates existentes | recruiter/member/outsider/no session/RLS, Perfil baseline intacto | PASS |
| UX/processamento | direct | screenshot do incidente, contraexemplo de estado | estados testes, quatro renders e sem overflow a 390 px | PASS |
| Versão/hosting | direct | runtime v2.0.1/4ccfbf1 | version tests, SHA funcional 6a63605, HTTPS/assets/versão e rollback | PASS |
| Gateway/Traefik | plausible_indirect | containers existentes preservados | mesmos IDs/imagens/zero reinícios, transporte/loopback e readiness remoto | PASS |
| Matching/Knowledge/OCR | no_impact_identified | não consomem adaptador novo; deploy excluído | análise do diff: sem regras/matching/score/taxonomia/OCR | PASS |

### Novidade e preservação

- Novidade: adaptador aditivo, títulos/fontes compatíveis, diagnóstico sanitizado e recuperação causal.
- Preservação: prompt/modelo/chave/cache, fatos/evidências/listas, isolamento, gates, Perfil vigente, publicação humana e material não rastreado.
- Dependência descoberta: duas constraints e RPC de evidência manual/histórico precisaram acompanhar as raízes existentes; revisão SQL real incluída. Estilos do aviso mobile são necessários para o texto e ação caberem sem overflow.
- Limites: PostgreSQL local reproduz as migrations/persistência reais com bootstrap mínimo auth/storage; não representa todos os serviços remotos. Produção não foi usada para fixtures. Retomada humana autenticada do incidente em produção NOT TESTED; replay não é gravação de revisão.

## Fora de escopo preservado

F-01/F-02 PASS no diff: sem novos formatos, OCR, fila, matching, Knowledge, schema de Perfil ou redesenho da jornada. Ferramentas/contextos são categorias preexistentes; apenas sua evidência/revisão é compatibilizada.

## Fidelidade visual

A imagem fornecida é contraexemplo de estado, não target de redesenho. Quatro renders locais conferidos: permanent/transient/ready a 1440×900 e permanent a 390×844, sem erro JS ou overflow horizontal; captures sintéticas ficam em `assets/import-evidence-v202/`. Estado de persistência/falha permanece em Estruturando e não apresenta Revisão como concluída.

## Desvios e limitações

Sem alteração do escopo aprovado. A revisão automática rejeitou exportar o cache privado de produção para QA local por PII sem autorização específica; não houve cópia nem contorno. A alternativa aprovada foi validação sintética e replay no próprio servidor, imprimindo apenas contagens/metadados. O mecanismo CUA não iniciou por erro de caminho dos assets; a renderização local usou Chromium headless independente, sem acessar abas/sessões do usuário. O acesso headless HTTPS público também falhou por ERR_CONNECTION_RESET, enquanto o smoke de servidor passou. Nenhuma credencial de navegador foi extraída. O fluxo autenticado de retomar/revisar em produção permanece NOT TESTED, sem inferir sucesso dele a partir de QA ou HTTPS público.

## Validação final / Git / ambiente

71/71 testes dirigidos, 243/243 da regressão person-flow, 4/4 de versão e 15/15 tooling de release (incluindo 3 de Context Pack) PASS. `node scripts/verify-import-evidence.mjs 55479 import_evidence_v202_final` PASS: todas as gravações em PostgreSQL 17 localhost foram revertidas por ROLLBACK; a abertura/reabertura usou a RPC real `start_document_revision`, com todos os vínculos de evidência, inclusive títulos/ferramentas/contextos. Migration final aplicada no clone QA com gates anteriores restaurados antes do patch. Typecheck web, build TypeScript, build web, lint (796 arquivos), foundation e ledger check PASS. Context Pack regenerado/verificado em snapshot do índice sem documento alheio não rastreado; exports gerados, nunca editados manualmente. CI branch `37149710220` e main `37149767949` PASS; a suíte completa existente do CI passou, sem execução local de `pnpm validate`. Arquivos não relacionados preservados: `.tmp.driveupload/`, acordo matching, Dockerfile GPU e teste duplicado; `models/` não rastreado na VPS preservado.

### Produção e preservação

- Migration `import_evidence_persistence_contract` aplicada e ativa: versão local `20261003193000`, remota `20261003195747`. Contrato `import-evidence-1.0.0`, caminhos de títulos/ferramentas/contextos e grants comprovados: RPC pública autenticada, anon negado, helper privado inacessível. Alias específico registrado no ledger; fingerprint continua unverified, sem alegar auditoria histórica global ou executar db push.
- `/opt/prisma`, main local e origin alinhados no SHA funcional `6a636059dcec30e3febe77a375bffdde4163f94f` no smoke. O plano exigiu banco/web; a dependência compartilhada do Parser no domínio TS foi explicitada no mapa e motivou seu rebuild seletivo, sem publicar Edge/OCR/serviços alheios.
- Parser container `d8a883c3a4a97092c7eb1336310ea8b5d2288d25cb0bfb20fc57e997943c58b4`, imagem `sha256:3775ce1ef5b4b9ee116c5cef8b197e2ddf3d1ab75169937389d0aea4f0d30297`: running/healthy, zero reinícios; readiness `available/ready`.
- Web container `1ba607ea09c8f0a190b92d751a6d2ba8ab804105e338ab30056540159129a7f7`, imagem `sha256:1c8082cca28a40e1a7be3b2d7e9d09d49d31accf0c8e7592944204449a99fd49`: running, zero reinícios. Após 404 transitório do smoke imediato, raiz/login/index e os sete assets HTML retornaram 200. Bundle `/assets/index-H71Tt97t.js` contém SHA funcional, adaptador, diagnóstico e registro 2.0.2; entrada anterior `/assets/index-C2XmZklw.js` permanece 200 para abas antigas.
- Rollbacks preservados: `prisma-parser-ia:rollback-before-6a636059dcec` (imagem `116fe4fbb904dd08005b5edbfbe27c358dbc12c1a4eb0493e0d626136de6bac8`) e `prisma-web:rollback-before-6a636059dcec` (`974d6f4036d472ad2bd2952078475b320b07344b3b496533ac8600893f38a0ed`). Migration forward-only; não remover validações/grants em rollback sem decisão própria.
- Gateway `prisma-paddle-gateway` conservou ID `2eed2dd379eacf4ff58d83f034f5ff7a122792ba7fa7da3977cda580bc74e983` e imagem `d061cea3ae0a785f5cc0879704e1918666d22aa51236ec4ff7384b1387d2cf99`; Traefik `traefik-traefik-1` conservou ID `5e25fdc6d2e6fd3c622972310f67f640b80cac70538e17b42a529d1935488bc6` e imagem `f86a2cab1b5c649070c49f883c743dd32d8485a56e3368c5f93b9e91f1e91259`, ambos running/zero reinícios. O serviço de teste Paddle já unhealthy no baseline não foi alterado. Parser hospedado sem contrato/origem retornou 403; com contrato/origem e sem autenticação retornou 401.

### Replay exato e tentativa antiga

PDF fornecido: SHA256 `4961cad98189e7adb47e9af617cc7f8e69a28b2efa49ed85f93b7c985efa199a`, 64.197 bytes, uma página nativa. Replay no container publicado leu o PDF original e o cache correspondente em sua organização, com rede proibida, sem copiar cache privado para QA. Resultado `V202_INCIDENT_REPLAY_PASS`: 31 fatos, 39 evidências, dois títulos; textos/coordenadas/regiões/fatos preservados, caminhos/alvos/geometria válidos, cache com bytes idênticos, zero chamadas de rede/IA. O método original ganha somente o marcador aditivo `evidence-adapter-1.0.0`, mantendo prompt/modelo/chave.

Consulta read-only após rollout confirmou a tentativa original única em failed/not_ready, zero páginas persistidas, zero revisões e zero Perfis publicados. Isso é esperado antes de uma retomada humana e não demonstra importação já recuperada. A recuperação deve ser acionada pelo operador após atualizar a página e abrir a Central da Pessoa; pode avançar somente até revisão. Sem impersonação, decisão humana fabricada ou publicação automática.

## Conclusão

Prisma v2.0.2 publicado, D-01 a D-06 e P-01 a P-03 PASS nas evidências especificadas. A capacidade de recuperação está comprovada por testes dirigidos, SQL real com rollback e replay exato; o clique autenticado de retomar a tentativa antiga em produção permanece NOT TESTED e a tentativa continua aguardando essa ação. O fechamento documental é sincronizado em main/origin/VPS, preservando as imagens do SHA funcional sem novo rebuild.
