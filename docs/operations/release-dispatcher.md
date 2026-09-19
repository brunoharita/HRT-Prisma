# Dispatcher de release do Prisma

## Objetivo

Executar somente validações e publicações exigidas pelo diff. A unidade de release é um SHA validado; documentação, banco, Edge Functions e web são destinos independentes.

## Comandos

```powershell
pnpm run release:plan -- --base=origin/main --head=HEAD
pnpm run release:validate -- --base=origin/main --head=HEAD
pnpm run release:publish -- --base=origin/main --head=HEAD --expected-sha=<SHA>
pnpm run release:verify -- --base=origin/main --head=HEAD --json
```

`publish` é dry-run sem `--execute`. Com execução, publica primeiro o branch atual; `--wait-ci` aguarda o workflow e `--promote-main` promove por fast-forward e envia exatamente o SHA informado. O comando recusa `main` como origem, SHA divergente, worktree rastreado sujo, caminho desconhecido e migration histórica modificada.

Quando o plano contém web, `--vps-host=<alias>` ou `PRISMA_VPS_SSH_HOST` aciona `deploy/release-web.sh` após a promoção. O script avança `/opt/prisma` por fast-forward, exige o mesmo SHA, preserva a imagem anterior, constrói e recria somente `prisma-web` e executa o smoke HTTP. `PRISMA_VPS_PATH` altera o caminho sem gravar host, usuário ou chave no Git. Banco e funções permanecem no conector Supabase autorizado, porque o CLI geral está bloqueado pelo ledger; o recibo os mantém pendentes até a verificação remota.

Um comprovante único pode ser gravado em caminho ignorado:

```powershell
pnpm run release:plan -- --receipt=tmp/release/plan.json
```

## Matriz

| Diff | Validação | Supabase | VPS |
| --- | --- | --- | --- |
| somente docs | Context Pack afetado | não acessar | não acessar |
| web | typecheck, build e testes afetados | não acessar | somente `prisma-web` |
| migration nova | testes/contratos de banco e negativos aplicáveis | somente o arquivo novo | apenas se houver consumidor web |
| Edge Function | testes afetados | somente a função nomeada | não acessar |
| combinação | união sem duplicar comandos | banco → funções | web por último |

## Ledger Supabase

`supabase/migration-ledger-map.json` registra o estado observado no projeto `ioldpnqqvobprjiontre`. A auditoria de 2026-09-18 encontrou 136 migrations locais, 140 remotas, 134 nomes mapeados, 73 aliases de versão, seis registros somente remotos, dois arquivos somente locais e 57 fingerprints canônicas diferentes.

Isso não prova schema incorreto, mas impede afirmar equivalência histórica. Portanto:

- não executar `supabase db push` geral;
- não executar `migration repair` automaticamente;
- não editar migration já aplicada;
- aplicar somente migration nova revisada pelo conector/fluxo autorizado;
- verificar definição, grants/RLS afetados e registro remoto;
- atualizar o mapa somente com evidência observada.

`pnpm run check:supabase-ledger` valida a integridade local do mapa. A reconciliação registrada é funcional e fail-closed; não reescreve o ledger de produção.

## Projeto do ChatGPT e prompts maiores

O projeto do ChatGPT compartilha instruções, arquivos e fontes entre seus chats, mas não acessa automaticamente a pasta local; a [documentação oficial](https://learn.chatgpt.com/pt-BR/docs/projects) recomenda um chat separado por resultado. O projeto não deve receber o repositório inteiro por movimento. Use:

1. instruções permanentes curtas do projeto, incluindo o protocolo de escopo e sugestão/custo;
2. `FONTE_GPT_PRISMA.md` como fonte compacta compartilhada, regenerada pelo repositório;
3. um chat novo para cada movimento material;
4. somente os owner docs e referências específicas necessárias à decisão;
5. saída inicial em Agreement Contract, com sugestões opcionais separadas por valor e custo;
6. Execution Prompt somente depois de todos os `Q-*` materiais estarem resolvidos.

Prompt inicial recomendado:

```text
Use FONTE_GPT_PRISMA.md como contexto-base e leia apenas as fontes específicas necessárias a este movimento. Antes de ampliar o escopo, apresente a sugestão, o valor, o custo em superfícies/tempo/validação/risco e aguarde minha decisão. Separe necessário, sugestão opcional e assunto adjacente. Produza primeiro o Agreement Contract; não gere o Execution Prompt final enquanto houver Q-* material.
```
