# AoT — Exceções isoladas da síntese v2.0.5

Contrato: `agreement-profile-synthesis-exceptions.md` v1.0.0 e acordo original v2.0.5 v1.0.0, lidos integralmente. Baseline main/origin/VPS080249e; imagemwebd59809c, worker1f233fe; riscoD/C. Autorização explícita de implementação e permanente de publicação AGENTS7. Produto2.0.5 mantido: correção do comportamento aprovado, diagnóstico1.0.0 separado do resultado/prompt1.0.0.

## Matriz de acordos

| ID | Acordo/implementação | Teste/evidência | Status/limite |
| --- | --- | --- | --- |
| D-E01 | Boundary só na síntese, resumo publicado/navegação preservados | Read/render/source failures 1416/390, `evidence/profile-synthesis-exceptions/ui-results.json` | PASS sintético |
| D-E02 | Motivos fixos/etapas/localização; tokens rejeitados; job/attempt JSONB; wrapper valida persistência | 31 contratos/worker, SQL privado/lease/diag sem PII, fixture109 fontes longas | PASS local; incidente antigo sem subcausa armazenada |
| D-E03 | Orientação específica; read/source não chamam IA; retry autenticado/espaçado<=3 sem reset | SQL auth/outsider/inativo/anon/cooldown/duplicidade/histórico/budget; UI duplo clique gera1retry | PASS local |
| D-UX-E01 | Bloco de diagnóstico com detalhes recolhidos; fallback original; layouts aprovados mantidos | 26 reports13 estadosx2 viewports, renders de erro no diretório de evidência | PASS sintético |
| D-E04 | QA/docs/contextos/release/smoke/recuperação controlada | Tipos/build/person-flow256; SQL em transação com rollback; publicação ainda pendente | PARTIAL |

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
| Parser/gateway/matching | no_impact_identified | imagens8682af7/d061cea |sem imports/contratos desses domínios no diff; checkmatchingPASS; runtime ainda a conferir | PARTIAL |
| Release/contextos | direct |080249e |deploy seletivo e smoke pendentes | PARTIAL |

Novidade: diagnóstico fechado e recuperação segura; preservação: fato publicado, controle humano, snapshots e limites. Reuso da infraestrutura existente, classificação de auth em `supabaseOperationError` sem mensagens livres; sem observabilidade genérica nova. Migração antiga não é reescrita.

## Fidelidade visual

Imagem do incidente é contraexemplo da mensagem genérica. Referências normativas1/3 originais permanecem: composição70/30 e fonte60/40, informação/proveniência/ações nos grupos anteriores; screenshot1416 `word-limit-1416.png` e390 `render-error-390.png` documentam exceção isolada e original. Comparação visual conferida, sem mudança estrutural não autorizada; dados inteiramente sintéticos. Cabeçalho/abas reais em fixture; smoke autenticado de Pessoa real ainda NOT TESTED.

## Desvios / mudanças de escopo

Nenhum desvio de produto observado. Nenhuma ampliação material; versão permanece2.0.5. A causa específica original não era armazenada; não se declara que nova tentativa reconstrói o passado. UI local apresenta identificações fixas; tentativa remota persiste diagnóstico restrito. Não publicar Perfil real para testar.

## Validação final / Git / ambiente

Em fechamento: SQL local rollback, tipos/build,31worker/contrato,256person-flow,26renders PASS. CI, migração remota, worker/web, smoke/rollback e recuperação específica pendentes. Não há QA Supabase separado verificado; PostgreSQL local descartável é usado para negativos de segurança.
