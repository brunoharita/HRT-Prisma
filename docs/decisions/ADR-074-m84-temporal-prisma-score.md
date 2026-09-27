# ADR-074 — Dimensões temporais do Prisma Score

Estado: accepted. Data: 2026-09-27. Acordo: `docs/qa/agreement-m84-prisma-score-temporal.md` v1.0.0.

## Contexto

O Score Prisma 1.2.0/1.3.0 comparava área, função e requisitos, mas não distinguia duração acumulada nem recência da experiência relacionada. O Product Owner aprovou seis dimensões independentes e exigiu que datas incompletas permanecessem desconhecidas, sem zero factual.

## Decisão

O contrato `matching-score-1.4.0` mantém grupos A/B/C, requisitos, autoridade humana e ordenação existentes e redistribui os pesos para área 10, função 25, obrigatórios 35, desejáveis 10, duração 10 e recência 10. A duração une intervalos em meses antes de somar; a recência usa a última atuação e uma data civil explícita. O cálculo é local, determinístico e inclui a data de referência e as experiências relacionadas no fingerprint.

Somente períodos de experiências já reconhecidas como relacionadas entram no cálculo. No fluxo semântico, apenas `backend_execution` e `software_execution` qualificam programação; liderança, análise, declaração e familiaridade de ferramenta não são convertidas em execução. Período parcial, inválido ou contraditório deixa as dimensões aplicáveis como não determinadas e o score indisponível.

## Alternativas consideradas

- Manter 30/20/35/15 e exibir tempo apenas como informação: rejeitada porque não produziria a dimensão aprovada nem soma máxima 100.
- Usar multiplicadores ou bônus de recência: rejeitada por ocultar a contribuição de cada dimensão e alterar a interpretação do score.
- Inferir meses por cargo, senioridade ou atividade atual: rejeitada por violar proveniência e transformar ausência de precisão em fato.
- Reescrever snapshots anteriores: rejeitada; a migration é somente de compatibilidade e aceita o novo contrato sem alterar histórico.

## Consequências

O runtime web e o runtime Edge são gerados do mesmo módulo. O snapshot continua calculado no servidor e a RPC aceita 1.3.0 e 1.4.0. A UI exibe data de referência e estado `Não determinado`; não há nova persistência de fatos, IA, curadoria, desempate ou mudança de grupos.
