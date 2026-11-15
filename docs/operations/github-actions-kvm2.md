# Prisma CI KVM2 — preparação 1.0, NÃO operacional

Contrato: [acordo 1.1](../qa/agreement-prisma-kvm2-ci.md). Evidências e limites: [AoT](../qa/aot-prisma-kvm2-ci.md).

## Estado comprovado

Baseline Prisma b052be8751e66d495c160959839e4cb133ea5ae4; referência Horus origin/main 5c288b0c152d813cd32710372c07ce2e0df3f102 e PRs [38](https://github.com/brunoharita/hrt-horus/pull/38)/[39](https://github.com/brunoharita/hrt-horus/pull/39), consultados em 14/11/2026 no horário do cliente. Scripts e workflows remotos foram lidos. A cópia local Horus anterior era anterior aos dois PRs; ela não foi alterada.

O acesso SSH direto a 72.60.241.90:22 retornou Connection refused neste ambiente, inclusive na execução externa disponível. VPN do ambiente desativada. Na preparação inicial, o agente não conseguiu autenticar, ler a conta prisma-ci ou alterar o host; a chave ED25519 não pôde ser obtida/validada. Nenhum secret foi impresso ou incluído na entrega. Não se pode presumir que a preparação prisma-ci esteja concluída nem que o isolamento atual seja suficiente.

Não criar `PRISMA_KVM2_CI_READY=true`. O código preparado é inerte por padrão, e não comprova criação de runner, coordenação ou aplicação de limites. Não foi escrito instalador baseado em estado de host presumido.

## Diagnóstico e preparação pelo operador — 15/11/2026

Fonte: saídas coladas pelo operador neste chat, não observação SSH direta do agente. A chave pública ED25519 fornecida pelo operador corresponde à impressão autorizada. Host srv1038882,2CPUs,7,8GiB RAM e swap ausente.

- `prisma-ci` UID/GID1000, home0750 e sem grupos adicionais. A slice user-1000 estava inativa/sem limites; não havia runtime user, lingering ou unidades prisma-ci-* nas consultas fornecidas.
- Colisão confirmada: processos produtivos de prisma-profile-synthesis, prisma-knowledge-model, prisma-parser-ia, prisma-paddle-gateway e hrt-mail-forwarder usam UID/GID1000 no host. Os cgroups apontam scopes do Docker produtivo e uid_map é identidade, sem remapeamento. O nome prisma-ci exibido por ps resulta da resolução numérica, não de ownership de CI. Não reutilizar essa identidade para executar jobs; não alterar UID, sinalizar esses processos ou fazer chown dos arquivos produtivos.
- Após verificar que UID/GID2001, nome e home estavam livres, o operador criou `prisma-ci-runner`, UID/GID2001, apenas grupo próprio, senha bloqueada (status L), home `/home/prisma-ci-runner`0750. Subuids/subgids231072:65536, intervalo231072–296607, não sobreposto a prisma-ci100000–165535 ou horus-ci165536–231071. A criação desta conta é a única alteração host reportada neste delta; não demonstra instalação de runner/Docker ou isolamento completo.
- Horus: user-1001.slice ativa com CPUQuotaPerSecUSec1.800000s, MemoryHigh/Max4294967296 e MemorySwapMax0. Runner e daemon ativos/enabled nessa slice; Restart always e on-failure, respectivamente. ci.slice foi reportada loaded, sem ControlGroup e com limites infinity. Não há evidência de teto conjunto aplicado.
- O ExecStart informado do serviço de rede Horus carrega `/etc/nftables.d/horus-ci-guard.nft` somente se a tabela inet horus_ci_guard não existir. A mera existência da tabela não comprova correspondência ao arquivo ou eficácia; arquivo/regras efetivas e restante das unidades ainda não foram recebidos.

Nova verificação direta do agente: SSH root@72.60.241.90:22 retornou Connection refused. Status atual do ambiente Cloud: chave KVM2_SSH_PRIVATE_KEY ready; rede restricted/enforced, sem grants personalizados para a VPS e sem ferramenta request_changes disponível nesta sessão. O alias prisma-vps não está configurado no executor. Há autorização administrativa, mas não há rota SSH utilizável. Disponibilizar conectividade TCP22 autorizada no ambiente antes de retomar ações diretas; não solicitar nova chave no chat nem contornar a política.

A escolha da nova identidade cumpre o pedido original de reutilizar prisma-ci somente quando adequada. Não muda escopo, orçamento ou autorização de produção. Nenhum serviço CI Prisma iniciado, nenhum serviço Horus/produção reiniciado e nenhuma configuração de coordenação ativada pelo agente.

## Política preparada

`Prisma foundation CI / validate` começa em ubuntu-latest. Tentativa 2 só seleciona label exclusiva `prisma-kvm2-ci` quando o gate de prontidão for habilitado após todas as provas abaixo e a origem for main/PR interno para main. Demais tentativas, refs e forks permanecem hosted. O verificador recusa terceira tentativa, revisões obsoletas e falhas sem prova exata.

O observador da main usa exclusivamente `.ci-controller`, token com actions:write somente para solicitar repetição e nenhum acesso a código PR/dependências. O job validate usa `.ci-verifier` da main para prova novamente antes de checkout do teste ou instalação. São três repositórios Git independentes. O checkout completo `ci-checkout` tem cwd, lockfile e cache pnpm explícitos; relatórios em `ci-checkout/tmp/ci-reports`, identificados por SHA/run/attempt. Falhas de validação/audit/upload continuam bloqueantes. O controller não publica checks aprovados nem deploy.

Política reutilizada do Horus: somente mensagem oficial exata de billing, app github-actions, todos os jobs iniciais sem etapas/runner, failure ou skipped, enumeração completa e pelo menos validate bloqueado. API indisponível, storage, dependências, timeout, testes, anotações ambíguas e eventos/revisões não autorizados falham fechados. Antes do POST, fonte/estado são relidos. Não há aumento de orçamento nem loop.

A suíte foundation existente usa Node 22, pnpm 11.19.0 e dependências do lockfile. A descoberta de `scripts/run-tests.mjs` já inclui os novos testes tooling. O CI atual não inicia PostgreSQL nativo nem imagem Playwright do Horus; scripts locais avulsos de banco não autorizam instalar ferramentas ou acessar um banco remoto. Não portar PostgreSQL/Python/Chromium por analogia. `/usr/bin/node` >=22 confiável no host é pré-requisito do verificador sem instalação. Deploy e QA permanecem nos publicadores canônicos.

## Diagnóstico mínimo para o operador

No checkout desta branch no computador do operador, com o alias administrativo já configurado:

```bash
# Primeiro conferir a identidade, antes de enviar qualquer script ou autenticar.
ssh-keyscan -T 10 -t ed25519 72.60.241.90 > kvm2-ci-hostkey.tmp
ssh-keygen -lf kvm2-ci-hostkey.tmp
fingerprint=$(ssh-keygen -lf kvm2-ci-hostkey.tmp | awk '{print $2}')
test "$fingerprint" = 'SHA256:Nq8TDkGbnNPlz3Nl0KSdm0ZvMl7usvYSET36LXMYaik' || exit 1
# Identidade ED25519 obrigatória:
# SHA256:Nq8TDkGbnNPlz3Nl0KSdm0ZvMl7usvYSET36LXMYaik
# Arquivo é chave pública; mantê-lo para verificação estrita da sessão.
ssh -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$PWD/kvm2-ci-hostkey.tmp" root@72.60.241.90 \
  'bash -s' < scripts/ci/diagnose-kvm2.sh > kvm2-ci-diagnosis.txt
```

O script é somente leitura: capacidade, contas/grupos/subids, permissões de caminhos conhecidos, propriedades selecionadas dos serviços/slices e nomes de tabelas nft. Não lê `.credentials`, `.env`, chaves, tokens, logs de produção ou conteúdo das unidades. O arquivo local de chave pública pode ser removido após a sessão. O diagnóstico é a primeira etapa; não é teste de isolamento nem autorização de ativação.

## Coordenação e teto conjunto — bloqueador antes de configurar/ativar

Inspecionar primeiro as unidades root-managed e a preparação existente. A identidade prisma-ci UID1000 foi reprovada por colisão produtiva; usar prisma-ci-runner UID2001 para o novo CI e preservar a conta antiga. Reutilizar somente o que passar na auditoria. A coordenação deve envolver ambos os projetos, cobrir o ciclo inteiro do job (incluindo criação de containers e cleanup), manter somente um job pesado e fazer o outro esperar, sem credenciais ou acesso a dados cruzados. Hooks/locks cooperativos em scripts do repo não bastam para comprovar isso: containers são criados antes dos steps e podem sobreviver a cancelamentos.

Usar mecanismos nativos do host quando compatíveis com os controles existentes: uma slice ancestral root-managed com CPUQuota=180%, MemoryHigh=4G, MemoryMax=4G, MemorySwapMax=0 para TODOS os runners/daemons/containers de CI; filhos exclusivos limitados aos mesmos máximos individuais. Isso não unifica contas, runners, sockets ou credenciais. Não basta limitar duas user slices separadas. Incluir serviços user auxiliares se existirem e impedir escape para cgroup sem teto; rootless Docker deve usar delegação corretamente. O filtro de acesso e o árbitro de exclusão precisam ser controlados pelo administrador, inacessíveis aos dois UIDs, com recuperação comprovada após falha/cancelamento e limpeza antes da próxima concessão. A escolha/configuração final depende do diagnóstico real, inclusive do modo usado no Horus.

Se exigir mudança no CI Horus, preparar em branch/PR do repositório Horus, pelo seu fluxo, com identidade explicitamente apropriada; nenhuma alteração Horus foi feita nem administrada com a credencial Prisma. Não habilitar Prisma como forma de testar concorrência irrestrita. Não ampliar recursos/alterar produção/reiniciar VPS ou Docker produtivo.

## Provas necessárias antes de readiness

1. Contas/grupos/subuids/subgids exclusivos sem sudo/docker produtivo; arquivos/credenciais e `/opt`, `/srv`, `/mnt`, `/media`, homes alheias, sockets/bus/runtime e processos protegidos, inclusive mounts alternativos via próprio rootless Docker. Registro do runner sem secrets de deploy e escopo exclusivo ao repo. Root-managed sandbox efetiva, não apenas arquivo planejado.
2. Rede: tentativas negativas no runner E nos containers para host/serviços produtivos, redes privadas, metadata, IPv4/IPv6/loopbacks equivalentes. Positivos para GitHub/registries/DNS e somente banco descartável próprio se necessário. Rootless sozinho não comprova rede isolada.
3. `systemctl show` e leitura da hierarquia real em `/sys/fs/cgroup` para CPU/memória/swap dos pais/filhos; confirmar ambos daemons e containers sob ancestral conjunto e workload até 1,8CPU/3GiB dentro do teto 1,8CPU/4GiB. Teto não significa RAM reservada ou ausência de pressão na VPS.
4. Disputa simultânea com jobs sintéticos de dois UIDs: um executa, outro espera; registrar timestamps e cgroups. Repetir sucesso/falha/cancelamento/morte do worker/daemon e reinício do árbitro; conferir ausência de órfãos e liberação só após cleanup. Ensaio isolado local não substitui isso.
5. Boot enabled, Restart/RestartSec/KillMode/dependências e recuperação realmente aplicados; validar sem reboot e sem restart produtivo. Conferir que jobs não podem alterar os controles, teto de disco/cache/workspace e rollback das unidades alteradas.
6. Checks/regras de branch remotos preservados. Só então configurar prontidão, integrar por PR validado e observar ciclo real pós-merge hosted bloqueado → observador main → tentativa 2 VPS → validate e artifacts concluídos. Se hosted funcionar, preservar sucesso e registrar contingência ainda não exercitada; nunca simular falha oficial ou reexecutar código obsoleto para fabricar prova.

## Rollback

Runner/coordenação continuam desativados. A conta prisma-ci-runner foi criada pelo operador e deve permanecer sem serviços/credenciais enquanto o rollout estiver bloqueado; não remover a conta ou seus arquivos automaticamente. A conta antiga prisma-ci e seus processos homônimos numéricos produtivos devem permanecer intocados. Para remover o código, reverter o commit/PR mantendo hosted e o check validate. Após eventual ativação: desabilitar observador/remover readiness, revisar/cancelar apenas runs afetados, aguardar parada e cleanup do job ativo e parar somente unidades Prisma de CI. Restaurar unidades/coordenação Horus conforme seu próprio PR e evidência, preservando teto conjunto até nenhum job Prisma existir. Não apagar workspaces/evidências, não alterar Docker produtivo nem aplicações. Jobs já enfileirados exigem tratamento explícito; remover variável não os cancela.
