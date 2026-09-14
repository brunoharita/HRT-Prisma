# ADR-055 — Ordenação por Prisma Score

- Status: aceito
- Data: 2026-09-14

## Contexto

A lista já exibe um Prisma Score explicável, mas a ordenação anterior aplicava o valor somente quando definitivo e depois da decisão humana. Isso fazia uma Pessoa com score provisório maior aparecer abaixo de outra com score menor por ordem alfabética, contrariando a leitura natural da lista.

## Decisão

Preservar Grupo A antes do Grupo B e ordenar as Pessoas de cada grupo pelo Prisma Score numérico decrescente. Scores provisórios participam da ordem e continuam claramente rotulados. Score indisponível fica depois dos valores numéricos. Em empate, a ordem usa estado definitivo antes de provisório, decisão humana, nome e ID.

O contrato avança para `matching-score-1.1.0`. Fórmula, pesos, cobertura, descoberta, inclusão, evidências e autoridade humana não mudam. O score continua sem excluir Pessoas, criar cutoff ou decidir contratação.

## Consequências

A ordem passa a corresponder ao número apresentado e permanece determinística e explicável. Uma decisão humana não é apagada nem transformada em pontuação; ela apenas resolve empates. Avaliações históricas conservam a versão de score registrada.
