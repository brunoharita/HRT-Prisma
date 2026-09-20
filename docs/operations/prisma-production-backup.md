# Backup operacional do Prisma em produção

Estado em 2026-09-20: **rotina preparada; primeira execução e restauração ainda pendentes de autenticação e destino privado**. Projeto único esperado: `ioldpnqqvobprjiontre`. Este procedimento é pré-requisito para a limpeza M8.1, não uma prova de que ela já pode começar.

## O que a rotina produz

`scripts/backup-prisma-production.mjs` executa um `pg_dump` custom do banco inteiro e copia cada objeto de todos os buckets pelo Storage API. A pasta final contém `database.dump`, `storage/*.bin` e `manifest.json` com projeto, horários, caminhos originais, tamanhos e SHA-256. Nomes de objetos só aparecem no manifesto privado; o terminal mostra contagens e tamanhos agregados. O script confere o arquivo via `pg_restore --list`, recalcula hashes e compara inventários de `storage.objects` antes e depois da cópia. Se houver mudança ou falha, deixa a pasta `.incomplete-*` identificada e retorna erro. Ela não é um backup válido.

O dump usa `pg_dump` direto porque o [dump padrão da Supabase CLI exclui os schemas gerenciados `auth` e `storage`](https://supabase.com/docs/reference/cli/su#supabase-db-dump). O backup bruto preserva esses schemas e os dados da aplicação; sua restauração precisa ser planejada em ambiente Supabase compatível e testada antes de qualquer exclusão. [Backups de banco não contêm bytes dos arquivos Storage](https://supabase.com/docs/guides/platform/backups), por isso a cópia separada é obrigatória. Configuração hospedada, chaves de API, Edge Functions e papéis globais não são recriados por este dump; código e migrations seguem no Git e a configuração hospedada exige recuperação própria.

## Preparação pelo operador

1. Escolher uma pasta **privada, fora do repositório e fora de `%TEMP%`**, preferencialmente em volume criptografado e com cópia externa protegida. A rotina não cria nem publica um novo destino. Verificar espaço livre para banco e Storage. Não versionar nem sincronizar em uma pasta pública.
2. Usar conexão PostgreSQL direta ou session pooler na porta 5432. `PGHOST` ou `PGUSER` precisa identificar `ioldpnqqvobprjiontre`, e `PGDATABASE` deve ser `postgres`. O PostgreSQL 17 (`psql`, `pg_dump`, `pg_restore`) já está instalado nesta máquina; para outro local, definir `PRISMA_BACKUP_PG_BIN`.
3. Obter uma credencial **server-side** autorizada para listar e baixar todos os buckets privados. `PRISMA_BACKUP_STORAGE_KEY` é uma chave sensível de Storage/Supabase; nunca usar `VITE_*`, inserir no Git, no histórico do shell, em argumentos da linha de comando ou no chat. A chave deve permanecer somente no ambiente do processo durante a execução.

Exemplo de sessão PowerShell interativa. Substituir host, usuário e pasta pelos valores da conexão real; as senhas são digitadas em prompts ocultos:

```powershell
$env:PGHOST = 'db.ioldpnqqvobprjiontre.supabase.co'
$env:PGPORT = '5432'
$env:PGUSER = 'postgres'
$env:PGDATABASE = 'postgres'
$env:PGPASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Senha do banco' -AsSecureString)).Password
$env:PRISMA_BACKUP_STORAGE_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'Chave server-side do Storage' -AsSecureString)).Password
node scripts/backup-prisma-production.mjs backup 'D:\DestinoPrivado\Prisma'
Remove-Item Env:PGPASSWORD, Env:PRISMA_BACKUP_STORAGE_KEY -ErrorAction SilentlyContinue
```

Se a conexão for pelo session pooler, usar o host fornecido pelo Dashboard e `PGUSER=postgres.ioldpnqqvobprjiontre`. Também é possível usar `PGPASSFILE` no lugar de `PGPASSWORD`, desde que o arquivo seja privado. A pasta de destino precisa existir; o script recusa destino dentro do repositório ou temporário. Em caso de erro, remover as variáveis sensíveis da sessão e tratar a pasta `.incomplete-*` como dado pessoal não protegido por uma verificação concluída.

## Verificação e restauração

Executar `node scripts/backup-prisma-production.mjs verify 'D:\DestinoPrivado\Prisma\prisma-<data>'` para repetir hashes, tamanhos e leitura do archive. O manifesto registra `isolated-restore-pending` porque essa verificação estrutural **não prova restauração**. Antes da limpeza M8.1, restaurar uma cópia em PostgreSQL/Supabase isolado e compatível, conferir tabelas e dados necessários de `public`, `auth` e `storage`, reconstruir os arquivos no Storage de teste pelos caminhos do manifesto, e fazer smoke de leitura. Nunca testar restauração sobre produção.

O `pg_dump` fornece snapshot consistente do banco, mas a cópia de arquivos ocorre depois. Suspender novas importações durante o corte da limpeza ou revalidar fingerprints imediatamente antes de excluir; nenhum backup manual substitui recuperação ponto a ponto. Para operação recorrente, agendar apenas após o primeiro backup e teste de restauração, com armazenamento seguro das credenciais no mesmo usuário que executará a tarefa e alerta para falhas. Ainda não há tarefa agendada, política de retenção nem cópia externa configuradas; essas decisões dependem do destino e da autenticação do operador.
