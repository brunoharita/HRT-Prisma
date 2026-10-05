# AoT — Recuperação controlada e release v2.0.6

Contrato `agreement-profile-synthesis-v206.md` v1.0.0 e acordo de exceções v1.0.0, lidos integralmente. Baseline main/origin/VPS64e1d54, webd3b30ec/worker49cbf2c/Parser8682af7/gatewayd061cea, zero reinícios. Autorização explícita de Bruno em 04/10/2026 para uma chamada adicional e versão2.0.6; publicação permanente AGENTS7. RiscoD/C operacional e B no registro de release.

| IDs | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-R01 | Reenfileiramento único guardado, worker normal, histórico e métricas | Prévia failed/attempt1/diagnosticnull, Perfil approved/current e hash igual; UPDATE retornou uma linha queued/attempt1; worker iniciou attempt2 e finalizou failed | PASS |
| P-R01 | Nenhum write canônico/tenant/modelo/prompt ou reset | Query limitada ao UUID, estado/código/contador, tenant/pessoa/Perfil/base; histórico1/2 preservado; resposta inválida rejeitada | PASS |
| D-R02 | Registro central sexta entrega, login/sidebar e contexto | 35 testes dirigidos (4 release +31 síntese/worker) PASS; build TypeScript/tiposweb/buildweb PASS; CI branch37256203748/main37256286892 PASS, web2.0.6 e HTTP/rollback/serviços PASS | PASS |

## Resultado operacional real

Job `4877d6e8-f550-4fd3-93db-133634916b04`, tentativa2 concluída2026-10-05T02:33:29.531758Z, duração24890ms, input5211/output2990tokens. Estado failed, RESPONSE_INVALID, diagnóstico `synthesis-diagnostic-1.0.0`, etapa contract, motivo REFERENCES_INVALID, seção competencies, item0. Identificada rejeição de referências da resposta da IA; não se afirma a subregra específica dentro dessa validação nem se reconstrói a tentativa1 sem diagnóstico. Nenhuma terceira chamada feita. Síntese real não recuperada; não aceitar resposta sem sustentação é a proteção esperada, não evidência de qualidade da IA.

Consulta operacional autorizada; nenhum texto de fonte/resposta, segredo ou prompt foi exportado na evidência. Atualizar consulta permanece leitura sem nova IA. Nenhum Perfil humano publicado. O bloqueio anterior consta no AoT de exceções e foi resolvido pela autorização explícita, sem contorno.

## Preservação e limites

Mapa/critério no acordo: release somente registro/docs/web. UI funcional de exceções, SQL, worker e contratos não mudam. Baseline anterior:31contrato/worker,256person-flow,33asserts SQL/negativos e28renders1416/390 PASS; evidência histórica não é apresentada como rerun. Sem mudança visual estrutural, não exige nova comparação de layout. Jornada autenticada real/qualidade de análise aceita NOT TESTED. Regressão dirigida e smoke dos serviços preservados serão registrados abaixo. Não executar suíte integral local para bump de identificação.

## Validação local

Build TypeScript, typecheck:web e build:web PASS; 35 testes dirigidos executados após recompilar o registro (sexta entrega), incluindo fontes inválidas, metadados/métricas, ausência de PII e zero chamada na fila vazia. Nenhuma IA real adicional nesses testes. Avisos de bundle/import dinâmico preexistentes permanecem, fora de escopo. Geração/check do Context Pack em snapshot Git exclui arquivos não rastreados alheios; lint855arquivos PASS.

## Publicação / smoke

SHA funcional `7354b46383b488fd54622572b54396b2ab5494df` integrado em main/origin/VPS, CI branch37256203748/main37256286892 PASS. Plano comprometido confirmou somente web/documentação/contextos/testes; nenhuma migração/Edge/worker/Parser. Release web recriou o container e retornou HTTP404 no smoke imediato; aguardada estabilização e verificado sem rebuild. Web `sha256:db837df753fee6fe0775ccfab2249de1e3549795e3cdcafeb19a8111b05c5f39`, running/zero reinícios, entry `/assets/index-BiucK513.js`, registro2.0.6 no bundle. HTTPS /,/login,/people,entry e chunks anterioresg0DDLxX2/CR5aA1Nt HTTP200. Rollback `prisma-web:rollback-before-7354b46383b4` conserva imagemd3b30ec. Worker49cbf2c/Parser8682af7 saudáveis e gatewayd061cea running, todos zero reinícios e mesmas imagens. Preservação operacional PASS; código funcional além do registro de versão não foi alterado.

Evidência segura `docs/qa/evidence/profile-synthesis-v206/runtime-verification.json`. Fato observado é rejeição de resposta com referências inválidas: a síntese real continua failed, não é declarada recuperada. Entrega dos requisitos de diagnóstico/proteção/identificação/release PASS; qualidade de resposta aceita não provada. Nenhum desvio do acordo. Metadados finais serão sincronizados sem reconstruir serviços.
