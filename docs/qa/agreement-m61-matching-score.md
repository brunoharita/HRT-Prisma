# Contrato de Acordos — M6.1 Pontuação de matching

Versão 1.1.0. Estado: agreed para implementação e validação local/QA. PO: Bruno, 2026-09-13. Fonte: prompt mestre M6.1, aprovação da fórmula e decisão superveniente de que requisito salvo é obrigatório ou desejável.

## Objetivo e decisão superveniente

Projetar numericamente o matching explicável já existente, de 0 a 100, sem usar o score para descoberta, exclusão ou decisão de contratação. A fórmula permanece `100 × pontos_obtidos / pontos_aplicáveis`, onde pontos aplicáveis são definidos pela Posição e falta de evidência credita zero.

A decisão superveniente corrige o antigo CA-008 incompatível com a fórmula: como todo ponto obtido também é coberto, o score nunca pode superar a cobertura. Cobertura abaixo de 60% torna o score provisório; score alto ainda pode ser provisório por requisito `unclassified` ou dependência material.

A decisão superveniente de classificação limita `unclassified` a rascunhos assistidos e versões históricas. Inclusão manual apresentada como obrigatória deve gravar `required`; uma nova versão da Posição não pode ser salva com requisito pendente.

## DEVE

- D-001: score inteiro de 0 a 100, com precisão decimal até o arredondamento final; representa compatibilidade observada, não capacidade ou previsão.
- D-002: descoberta profissional ocorre antes e independentemente da pontuação.
- D-003: experiência publicada na área forma o grupo principal; relações estruturadas podem formar grupo secundário; palavra isolada não cria área.
- D-004: pesos nominais imutáveis: área 30, função 20, obrigatórios 35 e desejáveis 15.
- D-005: somente dimensões definidas pela Posição entram no denominador; zero pontos aplicáveis retorna indisponível.
- D-006: área vale 30 por experiência explícita, 24 por declaração sem experiência suficiente e zero por área apenas relacionada, menção isolada ou evidência insuficiente; cobertura distingue os dois últimos estados.
- D-007: função vale 20/17/12/8/0 conforme mesma função, equivalente, relacionada, contexto profissional corroborado ou nenhuma relação; senioridade explícita ajusta 0/-1/-4, limitada a 0–20.
- D-008: 35 pontos são divididos igualmente entre todos os requisitos `required`.
- D-009: 15 pontos são divididos igualmente entre todos os requisitos `desired`; categoria ausente sai do denominador.
- D-010: cada requisito credita exatamente 100%, 50%, 25% ou 0% para direto, parcial, relacionado ou sem evidência.
- D-011: zero por falta de evidência usa linguagem epistemologicamente neutra.
- D-012: Evidência Demonstrada M5.1 válida, versionada e inequivocamente vinculada fortalece apenas o requisito correspondente e nunca excede seu máximo.
- D-013: cobertura é calculada separadamente como `100 × peso aplicável avaliado com evidência suficiente / pontos aplicáveis`; zero avaliado pode estar coberto.
- D-014: cobertura abaixo de 60%, `unclassified` ou dependência material torna o score provisório.
- D-015: `unclassified` não bloqueia descoberta, não entra nos pesos e impede score definitivo e ordenação por score.
- D-016: ordenação respeita grupo de descoberta, decisão humana, score definitivo e desempate neutro; score provisório não reordena.
- D-017: localidade, regime, disponibilidade, remuneração, benefícios, viagens e condições operacionais ficam fora do score.
- D-018: total, dimensões, requisitos, pontos, evidências, origem, cobertura, motivo e versões são decomponíveis.
- D-019: resultado leva versões de Posição, Perfil, matching, score e fingerprint/versões de inputs; versão desconhecida retorna indisponível.
- D-020: cálculo é função local pura sobre o matching resolvido, sem IA, Supabase ou mutação.
- D-021: não há persistência/cache novo; qualquer memoização futura deve incluir tenant e versões/inputs.
- D-022: atributos sensíveis, pessoais irrelevantes, proxies, volume textual, lacunas e repetição de palavras não entram no cálculo.
- D-023: lista mostra score, “Compatibilidade observada”, cobertura e estado provisório com disclosure.
- D-024: não existem faixas baixa/média/alta/excelente no M6.1.
- D-025: relatório sombra reproduzível compara ordem, score, cobertura e decisão humana sem usar a decisão como feature.
- D-026: área, função e requisitos do matching 2.3.0 permanecem separados; Beatriz entra por experiência em Marketing.
- D-027: requisito incluído manualmente nasce como `required` e `importanceConfirmed`, coerente com a seleção visual padrão.
- D-028: requisito assistido pode permanecer `unclassified` somente no rascunho; frontend e RPC exigem `required` ou `desired` antes de salvar uma nova versão.
- D-029: snapshots históricos com `unclassified` permanecem legíveis e explicáveis; a correção não reescreve histórico silenciosamente.

## PROIBIDO

- P-001 a P-002: score não decide emprego nem descoberta.
- P-003 a P-004: não há score opaco/probabilístico, LLM, Web Search, Knowledge Agent ou provider para cálculo.
- P-005 a P-008: falta de evidência não vira ausência; atributos proibidos, condições objetivas e bônus genéricos não pontuam.
- P-009 a P-010: cálculo não altera Perfil/evidência/Knowledge nem publica equivalências.
- P-011 a P-014: `unclassified` não recebe importância inventada; provisório não ordena; não há cutoff; decisão humana não é substituída.
- P-015 a P-016: não há cache sem versão/tenant nem arquitetura paralela de matching.
- P-017: o valor visual de importância nunca diverge do valor persistido.
- P-018: nenhuma nova versão salva contém requisito `unclassified`.

## FORA DE ESCOPO

- F-001 a F-004: pesos por empresa/requisito, aprendizado automático e LLM.
- F-005 a F-010: previsão, cutoff, faixas definitivas, salário, geografia/logística no score ou mudança de contratação.
- F-011 a F-012: reescrita de Perfil/Knowledge e provider novo.

## AUTONOMIA

- A-001 a A-003: nomes internos, extensão derivada versionada e ausência de cache/persistência.
- A-004 a A-006: componentes Ant Design existentes, nomes técnicos equivalentes e testes/fixtures/helpers.
- A-007: versionar `vacancy-matching-explainable-3.0.0` e `matching-score-1.0.0` conforme política vigente.
- A-008: refactors locais indispensáveis sem alterar regras adjacentes.

## Critérios de aceite

- CA-001/CA-002: cálculo determinístico e soma integralmente reproduzível.
- CA-003: dimensão ausente não penaliza.
- CA-004/CA-005/CA-006: Tecnologia com menção isolada não vira Marketing; Beatriz e Gerente de Marketing permanecem no grupo principal com ajuste de função/senioridade.
- CA-007: falta de evidência credita zero, reduz cobertura e não afirma incapacidade.
- CA-008 v1.0.1: `score <= cobertura`; cobertura abaixo de 60% gera provisório. Substitui integralmente o exemplo incompatível da versão 1.0.0.
- CA-009/CA-010: provisório não ordena e score não exclui.
- CA-011/CA-012/CA-013: verificação sem bônus, atributos proibidos fora do input e keyword stuffing sem ganho.
- CA-014/CA-015: versões/fingerprint impedem reaproveitamento obsoleto e falta total de critérios retorna indisponível.
- CA-016/CA-017: nenhuma chamada adicional de IA ou Supabase ocorre dentro da função de score.
- CA-018: lista/detalhe responsivos em desktop e 390×844, sem overflow horizontal.
- CA-019: `match_evaluations` e decisões humanas preservam significado e autoridade.
- CA-020: AoT rastreia todos os D/P aplicáveis.
- CA-021: adicionar requisito manual mostra e grava `required` sem depender de um segundo clique.
- CA-022: frontend e RPC rejeitam tentativa de salvar requisito `unclassified`, com autorização tenant-scoped preservada.
- CA-023: versões históricas continuam legíveis; a Posição `Analista de Marketing` recebe nova versão somente pela decisão explícita do Product Owner.

## Pendências

Nenhuma decisão funcional pendente. Produção, faixas semânticas e alteração de pesos permanecem sem autorização.
