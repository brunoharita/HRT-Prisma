# Escopo do piloto

## Objetivo

Validar se uma base de currículos pode ser transformada em conhecimento profissional estruturado e consultável, com explicação, isolamento e risco controlado, sem construir um ATS completo.

## Fundação já comprovada localmente

- [x] importar um currículo textual representativo;
- [x] gerar perfil estruturado;
- [x] preservar evidências e proveniência;
- [x] persistir documento, pessoa e perfil no adaptador local;
- [x] executar busca em linguagem natural;
- [x] retornar a pessoa importada;
- [x] explicar conceitos encontrados;
- [x] avaliar uma vaga contextual;
- [x] mostrar gaps, requisitos sem evidência e incertezas;
- [x] preservar versões de extração, inferência, retrieval, matching, prompt e modelo;
- [x] executar golden tests de extração e matching;
- [x] verificar isolamento local por organização;
- [x] revisar estruturalmente RLS, índices e integridade da migration.

## Gate antes do piloto conectado

- [x] provisionar ambiente QA separado;
- [x] executar migrations e testes RLS com papéis e organizações diferentes;
- [ ] implementar storage privado e parser seguro de documentos;
- [x] implementar Auth, memberships, organização ativa e autorização de leitura no runtime web;
- [ ] definir base legal, retenção e operações de titular;
- [ ] validar 10 a 15 currículos reais autorizados ou anonimizados;
- [ ] implementar trilha de auditoria de acesso a PII;
- [ ] coletar baseline real de custo e latência do provider selecionado;
- [ ] aprovar checklist de release para qualquer promoção.

## Definition of Done do slice local

`pnpm run validate` precisa terminar com sucesso e `pnpm run demo` precisa emitir `VERTICAL_SLICE_OK`. Documentação isolada, build isolado, migration isolada ou resposta de IA isolada não encerram o fluxo.

## Risco de validação

`RISK: EXTRACTION_NOT_VALIDATED_AGAINST_REAL_CLIENT_DATA`

A amostra atual é sintética e representativa. Ela permite comprovar a mecânica do Movimento 0, mas não congela o schema de perfil nem demonstra qualidade para dados reais de cliente.
