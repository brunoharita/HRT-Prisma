# AoT — retomada de importação 3.1.1

Contrato: `agreement-resume-recovery-v311.md` 1.0.0; execução `execution-resume-recovery-v311.md` 1.0.0. Baseline 42dd34c/main, runtime3.1.0/61f91bd.

## Matriz de acordos

| ID | Implementação / evidência | Status |
| --- | --- | --- |
| D-01 | ResumeImportConsumption consulta a previsão real pelo hook existente; mostra custo/saldo e atualização. Browser55 checks em1448/390/320. | PASS |
| D-02 | Ambos botões bloqueados sem previsão vigente/saldo; confirm() revalida no clique e passa a versão exibida até tokenQuoteId. Lock imediato contra duplicidade, refresh após tentativa. Browser e teste real Parser/quotes com negativos. | PASS |
| D-03 | Guardas de tenant/Pessoa/intake/caminho/SHA e persistExtraction/complete existentes preservadas. Teste real com PDF/transporte sintéticos e validação de rascunho/evidências. | PASS |
| D-04 | investigation.json: tentativa histórica12/09, diagnóstico genérico, mesmo PDF em documento posterior aprovado. Histórico e código atual confirmam correções anteriores de listas/LinkedIn, sem atribuir causa exata ausente. | PASS |
| D-05 | 3.1.1/5e210b9 publicado; CI branch39079063691/main39079140863 PASS,25smokes públicos, rollback e5serviços/configuração preservados. production.json/public-smoke.json/publication-recovery.json. Fechamento documental sincronizado sem rebuild. | PASS |

## Proibições

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Sem alteração de cobrança, grants/RLS ou backend; negativos de quote/fonte/versão e falhas de persistência. | PASS |
| P-02 | Nenhuma mutação produtiva, dados reais ou segredos em fixtures/evidências; teste local persiste/conclui sem publicar. | PASS |

## Mapa de impacto e preservação final

Mapa inicial integral no acordo. Sem novas dependências. Retomada de documento direct; Parser cliente/intake direct; quote/importação comum plausible_indirect; tenant/Perfil/publicação humana critical_transversal; matching/Auth/planos/Knowledge no_impact_identified por ausência de writer/contrato/cálculo compartilhado modificado.

Novidade: previsão exibida, validade/saldo, atualização e operação vinculada à versão confirmada. Preservação: fonte/escopo, contrato/evidências e erros sanitizados. Assinatura opcional mantém os chamadores antigos, cobertos no teste de retomada legado. Fonte/stored PDF e documento aprovado conferidos por leitura; hash conjunto antes/depois idêntico:5c5f70959584ae9f3e543f252cda4b68.

Validação mínima:59 testes Node dirigidos (51 de fluxo +8 de versão/recuperação) Parser/evidências/erros/transporte/quotes;55 checks browser1448/390/320, tipos/build web, contexto, diff e CI. Nenhum teste integral local ou escrita real de Pessoa necessária. Não existe QA remoto separado usado neste movimento; fronteiras verificadas com mocks locais e dados sintéticos, sem consumo de IA real.

| Capacidade protegida | Relação | Baseline / regressão / evidência | Status |
| --- | --- | --- | --- |
| Retomada e previsão | direct | Defeito na3.1.0;55browser,loading/erro/saldo/expiração/refresh/duplicidade | PASS |
| Parser/intake/persistência | direct | Contratos vigentes;51Node com rascunho completo/evidência/SHA/escopo,mesmosIDs e diagnóstico de falha | PASS |
| Tokens/importação comum | plausible_indirect | Assinatura opcional e default existentes; quote compartilhada e retomada antiga testadas | PASS |
| Tenant/Perfil/publicação humana | critical_transversal | Negativos de fonte/vínculo; nenhuma publicação no teste; hash produtivo dos documentos idêntico | PASS |
| Matching/Auth/planos/Knowledge | no_impact_identified | Nenhum writer/contrato/cálculo alterado; plano somente web e5serviços adjacentes intactos | PASS |

## Fidelidade visual

Screenshot do relato é evidência de defeito. Composição cabeçalho, situação/próximos passos e histórico preservada; previsão/atualização adicionadas em Próximos passos. Capturas `browser/ready-1448.png`, `ready-390.png`, `ready-320.png`; celular sem overflow. Não há mockup normativo novo.

## Fora de escopo e desvios

F-01 preservado: sem mudança de schema/RLS/Auth/modelo/prompt/regra comercial. Nenhum desvio do acordo. A falha antiga não guarda causa específica; limite do diagnóstico explícito, não marcado como corrigido por este movimento.

## Validação final / Git / produção

59Node/55browser, tipos raiz/web, build web, lint snapshot1922arquivos, contexto e diff PASS. CI inicial39078882746 identificou duas asserções antigas (versão e assinatura), corrigidas sem mudança runtime;8testes afetados PASS e CI posterior branch/main SUCCESS.

Publicado SHA5e210b90290edc985dfa61f75adb0949e52ad3e3, web2034c5b74888/imagem78ac70337c45/running/restart0. HTTP404 imediato da recriação impediu o recibo final do dispatcher; sem rebuild, checks independentes de SHA/versão/rotas/assets/health/rollback passaram.25smokes públicos, ativos anteriores preservados,5serviços não alterados e configuração idêntica. Rollback3.1.0 imagem8c6a92a79eb1 e recuperação3.0.7 preservados.

Main/origin/VPS alinhados no runtime ao publicar; fechamento documental atualiza checkouts sem reconstruir imagem. Nenhuma migration/Edge/Parser/modelo/prompt/publicação de Perfil ou escrita de dados reais. Não há prova de retomada autenticada de Pessoa real: serviço/navegador são sintéticos, smoke produtivo anônimo. A falha original histórica é investigada com limite declarado; não se afirma diagnóstico exato ausente. Rascunhos não rastreados existentes preservados.

Conclusão: todos D/P PASS dentro dos critérios e limites do acordo1.0.0.
