# AoT — anos de dois ou quatro dígitos

## Acordo e execução do delta

Versão 1.0.0, aprovado por Bruno em 2026-09-27 nesta conversa: aceitar anos com dois e quatro dígitos; limite inclusivo de 2050 e revisão da regra em 2050. Complementa o acordo M8.4 v1.0.0, sem substituir suas faixas ou seleção de experiências. Baseline local `main`: `27e767a8e2bfe5c0d15af457dd15b5fea184caf2`.

- D-DATE-01: aceitar os dois comprimentos nos formatos civis existentes; expandir `00–50` para `2000–2050` e `51–99` para `1951–1999`, com regra fixa, sem pivot móvel dependente do relógio.
- D-DATE-02: preservar o texto original e explicitar a inferência do século; reutilizar o leitor compartilhado na importação, revisão, busca e score, inclusive runtime Edge gerado.
- D-DATE-03: `Jun/08 - Nov/12` deve equivaler a `Jun/2008 - Nov/2012`: 54 meses relacionados, duração 7/10 e recência 0/10 em 2026-09-27.
- P-DATE-01: não reescrever perfis/snapshots históricos, não criar dados reais para teste, não alterar pesos, faixas, grupos, requisitos ou elegibilidade das experiências.
- P-DATE-02: não aceitar datas impossíveis, não converter ausência de período em zero factual e não inventar precisão mensal em datas apenas anuais.
- F-DATE-01: mudanças em Auth/RLS, schema, IA, Knowledge, curadoria, layout e outras funções ficam fora do escopo.
- A-DATE-01: implementação e testes locais podem estender o parser existente e versionar seu método; sem biblioteca nova. ISO continua exigindo ano inicial com quatro dígitos, preservando sua sintaxe não ambígua. Nos formatos numéricos civis, mês precede ano.
- CA-DATE-01: testes de equivalência, 00/49/50/51/99, virada de século, bissexto, períodos mistos, Atual, precisão anual e entradas inválidas.
- CA-DATE-02: regressão na extração/revisão com proveniência, busca, matching e igualdade web/Edge; checks gerados, typecheck/build e smoke de release afetado.

Prompt de execução deste delta: implementar D-DATE-01 a D-DATE-03, respeitando P-DATE-01/P-DATE-02 e F-DATE-01; usar A-DATE-01, validar CA-DATE-01/CA-DATE-02 e publicar somente os destinos exigidos pelo diff. Não executar suíte integral local; o workflow CI existente não será alterado. Revisão de produto necessária em 2050 antes de mudar o pivot, nunca mudança silenciosa baseada na data atual.

## Mapa de impacto e preservação, antes da implementação

| Capacidade | Relação | Baseline e prova proporcional |
| --- | --- | --- |
| Parser civil e cálculo temporal | direct | Baseline rejeita `Jun/08 - Nov/12`; testes dos dois formatos, limites e inválidos |
| Extração nativa/IA e revisão | direct | Mesmo normalizador; testes de evidência original, inferência e idempotência |
| Busca de perfis por tempo | direct | Mesmo cálculo de dias; equivalência dos dois formatos |
| Score web e snapshot Edge | direct | Runtime gerado do mesmo domínio; equivalência e testes de snapshot |
| Grupos, requisitos e seleção semântica | plausible_indirect | Regressão matching/semântico mantém seleção anterior; apenas período muda |
| Auth, tenant e dados pessoais | critical_transversal | Sem alteração de guardas ou escrita de dados; testes negativos existentes e smoke autorizado |
| Schema, Knowledge e curadoria | no_impact_identified | Não são consumidores do parser nem destinos do diff; nenhuma migration/decisão criada |

## Evidência e fechamento

| Acordo | Implementação | Evidência | Estado |
| --- | --- | --- | --- |
| D-DATE-01 / CA-DATE-01 | `resume-dates-1.1.0`, limite inclusivo de 2050 | `resumeDates.test`: formatos mistos, 00/49/50/51/99, virada, bissexto, negativos | PASS local |
| D-DATE-02 | `century`, notas de revisão, evidência do score e versão no fingerprint | integração Parser IA/nativa, idempotência e busca; igualdade runtime gerado | PASS local |
| D-DATE-03 | Mesmo cálculo M8.4 sem alterar faixas | regressão 54 meses / 7 pontos / 0 pontos; integração semântica com score 38, cobertura 55%, provisório | PASS local |
| P-DATE-01 | Sem escrita em registros ou mudança de seleção | testes de imutabilidade, requisitos/grupos e exclusão de liderança atual | PASS local |
| P-DATE-02 | Guardas de validade e precisão mantidas | período anual incerto, futuro/Atual, invertidos e snapshot recusado | PASS local |
| CA-DATE-02 | Regressão proporcional e rollout | testes locais, CI, web/Edge e smoke autenticado abaixo | PASS |

Validação em 2026-09-27:

- `pnpm run build`, `typecheck:web`, `build:web`, `lint`, `check:matching-runtime`: PASS. Avisos preexistentes de chunks/import dinâmico no build; consulta opcional de atualização do pnpm falhou por rede, sem impedir os comandos.
- Regressão Node direcionada: `resumeDates`, `m84ScoreTemporal`, `matchingRuntime`, `matchingScore`, `semanticTrajectory`, `semanticTrajectoryReview`, `semanticTriage`, `adaptiveResumeExtraction`, `parserIa`, `reviewFieldLifecycle`, `profileProfessionalStandard` e `m5SpatialEvidence`. O teste antigo que esperava `Jan/25` bruto foi atualizado para a normalização autorizada, preservando a asserção do texto original em `fieldEvidence`. Reexecução final dos testes afetados: 64/64 PASS; demais testes das suítes dirigidas passaram na rodada anterior.
- Golden de extração/matching: 23/23 PASS.
- Deno: 23 testes de handler e cinco de snapshot PASS, incluindo rejeições de auth/tenant/fontes e snapshot com ano abreviado. O sandbox bloqueou inicialmente o binário; a execução local autorizada fora dele passou. Nenhum acesso ao provider ou banco foi necessário.
- `generate:prisma-context`, `check:prisma-context` e `git diff --check`: PASS; artefatos gerados, nunca editados à mão.
- Sem `pnpm run validate` local; CI existente permanece com seus próprios gates. Não existe QA remoto separado: fixtures locais determinísticas antes do único remoto de produção.

Decisão de versão: parser `1.1.0`; score `1.4.0` e produto `1.8.4` mantidos porque pesos, faixas, estrutura e política de elegibilidade não mudam. A versão do parser integra novos fingerprints; snapshots anteriores não são recalculados. Rollback: republicar parser/bundle Edge e imagem web do baseline, sem rollback de dados ou banco.

## Publicação e smoke (2026-09-27)

SHA funcional: `e84497e4a5a6ce05e202e7b9dcc138dca2dc4305`, integrado por fast-forward em `main` e enviado ao `origin` autorizado. CI PASS na branch (`36338755086`) e em main (`36338872598`). O plano do commit roteou 20 arquivos para documentação/contexto, web e somente Edge `matching-trajectory`; banco ficou `skip`. O comando genérico `pnpm run test` do dispatcher foi substituído localmente pela união proporcional das suítes do mapa; o CI existente executou seus gates sem alteração de workflow.

- Edge versão 5 ACTIVE, `verify_jwt=true` preservado; hash `a65990adb020b9dfd2c7993ae9e99fa8a8e4b506f736cfb4c21ce897f873f6df`. Os 13 arquivos remotos foram comparados com o release e coincidem. Comparação com baseline remoto versão 4: somente `resumeDates.js` e `matchingScore.js` gerados mudaram. POST anônimo retorna 401 `UNAUTHORIZED_NO_AUTH_HEADER`.
- VPS em `/opt/prisma`: checkout no SHA funcional e somente `prisma-web` recriado. Imagem `sha256:d14d7875901709fd5a2a73a652a1c937917ae7f5ed229707d4ae570e0ea99b16`, estado `running`, zero reinícios e HTTPS 200. O smoke imediato do script retornou 404 transitório durante a troca, fazendo o dispatcher encerrar com código 1; inspeção posterior confirmou implantação e recuperação, sem repetir build/deploy. Não apresentar a saída inicial como PASS.
- Rollback web mantido em `prisma-web:rollback-before-e84497e4a5a6`, imagem anterior `sha256:eccbb7345f96ac21ca2e170fdb35bf597a6b6a5b39a60055abe3128b2f25f3b7`. Edge anterior pode ser republicada a partir do baseline Git; sem rollback de banco.
- Smoke autenticado na organização ativa, jornada Posições → Desenvolvedor backend → Pessoas → detalhe do score: sete perfis consultados; Perfil v5 / Posição v3; grupo B, score 38/100 provisório, 38,25 pontos e cobertura 55%. Área 10/10, função 21,25/25, requisitos 0/35 e 0/10, duração 7/10 (54 meses), recência 0/10 (166 meses), referência 2026-09-27. Onze requisitos continuam sem evidência encontrada; aviso de comparação incompleta preservado.
- O detalhe exibiu `Jun/08 - Nov/12`, interpretação `01/06/2008 - 30/11/2012` e `resume-dates-1.1.0 (limite 2050)`. Evidência visual: capturas desta conversa, painel “Score Prisma” com as duas dimensões e detalhe de inferência. A aba foi deixada disponível ao operador.
- A abertura do detalhe usa o fluxo existente de `recordEvaluation`: a confirmação transitória das fontes concluiu e o painel passou a “Reduzir incerteza por requisito”. Isso comprova aceitação do snapshot/fingerprint pelo servidor. Não foi iniciada verificação, selecionado requisito, confirmada relação humana ou editado/publicado Perfil/Posição. A avaliação derivada foi registrada pelo fluxo normal, sem dado sintético ou alteração do histórico anterior. Interpretação semântica existente foi reutilizada.

Preservação: períodos explícitos, fonte original, grupos/requisitos, exclusão de gestão como programação, guardas de auth/tenant e snapshots históricos cobertos pelas provas locais/operacionais acima. Conhecimento, curadoria e banco não foram modificados. Não houve importação real para teste; essa fronteira foi validada com fixtures locais.

Arquivos não rastreados preexistentes preservados e excluídos do commit: `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu` e `tests/matchingRuntime (1).test.ts`. Desvios funcionais identificados: nenhum. Este fechamento documental não muda o SHA do runtime nem exige novo deploy. A regra de século requer revisão de produto em 2050.
