# GitHub Actions na KVM2 — CI 1.0.0

## Estado e escolha

Preparação reversível dos workflows `Prisma foundation CI` e `HRT mail forwarding CI`. Os nomes dos jobs/checks, gatilhos, versões e comandos existentes permanecem. A variável de repositório `PRISMA_KVM2_CI_ENABLED=true` seleciona `[self-hosted, linux, x64, prisma-kvm2-ci]` somente para push em `main` de `brunoharita/HRT-Prisma`. Todos os demais cenários usam `ubuntu-latest`. Ausência da variável mantém o comportamento hospedado; falta de runner após ativação deixa o job na fila, sem fallback automático.

Reutiliza o runner oficial do GitHub e uma variável de repositório, sem orquestrador próprio. Mover todos os eventos para um runner persistente na VPS de produção exporia serviços a código de PR; a primeira etapa limita a execução à revisão já integrada em main. Mesmo código em main executa scripts de dependências: usuário separado sozinho não é isolamento suficiente de produção. A ativação exige a revisão de isolamento abaixo. PRs/branches permanecem hospedados e podem continuar consumindo minutos. Não há promessa de custo zero.

## Checkpoint 1 — acesso e diagnóstico

Conectar a `root@72.60.241.90:22` usando `KVM2_SSH_PRIVATE_KEY` somente depois de obter a chave pública ED25519 e conferir exatamente `SHA256:Nq8TDkGbnNPlz3Nl0KSdm0ZvMl7usvYSET36LXMYaik`. Fixar a chave conferida em known_hosts temporário local e usar `StrictHostKeyChecking=yes`, `IdentitiesOnly=yes`, sem agent forwarding e sem imprimir a chave privada. Divergência interrompe o acesso; não aceitar automaticamente nem substituir uma chave divergente.

Consultar versão Linux/glibc/arquitetura, CPU, RAM, swap, disco/inodes e carga, unidades e containers ativos. Não ler arquivos `.env`, chaves, payloads nem configurações privadas. Verificar em GitHub os runners, visibilidade do repositório, proteções de main, rulesets, required checks e environments/reviewers atuais. Registrar o estado antes de qualquer alteração. A variável de ativação deve permanecer ausente ou `false` até o checkpoint3.

## Checkpoint 2 — preparação e isolamento

Após revisar as consultas e autorizar a instalação:

1. Confirmar LinuxX64 compatível; se arquitetura diferente, ajustar label/workflow antes de ativar. Reservar CPU/RAM/disco suficientes para CI sem prejudicar os serviços observados; não inferir capacidade pelo nome KVM2.
2. Instalar o runner oficial em usuário exclusivo sem sudo, sem grupos Docker/produção, sem socket Docker/Podman, chaves SSH, credenciais de deploy ou leitura dos diretórios/volumes privados. Nunca executar como root ou reutilizar `/opt/prisma` como workspace.
3. Usar sandbox/container sem privilégios e sem mounts/namespace de host ou acesso à rede privada dos serviços; definir limites de CPU/memória/processos/disco e uma única execução simultânea no host. Os dois workflows compartilham um único runner para não competir entre si. Se não for possível isolar a VPS, manter a variável desativada e discutir executor separado antes de prosseguir.
4. Registrar runner restrito ao repositório original com label `prisma-kvm2-ci`, além de `self-hosted`, `linux`, `x64`. Token de registro de curta duração somente por canal privado; não gravar em Git/logs/histórico. Habilitar serviço/reinício e atualização conforme instruções oficiais, com credenciais do runner protegidas.
5. Garantir ferramentas usuais do runner Ubuntu usadas pelos jobs: bash, Git, tar/unzip, Node suportado pelo runner/Actions, bibliotecas exigidas pelo build e acesso HTTPS ao GitHub, artefatos, registries e endpoints de auditoria. `setup-node` instalará Node22/24; `pnpm/action-setup` instalará11.19.0. Não copiar credenciais de produção para satisfazer CI.
6. Preparar workspace descartável/limpeza entre jobs e cache limitado, sem segredos persistentes. Registrar limites e imagem/configuração utilizada. Não desativar atualizações de segurança do runner.

## Checkpoint 3 — ativação, evidência e aprovação

Preservar required checks, proteção de branch e aprovações dos environments. A variável de roteamento não substitui esses gates; somente administradores autorizados podem alterá-la. Inspecionar antes qualquer valor remoto existente: o checkout não prova que a variável está ausente. Publicar esta preparação não autoriza ativar uma instalação ainda não validada.

Com identidade SSH, isolamento, recursos e runner online comprovados, registrar a aprovação de ativação e definir `PRISMA_KVM2_CI_ENABLED` para `true`. Validar primeiro um push main aprovado que afete apenas CI; para validar também o mail, o diff deve incluir seu workflow ou os caminhos de serviço/deploy já previstos. Reexecutar um run antigo usa a revisão antiga do workflow e não comprova a nova seleção.

Confirmar runner efetivo nos dois jobs, checks e comandos completos bem-sucedidos, duração/consumo de recursos, nenhuma credencial de checkout persistida e nenhuma alteração/reinício dos serviços de produção. Testar que PR e branch continuam em `ubuntu-latest`. Somente então marcar migração parcial de CI operacional concluída. Não adicionar deploy automático, remover gates ou alterar políticas de aprovação nesta mudança.

## Rollback

Definir a variável para `false` ou removê-la faz os próximos runs usarem `ubuntu-latest`, sem alteração de código. Jobs já enfileirados/em execução não mudam de destino: cancelar somente os runs afetados após revisão e iniciar nova execução aprovada usando a configuração atual. Em seguida parar/remover apenas o runner CI se necessário, preservando serviços produtivos e evidências. Não desligar a VPS nem remover volumes/cache de produção.

## Referências

- [Segurança de GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [Roteamento a runners próprios](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/using-self-hosted-runners-in-a-workflow)
- [Runner oficial](https://github.com/actions/runner)
- Acordo, impacto e evidências: `docs/qa/aot-github-actions-kvm2.md`.
