# AoT — Exceções isoladas da síntese v2.0.5

Contrato: `agreement-profile-synthesis-exceptions.md` v1.0.0 e acordo original v2.0.5 v1.0.0, lidos integralmente. Baseline main/origin/VPS080249e; imagemwebd59809c, worker1f233fe; riscoD/C. Autorização explícita de implementação e permanente de publicação AGENTS7. Produto2.0.5 mantido: correção do comportamento aprovado, diagnóstico1.0.0 separado do resultado/prompt1.0.0.

## Matriz de acordos

| ID | Acordo/implementação | Teste/evidência | Status/limite |
| --- | --- | --- | --- |
| D-E01 | Boundary só na síntese, resumo publicado/navegação preservados | Read/render/source failures 1416/390, `evidence/profile-synthesis-exceptions/ui-results.json` | PASS sintético |
| D-E02 | Motivos fixos/etapas/localização; tokens rejeitados; job/attempt JSONB; wrapper valida persistência | 31 contratos/worker, SQL privado/lease/diag sem PII, fixture109 fontes longas | PASS local; incidente antigo sem subcausa armazenada |
| D-E03 | Orientação específica; read/source não chamam IA; retry autenticado/espaçado<=3 sem reset | SQL auth/outsider/inativo/anon/cooldown/duplicidade/histórico/budget; UI duplo clique gera1retry | PASS local |
| D-UX-E01 | Bloco de diagnóstico com detalhes recolhidos; fallback original; layouts aprovados mantidos | 26 reports13 estadosx2 viewports, renders de erro no diretório de evidência | PASS sintético |
| D-E04 | QA/docs/contextos/release/smoke/recuperação controlada | Tipos/build/person-flow256; SQL em transação com rollback; CI branch/mainPASS; migração incremental/worker/web/smoke/rollback PASS | PASS; reprocessamento real requer autorização adicional |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-E01 | Evidência/limites/auth/tenant/history/custo preservados; nenhum corpo livre/segredo nos diagnósticos | Referências inventadas,121palavras,verificação semassessment,extraPII nos motivos,token/lease/outsider negados; falha anterior explicitamente desconhecida | PASS local |
| F-E01 | Parser/matching/fatos/modelo/perguntas fora do escopo | Diff dirigido, checker matching e person-flow256PASS; nenhum novo fornecedor/dependência | PASS local |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline | Regressão/evidência | Status |
| --- | --- | --- | --- | --- |
| Síntese/fonte/Resumo | direct | webed4e328, seis estados |26reports, fonte isolada eanterior preservada, original/header/nav | PASS |
| Worker/contrato | direct | worker497b2ee |31testes, oitoeixos/120palavras/refs permanecem | PASS |
| Auth/tenant/fila | critical_transversal | PostgreSQL17/migração inicial |migração inteira +incremental +QA rollback, oldworker argumentos compatíveis | PASS local |
| Perfil/publicação | plausible_indirect |256person-flow anterior |256person-flowPASS; optionalrender sóchild, transação legada preservada | PASS local |
| Parser/gateway/matching | no_impact_identified | imagens8682af7/d061cea |sem imports/contratos desses domínios no diff; checkmatchingPASS; runtime8682af7/d061cea preservado, running0restarts | PASS |
| Release/contextos | direct |080249e |CI/contextos/ledger/deployseletivo/HTTP200/health/rollback | PASS |

Novidade: diagnóstico fechado e recuperação segura; preservação: fato publicado, controle humano, snapshots e limites. Reuso da infraestrutura existente, classificação de auth em `supabaseOperationError` sem mensagens livres; sem observabilidade genérica nova. Migração antiga não é reescrita.

## Fidelidade visual

Imagem do incidente é contraexemplo da mensagem genérica. Referências normativas1/3 originais permanecem: composição70/30 e fonte60/40, informação/proveniência/ações nos grupos anteriores; screenshot1416 `word-limit-1416.png` e390 `render-error-390.png` documentam exceção isolada e original. Comparação visual conferida, sem mudança estrutural não autorizada; dados inteiramente sintéticos. Cabeçalho/abas reais em fixture; smoke autenticado de Pessoa real ainda NOT TESTED.

## Desvios / mudanças de escopo

Nenhum desvio de produto observado. Nenhuma ampliação material; versão permanece2.0.5. A causa específica original não era armazenada; não se declara que nova tentativa reconstrói o passado. UI local apresenta identificações fixas; tentativa remota persiste diagnóstico restrito. Não publicar Perfil real para testar.

## Validação final / Git / ambiente

SQL local rollback: migração inicial +incremental +33asserts e negativos PASS; tipos/build,31worker/contrato,256person-flow,19tooling/contextos,26renders PASS. CI branch37253116222/main37253193994 PASS no SHA funcional `a89bc451e0135930db83f2f08a32f43e3a6d246a`. Migração remota `20261005015407_profile_synthesis_diagnostics`: RLS/grants/colunas conferidos; retry e legacy negados aanon, DML/SELECT diretos negados aauth. Apenasweb/worker publicados. Web59958fe, entry `index-CR5aA1Nt.js`; worker49cbf2c healthy/idle/zero reinícios. Parser8682af7/gatewayd061cea preservados/zero reinícios. HTTPS /,/login,/people,novoentry,anteriorBjB3jE2B ePDFnovo HTTP200 após estabilizar404durante recriação, sem rebuild. Rollbacks d59809c/1f233fe registrados. Probes anônimos/token inválido HTTP401; fixture sintética dentro do worker validaOUTPUT_INCOMPLETE+50/80tokens sem chamada de IA. Não há QA Supabase separado verificado; PostgreSQL local descartável é usado para negativos de segurança.


## Resíduo operacional e aprovação

A tentativa real reportada permanece failed/RESPONSE_INVALID/attempts1/diagnosticnull. Não há texto de resposta antiga armazenado para estabelecer a subcausa. Reenfileiramento administrativo específico foi rejeitado pela revisão automática por envolver dados pessoais e potencial custo de IA, com entendimento de que a autorização de correção/publicação não abrange essa mutação específica. Nenhum contorno nem nova execução foi feito após o bloqueio. Solicitada autorização explícita adicional para uma tentativa limitada; investigação/recovery real: BLOCKED até resposta. A interface corrigida permite nova tentativa pelo operador autorizado; novo processamento nunca altera fatos aprovados.

Conclusão: implementação e publicação da correção PASS. Não se afirma que a síntese real foi recuperada, nem que todos os currículos sempre produzirão resposta válida; futuros motivos identificados continuam protegidos/explicados. Falha antiga sem diagnóstico detalhado não foi reinterpretada como erro de campo humano. Jornada autenticada real/qualidade da síntese desse Perfil: NOT TESTED nesta entrega.


## Complemento D-E03: consulta estritamente separada de geração

Na revisão final, o mesmo efeito de primeira consulta era reaplicado pelo botão Atualizar consulta. Em caso de primeira leitura interrompida e base sem job, isso poderia solicitar uma análise. Ajuste: primeira visita mantém o comportamento aprovado; consulta manual usa somente load. Se não há job após recuperar a consulta, estado Síntese ainda não solicitada oferece Gerar síntese como ação separada e explícita. Não gera resultado nem custo em refresh. Fixture query-only antes do ajuste faria request indevido; após: requests0 no refresh, requests1 somente após ação explícita, 1416/390 PASS. Rerun somente query-only/pending/retry/read-error, oito reports afetados; conjunto final28reportsPASS. Tipos/build PASS. Sem mudanças no worker, SQL, modelo ou fatos. Complemento publicado em main/origin/VPS no SHA funcional `e162d367b24e66c2663a83f22cc982d9b096d395`, CI branch37254700232/main37254784205 PASS. Somenteweb: imagemd3b30ec, entryindex-g0DDLxX2.js, rotas/novoentry/anterioresCR5aA1Nt eBjB3jE2B HTTP200 após estabilização sem rebuild; label de estado explícito no bundle conferido. Rollback59958fe disponível. Worker49cbf2c saudável0reinícios, Parser8682af7/gatewayd061cea preservados. Metadados/documentação posteriores não requerem redeploy.
