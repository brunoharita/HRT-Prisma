# Acordo M8.4 — duração e recência no Prisma Score

Versão 1.0.0. Estado: agreed. Product Owner: Bruno, 2026-09-27. Execução autorizada nesta conversa. Fonte: decisões explícitas do movimento M8.4.

## DEVE

- D-01 — O Prisma Score terá seis dimensões independentes, com máximos área profissional 10, proximidade da função 25, requisitos obrigatórios 35, requisitos desejáveis 10, duração da experiência relacionada 10 e recência da experiência relacionada 10. O total máximo é 100.
- D-02 — Duração e recência somam pontos diretamente; não alteram função, requisitos ou outra dimensão. Não há multiplicador, bônus oculto, veto ou prioridade automática por recência.
- D-03 — Duração usa a escala inteira 0, 3, 5, 7, 10: menos de 12 meses; 12 a menos de 24; 24 a menos de 36; 36 a menos de 60; 60 ou mais. Períodos relacionados são unidos antes da soma, sem duplicar sobreposições.
- D-04 — Recência usa a escala inteira 10, 7, 5, 3, 0: atuação atual explicitamente documentada ou encerrada há menos de 6 meses; 6 a menos de 12; 12 a menos de 18; 18 a menos de 24; 24 ou mais.
- D-05 — A regra temporal só consome experiências já reconhecidas como relacionadas pelo matching. No piloto semântico, somente `backend_execution` e `software_execution` qualificam o período para o backend; declaração profissional, familiaridade tecnológica e liderança/gestão sem execução explícita não qualificam programação.
- D-06 — A data de referência é explícita, em calendário civil `YYYY-MM-DD`, entra no fingerprint e é reutilizada no snapshot. Períodos com mês insuficiente, inválidos, contraditórios ou sem sustentação permanecem não determinados; não recebem zero factual.
- D-07 — A decomposição mostra as duas dimensões, pontos/faixas, evidências e períodos considerados em divulgação progressiva. A interface preserva a jornada e não exige confirmação manual para cálculo seguro.
- D-08 — A regra é determinística. A IA não atribui pontos, não escolhe meses e não substitui a evidência publicada. O desempate temporal entre Pessoas fica fora deste movimento.

## PROIBIDO

- P-01 — Não transformar desconhecimento de datas em ausência de experiência, zero factual, incapacidade ou pontuação escolhida para completar 100.
- P-02 — Não somar períodos simultâneos duas vezes, não fabricar mês/dia, não assumir que toda atividade do vínculo ocorreu durante todo o período e não usar emprego atual de gestor como prova de programação atual.
- P-03 — Não alterar a política de grupos A/B/C, ordenação, decisão humana, requisitos, triagem M8.3, autoridade de contratação, Knowledge, Perfil ou Posição.

## FORA DE ESCOPO

- F-01 — Desempates por meses ou duração, aprendizado com correções humanas, curadoria ocupacional/aliases, expansão do piloto semântico, nova dimensão, mudanças de banners e alterações não necessárias à apresentação do breakdown.

## AUTONOMIA

- A-01 — Reutilizar `parseResumePeriod`, o matching existente, o motor de score e o runtime gerado da Edge. A implementação pode introduzir somente tipos/helpers locais e a migration forward-only necessária para aceitar o novo contrato.
- A-02 — Para não inventar precisão, o cálculo usa mês-calendário quando o mês está documentado; intervalo apenas anual só é pontuado quando seus limites possíveis permanecem na mesma faixa. Sobreposição é unificada por intervalos mensais.

## CRITÉRIOS DE ACEITE

- CA-01 — Testes cobrem os cinco limites da duração, os cinco limites da recência, atual explicitamente documentado, ausência/ano parcial, período inválido, sobreposição e determinismo pela data de referência.
- CA-02 — Testes demonstram seis máximos 10/25/35/10/10/10, pontos inteiros das dimensões novas, soma direta, preservação das quatro dimensões existentes e ausência de multiplicadores/desempates.
- CA-03 — Testes determinísticos demonstram que somente experiências relacionadas entram no tempo; tecnologia solta, área declarada sem experiência e gestão sem execução não fabricam duração/recência.
- CA-04 — Testes semânticos demonstram que histórico de execução continua elegível, liderança não prova programação atual, requisitos e grupos M8.3 permanecem e entradas desconhecidas ficam não determinadas.
- CA-05 — Web e bundle Edge são gerados do mesmo módulo; testes de runtime, snapshot, rejeição de versão antiga/incompatível e migration forward-only são dirigidos.
- CA-06 — Context Pack, contrato, ADR e AoT registram mapa de impacto, evidência local, release surfaces, limites e smoke real; nenhum dado real é criado ou alterado para teste.

## Mapa de impacto e preservação

| Área/capacidade | Relação | Preservação e regressão proporcional |
| --- | --- | --- |
| Motor determinístico e breakdown do Prisma Score | direct | Seis dimensões, soma, faixas, desconhecimento, fingerprint e limites temporais |
| Piloto semântico M8.3 e runtime Edge | direct | Execução histórica, exclusão de gestão como prova de programação, snapshot calculado no servidor e versões |
| Busca, comparação, ordenação e decisão humana | plausible_indirect | A/B/C, ordenação existente, desempate e decisões sem alteração |
| Perfil/publicação/parser/datas | plausible_indirect | Somente leitura de Perfil publicado; normalização, proveniência e texto original preservados |
| M6.2/verificações | plausible_indirect | Snapshot histórico continua legível; score novo é aceito apenas por contrato explícito |
| Auth/RLS/tenant/PII | critical_transversal | Nenhuma fonte nova, nenhum campo sensível no contexto semântico, guardas RPC preservadas |
| Knowledge/curadoria | no_impact_identified | Nenhuma equivalência, alias ou decisão de curadoria criada |
| Web, Edge, migration e release | direct | Plano de release roteia somente web, matching-trajectory, migration e documentação gerada |

Baseline local: `main` em `d1be125a0628d5984c9da6e18a3eba62fb7f33d7`; estado operacional será confirmado no AoT. Os arquivos não rastreados existentes são preservados e não fazem parte do movimento.
