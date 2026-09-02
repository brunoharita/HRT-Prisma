# Evidência de QA: Central da Pessoa 1.0

## Escopo

Validar o contrato local `person-action-center` 1.0.0 e o redesign da Central sem alterar schema, RLS, ingestão, M5, publicação Delta ou contratos de evidência.

## Cobertura determinística

`tests/personActionCenter.test.ts` cobre:

1. Perfil vigente com uma nova importação revisável;
2. múltiplas pendências reais ordenadas por prioridade operacional;
3. documento em processamento sem ação prematura;
4. documento publicado e documento descartado fora do centro de ações;
5. falha técnica sem fonte recuperável, sem CTA inventado;
6. composição de identidade, Perfil, resumo, conhecimento, documentos e atividade;
7. Pessoa sem Perfil publicado;
8. Member encaminhado para a superfície de Perfil sem autoridade operacional.

As regressões existentes continuam cobrindo preservação do Perfil, navegação M5 tenant-scoped, descarte auditável, publicação Delta e ausência de mutação no modo somente leitura.

## Smoke autenticado obrigatório

Usar uma Pessoa sintética do Prisma-QA com Perfil publicado e importação parcial revisável. Validar:

- pendência antes do Perfil vigente;
- CTA `Revisar documento agora` abrindo Pessoa, documento, tentativa e revisão corretos;
- Perfil vigente separado e preservado;
- visão `Documentos e versões` com seleção e painel contextual;
- `Nova importação` mantendo processamento, extração e detalhes técnicos;
- experiências, formação e competências sem dados ilustrativos;
- teclado, foco, textos de status e confirmação destrutiva;
- zero erro de console e zero overflow global em `1920x1080`, `1600x900`, `1440x900`, `1366x768` e `390x844`.

## Estado

- Implementação local: concluída.
- Gate `pnpm run validate`: aprovado com lint de 248 arquivos, foundation, Context Pack, dois typechecks, build web, 157 testes técnicos, 19 golden tests e `VERTICAL_SLICE_OK`.
- Backend/migration: não aplicável.
- Smoke visual autenticado: pendente de sessão ativa no navegador interno.
