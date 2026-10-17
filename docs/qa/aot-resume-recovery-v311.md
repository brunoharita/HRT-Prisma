# AoT — retomada de importação 3.1.1

Contrato: `agreement-resume-recovery-v311.md` 1.0.0; execução `execution-resume-recovery-v311.md` 1.0.0. Baseline 42dd34c/main, runtime3.1.0/61f91bd.

## Matriz de acordos

| ID | Implementação / evidência | Status |
| --- | --- | --- |
| D-01 | ResumeImportConsumption consulta a previsão real pelo hook existente; mostra custo/saldo e atualização. Browser55 checks em1448/390/320. | PASS |
| D-02 | Ambos botões bloqueados sem previsão vigente/saldo; confirm() revalida no clique e passa a versão exibida até tokenQuoteId. Lock imediato contra duplicidade, refresh após tentativa. Browser e teste real Parser/quotes com negativos. | PASS |
| D-03 | Guardas de tenant/Pessoa/intake/caminho/SHA e persistExtraction/complete existentes preservadas. Teste real com PDF/transporte sintéticos e validação de rascunho/evidências. | PASS |
| D-04 | investigation.json: tentativa histórica12/09, diagnóstico genérico, mesmo PDF em documento posterior aprovado. Histórico e código atual confirmam correções anteriores de listas/LinkedIn, sem atribuir causa exata ausente. | PASS |
| D-05 | Checks finais, CI, publicação e sincronização em andamento. | NOT TESTED |

## Proibições

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Sem alteração de cobrança, grants/RLS ou backend; negativos de quote/fonte/versão e falhas de persistência. | PASS |
| P-02 | Nenhuma mutação produtiva, dados reais ou segredos em fixtures/evidências; teste local persiste/conclui sem publicar. | PASS |

## Mapa de impacto e preservação final

Mapa inicial integral no acordo. Sem novas dependências. Retomada de documento direct; Parser cliente/intake direct; quote/importação comum plausible_indirect; tenant/Perfil/publicação humana critical_transversal; matching/Auth/planos/Knowledge no_impact_identified por ausência de writer/contrato/cálculo compartilhado modificado.

Novidade: previsão exibida, validade/saldo, atualização e operação vinculada à versão confirmada. Preservação: fonte/escopo, contrato/evidências e erros sanitizados. Assinatura opcional mantém os chamadores antigos, cobertos no teste de retomada legado. Fonte/stored PDF e documento aprovado conferidos por leitura; hash final a conferir.

Validação mínima:51 testes Node dirigidos Parser/evidências/erros/transporte/quotes;55 checks browser1448/390/320, tipos/build web, contexto, diff e CI. Nenhum teste integral local ou escrita real de Pessoa necessária. Não existe QA remoto separado usado neste movimento; fronteiras verificadas com mocks locais e dados sintéticos, sem consumo de IA real.

## Fidelidade visual

Screenshot do relato é evidência de defeito. Composição cabeçalho, situação/próximos passos e histórico preservada; previsão/atualização adicionadas em Próximos passos. Capturas `browser/ready-1448.png`, `ready-390.png`, `ready-320.png`; celular sem overflow. Não há mockup normativo novo.

## Fora de escopo e desvios

F-01 preservado: sem mudança de schema/RLS/Auth/modelo/prompt/regra comercial. Nenhum desvio do acordo. A falha antiga não guarda causa específica; limite do diagnóstico explícito, não marcado como corrigido por este movimento.

## Validação final / Git / produção

Em andamento. Não declarar publicação concluída antes dos recibos e smoke.
