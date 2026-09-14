# Contrato de Acordos — M6.1 Pontuação de matching

Versão 1.4.0. Estado: agreed para implementação e validação local/QA. PO: Bruno, 2026-09-14. Fonte: prompt mestre M6.1, aprovação da fórmula e decisões supervenientes de classificação, evidência profissional explícita, ordenação por Prisma Score e descoberta orientada pela trajetória.

## Objetivo e decisão superveniente

Projetar numericamente o matching explicável já existente, de 0 a 100, sem usar o score para descoberta, exclusão ou decisão de contratação. A fórmula permanece `100 × pontos_obtidos / pontos_aplicáveis`, onde pontos aplicáveis são definidos pela Posição e falta de evidência credita zero.

A decisão superveniente corrige o antigo CA-008 incompatível com a fórmula: como todo ponto obtido também é coberto, o score nunca pode superar a cobertura. Cobertura abaixo de 60% torna o score provisório; score alto ainda pode ser provisório por requisito `unclassified` ou dependência material.

A decisão superveniente de classificação limita `unclassified` a rascunhos assistidos e versões históricas. Inclusão manual apresentada como obrigatória deve gravar `required`; uma nova versão da Posição não pode ser salva com requisito pendente.

A decisão de 2026-09-14 substitui a barreira por grupo: se o requisito `SAP` aparece explicitamente em qualquer conteúdo profissional publicado, a conexão deve ocorrer mesmo que Vaga e Perfil tenham classificado o termo em grupos distintos. Os grupos permanecem para organização e proveniência. Senioridade, proficiência e duração continuam separadas e não podem ser inventadas.

A decisão superveniente 1.4.0 separa a conexão factual da elegibilidade competitiva. A trajetória profissional determina primeiro os Grupos A, B e C; somente A e B recebem Prisma Score comparável. Termo ou ferramenta isolada permanece recuperável no Grupo C, sem competir no ranking principal. Posições explicitamente de entrada podem usar formação, projetos ou conhecimentos como potencial para o Grupo B.

Esta decisão substitui D-003, D-016 e D-023 somente na composição/apresentação dos grupos, P-013 somente quanto à separação semântica do Grupo C e CA-028 somente quanto à descoberta/agrupamento. Fórmula, pesos, ausência de decisão automática, autoridade humana, RLS, schema e Perfil publicado permanecem preservados.

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
- D-015: `unclassified` não bloqueia descoberta, não entra nos pesos e impede score definitivo; o valor calculável permanece provisório e participa da ordenação conforme D-016.
- D-016: ordenação respeita primeiro o grupo de descoberta e, dentro dele, usa Prisma Score decrescente, inclusive quando provisório; score indisponível fica depois dos valores numéricos e empates usam confiabilidade, decisão humana, nome e ID.
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
- D-030: a categoria do requisito e o grupo do Perfil são metadados de organização/proveniência e não bloqueiam uma evidência profissional explícita.
- D-031: requisito genérico é atendido quando o termo aparece com limite lexical e sem negação em qualquer conteúdo profissional publicado, preservando campo e trecho de origem.
- D-032: `SAP` conecta menções como `migração para SAP` e `SAP EWM`, mas não substring em outra palavra nem declaração negada.
- D-033: requisito com nível explícito permanece parcial quando somente o termo é comprovado; nível pode ser atendido por declaração explícita ou Evidência Demonstrada válida.
- D-034: equivalência Knowledge publicada pode atender independentemente do grupo, preservando termo original e proveniência.
- D-035: a trajetória profissional é avaliada antes da elegibilidade para o Prisma Score; substitui D-003 somente quanto à composição dos grupos.
- D-036: Grupo A exige experiência profissional direta na área ou função equivalente, sustentada por cargo/ocupação e histórico profissional publicado.
- D-037: Grupo B exige trajetória profissional adjacente ou transferível, sem equivalência direta; área declarada ou relação ocupacional estruturada/textual sustenta a inclusão.
- D-038: Grupo C reúne somente sinais contextuais, como requisitos, ferramentas, formação ou menções, sem trajetória profissional relacionada suficiente.
- D-039: Grupo C permanece visível por progressive disclosure, não recebe Prisma Score comparável e nunca precede A ou B.
- D-040: Posição explicitamente de entrada (`aprendiz`, `estágio/estagiário`, `trainee`, `auxiliar`, `assistente`, `júnior/junior` ou `jr`) pode promover sinais rastreáveis para o Grupo B como potencial de entrada.
- D-041: fora da exceção de entrada, requisito explícito continua conectado conforme D-030 a D-034, mas não torna elegível para score uma trajetória classificada somente como contextual.
- D-042: a explicação e o snapshot auditável registram grupo, relação de trajetória, evidências e aplicação da exceção de entrada.
- D-043: A e B são ordenados pelo Prisma Score dentro do próprio grupo; C é separado e ordenado deterministicamente sem número comparável.

## PROIBIDO

- P-001 a P-002: score não decide emprego nem descoberta.
- P-003 a P-004: não há score opaco/probabilístico, LLM, Web Search, Knowledge Agent ou provider para cálculo.
- P-005 a P-008: falta de evidência não vira ausência; atributos proibidos, condições objetivas e bônus genéricos não pontuam.
- P-009 a P-010: cálculo não altera Perfil/evidência/Knowledge nem publica equivalências.
- P-011 a P-014: `unclassified` não recebe importância inventada; provisório nunca perde seu rótulo ao ordenar; não há cutoff; decisão humana não é substituída nem altera o score.
- P-015 a P-016: não há cache sem versão/tenant nem arquitetura paralela de matching.
- P-017: o valor visual de importância nunca diverge do valor persistido.
- P-018: nenhuma nova versão salva contém requisito `unclassified`.
- P-019: categoria divergente nunca transforma evidência profissional explícita em `no_evidence`.
- P-020: substring bruta, negação ou repetição não comprovam requisito.
- P-021: o matching não infere nível, duração ou senioridade a partir da simples presença do termo.
- P-022: termo, ferramenta ou requisito isolado não promove Perfil ao Grupo A ou B em Posição acima da entrada.
- P-023: Grupo C não exibe pontos obtidos, cobertura ou número que possa ser comparado aos Grupos A e B.
- P-024: ausência de trajetória publicada não vira afirmação de incapacidade, rejeição ou decisão de contratação.
- P-025: a exceção de entrada não promove Perfil ao Grupo A sem experiência direta.
- P-026: a nova regra não usa LLM, embedding, atributo sensível, repetição textual ou nova fonte externa.
- P-027: avaliações históricas 4.0.0 não são reescritas; a verificação aceita somente snapshots 4.0.0 e 5.0.0 e rejeita versões desconhecidas.

## FORA DE ESCOPO

- F-001 a F-004: pesos por empresa/requisito, aprendizado automático e LLM.
- F-005 a F-010: previsão, cutoff, faixas definitivas, salário, geografia/logística no score ou mudança de contratação.
- F-011 a F-012: reescrita de Perfil/Knowledge e provider novo.
- F-013: remoção dos grupos, reclassificação histórica e modelagem de senioridade/proficiência por conhecimento.
- F-014: classificação semântica de verbos como uso, venda, implantação ou administração de cada ferramenta.
- F-015: promoção automática do Grupo C por IA ou aprendizado estatístico.
- F-016: produção e reescrita de avaliações, Perfis ou Posições históricas.

## AUTONOMIA

- A-001 a A-003: nomes internos, extensão derivada versionada e ausência de cache/persistência.
- A-004 a A-006: componentes Ant Design existentes, nomes técnicos equivalentes e testes/fixtures/helpers.
- A-007: preservar a fórmula e os pesos, avançar `matching-score` para 1.1.0 pela nova ordenação e manter `vacancy-matching-explainable` 4.0.0.
- A-008: refactors locais indispensáveis sem alterar regras adjacentes.
- A-009: nomes internos do terceiro grupo, helper determinístico de nível de entrada e apresentação recolhida do Grupo C.
- A-010: avançar `vacancy-matching-explainable` para 5.0.0, `matching-score` para 1.2.0 e o produto para Prisma v1.6.4.
- A-011: migration forward-only pode ampliar a lista fechada de versões aceitas pela M6.2 sem alterar RLS, grants ou autoridade.

## Critérios de aceite

- CA-001/CA-002: cálculo determinístico e soma integralmente reproduzível.
- CA-003: dimensão ausente não penaliza.
- CA-004/CA-005/CA-006: Tecnologia com menção isolada não vira Marketing; Beatriz e Gerente de Marketing permanecem no grupo principal com ajuste de função/senioridade.
- CA-007: falta de evidência credita zero, reduz cobertura e não afirma incapacidade.
- CA-008 v1.0.1: `score <= cobertura`; cobertura abaixo de 60% gera provisório. Substitui integralmente o exemplo incompatível da versão 1.0.0.
- CA-009/CA-010: scores numéricos ordenam de forma decrescente dentro do grupo, provisórios permanecem identificados, indisponíveis ficam por último e score não exclui.
- CA-011/CA-012/CA-013: verificação sem bônus, atributos proibidos fora do input e keyword stuffing sem ganho.
- CA-014/CA-015: versões/fingerprint impedem reaproveitamento obsoleto e falta total de critérios retorna indisponível.
- CA-016/CA-017: nenhuma chamada adicional de IA ou Supabase ocorre dentro da função de score.
- CA-018: lista/detalhe responsivos em desktop e 390×844, sem overflow horizontal.
- CA-019: `match_evaluations` e decisões humanas preservam significado e autoridade.
- CA-020: AoT rastreia todos os D/P aplicáveis.
- CA-021: adicionar requisito manual mostra e grava `required` sem depender de um segundo clique.
- CA-022: frontend e RPC rejeitam tentativa de salvar requisito `unclassified`, com autorização tenant-scoped preservada.
- CA-023: versões históricas continuam legíveis; a Posição `Analista de Marketing` recebe nova versão somente pela decisão explícita do Product Owner.
- CA-024: o caso reconstruído de Bruno atende `SAP` pela descrição da experiência, sem `toolsAndTechnologies` e sem depender da categoria.
- CA-025: categoria propositalmente divergente ainda encontra a mesma evidência e expõe o `fieldPath` da origem.
- CA-026: `sapatos`, `sem experiência com SAP` e `nunca utilizei SAP` não geram atendimento.
- CA-027: SAP explícito sem nível atende requisito genérico, mas fica parcial quando a Vaga exige nível avançado não comprovado.
- CA-028: fórmula, pesos, descoberta, ordenação, RLS, schema e Perfil publicado permanecem inalterados.
- CA-029: Gerente de Tecnologia com experiência direta na área fica no Grupo A.
- CA-030: trajetória adjacente ou área declarada sem equivalência direta fica no Grupo B.
- CA-031: carreira comercial que apenas menciona ou vende SAP para uma Posição de Gerente de Tecnologia fica no Grupo C, sem Prisma Score comparável.
- CA-032: a mesma evidência `SAP` permanece rastreável como conexão factual no Grupo C, sem ser apresentada como compatibilidade competitiva.
- CA-033: Assistente/Júnior de Tecnologia sem experiência, mas com SAP em formação, projeto ou conhecimento publicado, pode ficar no Grupo B; nunca no A por esse motivo isolado.
- CA-034: Perfil sem trajetória e sem sinal continua fora da descoberta automática; confirmação humana permanece preservada.
- CA-035: lista apresenta A, B e C nessa ordem; C inicia recolhido e usa linguagem de sinais, não de score.
- CA-036: snapshot de `match_evaluations` inclui a avaliação da trajetória e a versão 5.0.0.
- CA-037: `create_m62_verification_need` aceita snapshots 4.0.0 históricos e 5.0.0 atuais, rejeita versão desconhecida e mantém `anon` sem execução.
- CA-038: testes direcionados, build web, Context Pack e smoke funcional não apresentam regressão material no fluxo de Vagas.

## Pendências

Nenhuma decisão funcional pendente. Produção, faixas semânticas, alteração de pesos e modelagem futura de senioridade por conhecimento permanecem sem autorização.
