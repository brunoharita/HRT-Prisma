# Backup operacional do Prisma em produção

Estado em 2026-09-20: **primeiro backup concluído e banco restaurado em contêiner isolado; reconstrução pelo Storage API ainda pendente**. Projeto: `ioldpnqqvobprjiontre`. A cópia válida está em `C:\Users\Bruno\Documents\Prisma-Backups\prisma-2026-09-20T15-16-28-483Z`. A limpeza M8.1 ainda exige preflight e revalidação imediatamente antes da exclusão.

## O que a rotina produz

`scripts/backup-prisma-production.mjs` executa um `pg_dump` custom do banco inteiro e copia cada objeto de todos os buckets pelo Storage API. A pasta final contém `database.dump`, `storage/*.bin` e `manifest.json` com projeto, horários, caminhos originais, tamanhos e SHA-256. Nomes de objetos só aparecem no manifesto privado; o terminal mostra contagens e tamanhos agregados. O script exige dados de `public`, `auth` e `storage` no índice do archive, percorre o dump inteiro com `pg_restore` sem gravar o SQL extraído, recalcula hashes e compara inventários de `storage.objects` antes e depois da cópia. Se houver mudança ou falha, deixa a pasta `.incomplete-*` identificada e retorna erro. Ela não é um backup válido.

O dump usa `pg_dump` direto porque o [dump padrão da Supabase CLI exclui os schemas gerenciados `auth` e `storage`](https://supabase.com/docs/reference/cli/su#supabase-db-dump). O backup bruto preserva esses schemas e os dados da aplicação; sua restauração precisa ser planejada em ambiente Supabase compatível e testada antes de qualquer exclusão. [Backups de banco não contêm bytes dos arquivos Storage](https://supabase.com/docs/guides/platform/backups), por isso a cópia separada é obrigatória. Configuração hospedada, chaves de API, Edge Functions e papéis globais não são recriados por este dump; código e migrations seguem no Git e a configuração hospedada exige recuperação própria.

## Preparação pelo operador

1. Escolher uma pasta **privada, fora do repositório e fora de `%TEMP%`**, preferencialmente em volume criptografado e com cópia externa protegida. A rotina não cria nem publica um novo destino. Verificar espaço livre para banco e Storage. Não versionar nem sincronizar em uma pasta pública.
2. Preferir a CLI Supabase já autenticada: `supabase db dump --linked --dry-run` cria um acesso temporário `cli_login_postgres`. Usar o host `db.ioldpnqqvobprjiontre.supabase.co`, `PGDATABASE=postgres` e o `PGPASSWORD` temporário somente no processo; a rotina aplica `SET ROLE postgres` para ler os schemas gerenciados. Como alternativa, usar conexão PostgreSQL direta ou session pooler na porta 5432 com senha permanente. O PostgreSQL 17 (`psql`, `pg_dump`, `pg_restore`) já está instalado nesta máquina; para outro local, definir `PRISMA_BACKUP_PG_BIN`.
3. Obter uma credencial **server-side** autorizada para listar e baixar todos os buckets privados. `PRISMA_BACKUP_STORAGE_KEY` é uma chave sensível de Storage/Supabase; nunca usar `VITE_*`, inserir no Git, no histórico do shell, em argumentos da linha de comando ou no chat. A chave deve permanecer somente no ambiente do processo durante a execução.

Execução interativa com a CLI já autenticada e chave Secret copiada pelo operador. O wrapper captura o acesso PostgreSQL temporário sem imprimi-lo, valida o projeto vinculado e limpa a área de transferência e as variáveis sensíveis:

```powershell
pwsh -NoProfile -File scripts/run-prisma-backup-interactive.ps1 -Destination 'C:\Users\Bruno\Documents\Prisma-Backups' -UseSupabaseCli -StorageKeyFromClipboard
```

Se a senha PostgreSQL permanente estiver disponível, omitir `-UseSupabaseCli`; o wrapper pedirá a senha em prompt oculto. Se a chave Storage também for digitada no prompt oculto, omitir `-StorageKeyFromClipboard`. A opção de clipboard aceita somente formatos Secret ou `service_role` e limpa seu conteúdo mesmo quando falha. Não use a opção se a área de transferência contiver outro dado.

Na primeira execução de 2026-09-20, a senha permanente não foi necessária: a CLI autenticada forneceu o acesso temporário do PostgreSQL e a chave Secret foi lida uma vez da área de transferência para a cópia do Storage. O processo limpou a variável de ambiente e a área de transferência ao terminar. Resultado: 15 objetos, 2.118.277 bytes de Storage e dump customizado de 28.619.375 bytes; a verificação de hashes e leitura do archive passou.

Se a conexão for pelo session pooler, informar `-DatabaseHost` com o host fornecido pelo Dashboard e `-DatabaseUser 'postgres.ioldpnqqvobprjiontre'`. Para execução não interativa, o script Node aceita `PGPASSWORD` ou `PGPASSFILE` e `PRISMA_BACKUP_STORAGE_KEY` no ambiente privado do processo; a gestão dessas credenciais para agendamento ainda precisa ser definida. A pasta de destino precisa existir; o script recusa destino dentro do repositório ou temporário. Em caso de erro, tratar a pasta `.incomplete-*` como dado pessoal sem verificação concluída.

## Verificação e restauração

Executar `node scripts/backup-prisma-production.mjs verify 'D:\DestinoPrivado\Prisma\prisma-<data>'` para repetir hashes, tamanhos e leitura do archive. O manifesto registra o estado no instante do backup; sua marca `isolated-restore-pending` não é atualizada retroativamente. Em 2026-09-20, o `database.dump` foi restaurado com `pg_restore --exit-on-error` em PostgreSQL Supabase 17.6.1.155, sem porta exposta nem volume persistente. O contêiner precisou de `cron.database_name` apontado ao banco de teste, dos papéis locais sem login `supabase_realtime_admin` e `supabase_functions_admin`, e de `postgres` superusuário local para o gatilho de DDL do dump. A restauração terminou sem erro: `auth.users` 7, `people` 10, `resume_intakes` 15, `storage.buckets` 1 e `storage.objects` 15. Os 15 caminhos/tamanhos e os fingerprints de objetos e buckets coincidiram com o manifesto; os hashes dos bytes copiados passaram. Ainda falta reconstruir os objetos pelo Storage API em um serviço de teste e fazer seu smoke de leitura. Nunca testar restauração sobre produção.

O `pg_dump` fornece snapshot consistente do banco, mas a cópia de arquivos ocorre depois. Suspender novas importações durante o corte da limpeza ou revalidar fingerprints imediatamente antes de excluir; nenhum backup manual substitui recuperação ponto a ponto. Para operação recorrente, agendar apenas após o primeiro backup e teste de restauração, com armazenamento seguro das credenciais no mesmo usuário que executará a tarefa e alerta para falhas. Ainda não há tarefa agendada, política de retenção nem cópia externa configuradas; essas decisões dependem do destino e da autenticação do operador.
