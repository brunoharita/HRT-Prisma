# Contrato Prisma CI KVM2 — 1.1

Estado: agreed. Fonte: pedido explícito anexado por Bruno em 14/11/2026 (horário do cliente). Este registro transcreve os requisitos autorizados; não cria aprovação de produção.

Delta1.1 (15/11/2026): corrige a transcrição de D-01 para refletir a condição original autorizada “reutilizar a conta prisma-ci e sua preparação quando adequadas”. Diagnóstico e nova conta registrados, sem relaxar isolamento ou alterar os demais requisitos. A decisão original do usuário prevalece; a versão1.0 permanece no histórico Git.

## DEVE

- D-01 — Runner, usuário, label prisma-kvm2-ci, workspace, credenciais e Docker rootless exclusivos; reutilizar prisma-ci somente quando adequada. Diagnóstico do operador em15/11 comprovou colisão UID1000 com produção; conta exclusiva prisma-ci-runner UID2001 criada dentro dessa condição autorizada. Inspecionar a preparação real antes de configurar o host; preservar filesystem, rede, privilégios e processos do modelo Horus.
- D-02 — Limites individuais CPUQuota=180%, MemoryHigh/Max=4G, MemorySwapMax=0; containers até 1,8CPU/3GiB. Conjunto de CI sob teto agregado 1,8CPU/4GiB, com apenas um job pesado entre Horus e Prisma e espera do outro; liberar após sucesso, falha e cancelamento, incluindo limpeza.
- D-03 — GitHub primeiro. Uma única repetição na VPS por prova oficial de faturamento/cota da API, sem qualquer etapa inicial executada. Somente main/PR interno atual; controlador executa main confiável sem dependências/PR. Cada job de testes revalida antes de dependências, inclusive repetição isolada.
- D-04 — Controlador e testes em Git independentes, cache/lockfile/cwd/relatórios explícitos. Bancos realmente necessários são descartáveis, temporários curtos, parados antes de remover dados; preservar evidências. Instalar somente dependências exigidas pelo Prisma.
- D-05 — Serviços persistentes com recuperação efetiva verificada, sem reboot ou restart produtivo. Validar isolamento real, recursos, disputa e recuperação. Após merge, comprovar ciclo hosted bloqueado → controlador → VPS → testes/relatórios.
- D-06 — Preservar required checks, revisão/artefato/ambiente, QA → evidência → autorização específica de produção; registrar PR, SHA, limites efetivos, pendências e rollback. Sem acesso SSH, entregar comandos mínimos ao operador e manter ativação bloqueada.

## PROIBIDO

- P-01 — Reutilizar contas/sockets/credenciais/diretórios Horus; acesso a Docker, arquivos, serviços ou secrets produtivos; usar credenciais Prisma para administrar Horus.
- P-02 — Contingência para testes/código/dependência/timeout/storage/causa desconhecida, forks, revisões obsoletas, terceira tentativa, loops ou aumento de orçamento.
- P-03 — Ativar Prisma antes de coordenação conjunta comprovada; ampliar orçamento, alterar produção, mudar testes/referências ou publicar deploy neste movimento.
- P-04 — Expor chave/tokens; SSH sem validar ED25519 SHA256:Nq8TDkGbnNPlz3Nl0KSdm0ZvMl7usvYSET36LXMYaik.

## FORA DE ESCOPO / AUTONOMIA / PENDÊNCIAS

F-01: runner multiprojeto, migração de deploy, mudanças de produto/banco/produção.
A-01: adaptar implementação Horus existente, sem novas dependências, testes determinísticos e gate de prontidão fechado até prova operacional.
Q-01: root@72.60.241.90:22 informado pelo operador (alias prisma-vps), porém conexão recusada neste ambiente; diagnóstico parcial recebido do operador e nova conta criada; regras efetivas de rede/sandbox, coordenação e ensaios ainda pendentes de inspeção direta. Bloqueia configuração/ativação, não preparação de código inerte.

## CRITÉRIOS DE ACEITE

CA-D01/D02/D05: readback do host, tentativas negativas de acesso, hierarquia cgroup e métricas sob carga; disputa de dois projetos, falha/cancelamento/limpeza sem sobreposição e retorno à fila. Boot configurado e políticas efetivas conferidas, sem alegar ensaio de reboot.
CA-D03: fixtures API positivas/negativas e ciclo real pós-merge; dependências nunca precedem a prova na VPS.
CA-D04: repositórios Git independentes mesmo após checkout parcial, lock/cache/cwd explícitos; evidências preservadas. Sem adicionar PostgreSQL por analogia ao Horus.
CA-D06: diff/publicadores/checks preservados, evidências reais separadas das provas locais; pendência não recebe PASS.

## Mapa inicial de impacto e preservação

| Área | Relação | Baseline | Prova prevista |
| --- | --- | --- | --- |
| Prisma CI / política de cota | direct | b052be8751e66d495c160959839e4cb133ea5ae4, validate hosted | fixtures API, workflow/actionlint, CI remoto |
| Horus CI / coordenação host | direct | origin/main 5c288b0c152d813cd32710372c07ce2e0df3f102; PR38/39 | inspeção antes de mudança; PR próprio se necessário |
| Recursos/rede/credenciais KVM2 | critical_transversal | estado não observado nesta sessão | readback e disputa/falha/cancelamento antes de habilitar |
| Publicadores / required checks | plausible_indirect | validate; scripts release-dispatcher e deploy existentes | preservar nomes/comandos; dispatcher e diff |
| Produto, persistência, UI | no_impact_identified | sem alteração de runtime, schema ou build flags | diff limitado ao CI/docs/tooling; sem deploy |

Versão operacional CI 1.0; versão do produto inalterada. A implementação parcial não satisfaz a entrega operacional completa.
