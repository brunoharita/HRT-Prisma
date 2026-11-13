# GitHub Actions na KVM2 — acordo, execução e evidência 1.0.0

## Acordo e execução

Autorização: Bruno solicitou em 13/11/2026 as alterações necessárias à migração, preservando os checkpoints de aprovação do pedido inicial. A implementação prepara uma ativação reversível; instalação e ativação dependem da validação operacional abaixo.

- D-01: preparar os dois workflows existentes para runner Linux/X64 com label `prisma-kvm2-ci`, exclusivamente no push de `main` do repositório original e quando `PRISMA_KVM2_CI_ENABLED` for exatamente `true`.
- D-02: preservar nomes dos checks, gatilhos, versões Node/pnpm, validações e permissões mínimas. PRs, forks, branches e variável ausente/desativada usam `ubuntu-latest`.
- D-03: documentar identidade SSH, isolamento, capacidade, aprovação de ativação, smoke e rollback antes de habilitar execução na VPS de produção.
- P-01: não expor chave SSH, executar PRs na VPS, remover validações, dar acesso Docker/root ao runner ou acionar deploy por esta migração.
- F-01: aplicação, banco, serviços produtivos e migração de PRs à VPS.
- A-01: engenharia define labels, variável, testes dirigidos e documentação. Não há nova dependência de produção nem alteração de versão pública; configuração de CI 1.0.0.
- CA-01: matriz negativa do roteamento e sintaxe dos workflows verificadas; comandos existentes preservados.
- CA-02: ativação somente após identidade, isolamento e capacidade verificados, runner online e aprovação registrada. Enquanto bloqueado, não declarar migração operacional concluída.

## Mapa de impacto antes da implementação

Baseline local: `b052be8751e66d495c160959839e4cb133ea5ae4`, igual ao `origin/main` consultado; worktree limpo. Os dois jobs usam `ubuntu-latest`; foundation usa Node22/pnpm11.19.0 e mail usa Node24/pnpm11.19.0.

| Relação | Área/capacidade protegida | Evidência proporcional |
| --- | --- | --- |
| direct | Seleção de runner e execução dos dois checks existentes | Matriz de eventos/variável/repositório; sintaxe; comparação dos steps |
| critical_transversal | Limite de confiança entre código de PR e serviços produtivos | Negativos para PR/fork/branch; ativação bloqueada sem inspeção da VPS |
| plausible_indirect | Recursos de produção compartilhados com CI | Medição de CPU/RAM/disco e limites antes da ativação; ainda sem acesso |
| no_impact_identified | Produto, banco, dados e deploy | Alterações restritas a CI/documentação/teste; nenhum comando de implantação adicionado |

## Evidência e limites

- SSH: conexão TCP recusada em `72.60.241.90:22`, inclusive fora do sandbox. Sem banner nem chave pública. Impressão ED25519 esperada `SHA256:Nq8TDkGbnNPlz3Nl0KSdm0ZvMl7usvYSET36LXMYaik` ainda não conferida; chave privada não exibida nem enviada.
- Ambiente: variável SSH presente, rede restrita, VPN não configurada e grants TCP vazios; isso não identifica a origem da recusa TCP.
- GitHub CLI: credencial `GH_TOKEN` rejeitada no `gh auth status`; leitura Git de `origin/main` funciona. Não há evidência das configurações remotas de proteção, environments, runners ou variáveis.
- Fontes oficiais de referência: links no runbook. A consulta HTTP às páginas docs.github.com retornou403 neste ambiente; documentação remota não foi validada nesta execução.
- D-01/D-02/CA-01 PASS local: quatro testes Node verificaram320combinações por workflow (640no total), incluindo variável ausente/desativada, fork, PR, pull_request_target, branch/tag e dispatch; tokens read-only, timeout e checkout sem credencial persistida. Leitura YAML dos dois arquivos passou; comparação estrutural com o baseline comprovou nomes, gatilhos, jobs e todos os steps/versões/comandos originais preservados. Não foi executado actionlint; o parsing YAML e a avaliação das expressões não substituem a execução real no GitHub.
- Regressão dirigida PASS:22testes de dispatcher/contexto, lint e verificação dos contextos regenerados. `git diff --check` sem erros. A suíte integral da aplicação não foi executada localmente, pois não há alteração de produto; o gate integral existente permanece no CI remoto.
- D-03: runbook preparado; CA-02 e migração operacional BLOCKED por acesso SSH e configuração remota ainda não verificados.
- P-01: nenhuma instalação, ativação ou implantação executada. Nenhum checkpoint remoto foi alterado.
- Publicação: preparação em branch `codex/github-actions-kvm2`; main/ativação não devem ser promovidos enquanto a configuração remota da variável e o runner não forem inspecionados. CI remoto e sincronização VPS permanecem não verificados neste registro.
