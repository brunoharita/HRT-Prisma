# Execução — Publicação eficiente por impacto

Contrato: `docs/qa/agreement-release-efficiency.md` 1.0.0.

## Escopo entendido

- Implementar D-01 a D-07 com dispatcher local, testes, registro do ledger, owner docs, Context Pack e orientação para o Projeto do ChatGPT.
- Impedir P-01 a P-05 por classificação fechada, guards de SHA/branch/worktree, imutabilidade de migration e bloqueio explícito do push geral.
- Preservar F-01 a F-04: nenhum ambiente, schema, dado, segredo ou regra funcional será criado ou alterado.
- A-01/A-02 permitem Node nativo, JSON versionado e testes sintéticos.

## Ordem

1. Auditar diff, fluxo Git/CI, Supabase remoto e VPS existente.
2. Registrar a reconciliação funcional do ledger sem mutá-lo.
3. Implementar `release:plan`, `release:validate`, `release:publish` e `release:verify`.
4. Validar rotas positivas e negativas.
5. Atualizar owner docs, ADR, Current State e Context Pack.
6. Executar gate completo uma vez, revisar diff, publicar o branch, promover o mesmo SHA e verificar sincronização aplicável.

## Limite operacional do Supabase

O conector confirmou um único projeto remoto de produção. A auditoria encontrou aliases de timestamp, migrations remotas desdobradas, arquivos locais sem registro e fingerprints divergentes. Esta execução não usa `migration repair`, não reaplica SQL e não altera `supabase_migrations.schema_migrations`. Migrations futuras são publicadas individualmente pelo mecanismo autorizado e verificadas antes de atualizar o mapa.
