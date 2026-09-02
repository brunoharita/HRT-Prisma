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
- Smoke visual autenticado: aprovado com a Pessoa real Bruno Harita, Perfil v1 publicado e documento v2 aguardando revisão.

## Evidência visual autenticada

- `1920x1080`, `1600x900`, `1440x900`, `1366x768` e `390x844`: zero overflow horizontal global, controle horizontalmente fora da tela ou overlay de erro do Vite.
- A primeira execução em `390x844` revelou rolagem horizontal na navegação das perspectivas; a barra foi substituída por três opções compactas e a correção foi revalidada nas cinco resoluções.
- `Visão geral`: pendência acionável antes do Perfil vigente, conhecimento publicado e resumo derivados de dados reais.
- `Documentos e versões`: dois documentos reais, seleção responsiva, painel contextual e Perfil vigente preservado.
- `Nova importação`: entrada por PDF ou texto, processamento e extração preservados sem mutação durante o smoke.
- `Abrir revisão M5` resolveu a rota da Pessoa `6e810283-89fa-4906-a20f-b31471f7aebd`, documento `c961c3db-b752-4f51-8d54-5843c1819d4b` e revisão `0a08caa5-ed45-4226-8ea2-d0a8923cfea8`.
- Nenhum descarte, aprovação ou publicação foi acionado.
