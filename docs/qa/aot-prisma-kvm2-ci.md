# AoT — Prisma CI KVM2, preparação 1.0

Contrato: [versão 1.1](agreement-prisma-kvm2-ci.md), derivado do pedido explícito do usuário. Risco D/E: executor persistente, identidade, rede e orçamento compartilhado. Baseline Prisma b052be8751e66d495c160959839e4cb133ea5ae4; referência Horus 5c288b0c152d813cd32710372c07ce2e0df3f102. Reutilização: verificador e testes Horus adaptados, Actions oficiais existentes e nenhuma nova dependência de produto. Decisão de arquitetura host/coordenação não implementada sem diagnóstico; eventual ADR e PR Horus pertencem à continuação deste mesmo movimento.

## Delta de evidência do operador — 15/11/2026

Diagnóstico recebido e criação da conta pelo operador descritos no [runbook](../operations/github-actions-kvm2.md#diagnóstico-e-preparação-pelo-operador--15112026). prisma-ci UID1000 colide com cinco containers produtivos sem userns remap; identidade reprovada para CI. Conta nova prisma-ci-runner UID/GID2001, senha L, home0750, subuid/subgid231072:65536, sem grupos adicionais. Não houve sinalização/alteração dos processos produtivos. D-01 passa de BLOCKED a PARTIAL: conta preparada por evidência do operador, mas runner, Docker e isolamento ainda não comprovados. A evidência não é observação remota direta do agente.

Limites individuais Horus1,8CPU/4GiB/swap0 e serviços enabled/active reportados pelo operador. ci.slice sem limites efetivos reportados; D-02 permanece BLOCKED. Regra nft/service e demais controles ainda incompletos. A nova tentativa SSH direta falhou; ambiente Cloud com chave ready e rede restricted/enforced sem grant da VPS. Não há ferramenta de mudança de rede disponível. Necessária rota autorizada para continuar diretamente.

CI hosted do SHA04ab281e59b403ce6b7f34138902dff3ec449ed5: [run43670419887](https://github.com/brunoharita/HRT-Prisma/actions/runs/43670419887), validate132678995021 PASS, incluindo foundation, ledger, audit e upload. Não prova contingência nem autoriza fabricá-la. PR5 permanece draft. Delta atual altera somente diagnóstico/docs/contexto; ensaios host e ciclo pós-merge continuam pendentes.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-01 | Label/workspaces preparados; conta antiga preservada; operador criou prisma-ci-runner UID2001 após reprovar UID1000 | Saídas do operador: identidade/grupos/home/faixas; ver delta acima | PARTIAL | Runner/Docker/sandbox e isolamento real pendentes |
| D-02 | Ativação bloqueada por readiness ausente/false | Roteamento testado fechado; nenhum limite alegado como efetivo | BLOCKED | Coordenação/limites/disputa/recuperação no host pendentes; não habilitar |
| D-03 | Controlador main e verificador main antes do código testado/dependências; uma repetição | 7 testes API com múltiplos negativos e 3 testes de política/workflow PASS | PARTIAL | Ciclo real hosted → controlador → VPS pendente |
| D-04 | Três checkouts independentes, cache/lock/cwd/relatórios explícitos | Fixture Git parcial/promisor e filho completo PASS | PARTIAL | Checkout real/uploads na VPS pendentes; nenhum banco nativo adicionado |
| D-05 | Script de diagnóstico somente leitura e checklist no runbook | bash -n PASS; SSH Connection refused; nenhuma unidade criada/alterada | BLOCKED | Persistência/recovery/readback/carga não testados |
| D-06 | validate/comandos/publicadores preservados; runbook, contexto e PR preparado | Dispatcher, revisão de diff e 22 testes release/contexto PASS | PARTIAL | Integração e ciclo pós-merge não efetuados; produção intocada |

## Proibições verificadas

| ID | Guardrail / teste | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Serviços produtivos/Horus preservados; operador criou apenas conta CI exclusiva | Saídas do operador e diff; nenhum secret de deploy em workflow | PARTIAL — isolamento operacional não testado |
| P-02 | Rejeita erro de código/teste/dependência/timeout/storage, forks, revisões fechadas/obsoletas e tentativas extras | Fixtures API e expressão real de roteamento, 11 testes PASS | PASS local |
| P-03 | Readiness fechado; sem aumento de orçamento ou deploy | Workflow negativo readiness ausente/false; publicadores intactos | PASS local — confirmar variável remota antes de integrar |
| P-04 | Nenhuma chave/token em diff/relatórios; SSH sem autenticação após falha de conexão | Chave temporária removida, não impressa; bloco operador compara ED25519 antes de autenticar | PASS nesta sessão |

## Mapa de Impacto e Preservação

| Área | Relação | Baseline / regressão | Evidência | Status |
| --- | --- | --- | --- | --- |
| Política Prisma CI | direct | foundation hosted/validate preservados; fixtures positivas/negativas | 11 testes dirigidos, actionlint 1.7.7 com label local declarada, bash -n | PASS local; remoto pendente |
| Recursos/rede/segredos KVM2 | critical_transversal | diagnóstico parcial do operador; nenhum serviço alterado | Colisão UID1000 registrada; nova conta2001; conexão direta recusada, readiness fechado | BLOCKED |
| Coordenação Horus | direct | referência remota lida, nenhum arquivo/credencial modificado | PR38/39 e workflows consultados | BLOCKED para coordenação |
| Publicadores/checks/artefatos | plausible_indirect | nome validate e comandos originais preservados, relatórios associados a SHA | 22 testes tooling/contexto; diff e dispatcher | PARTIAL — regras remotas/ciclo pendentes |
| Produto/persistência/UI | no_impact_identified | nenhum runtime/schema/flag/publicador alterado | diff limitado a CI/tooling/docs, sem implantação | PASS por escopo |

### Novidade e preservação

Nova política preparada, desativada por padrão; testes locais não equivalem a runner operacional. Mantidos GitHub primeiro, validate, comandos foundation/ledger/deploy-syntax/audit e checkpoints de publicação. Limitação inicial atualizada: usuário informou root@72.60.241.90:22, mas conexão foi recusada também pela rota externa disponível; VPN desativada. Não houve autorização nova ou mudança de escopo.

## Fora de escopo preservado

F-01: sem runner multiprojeto, deploy, mudança de produto ou de persistência. Confirmado pelo diff. Fidelidade visual: não aplicável, não há superfície visual ou referência.

## Desvios do contrato

Entrega operacional incompleta: conta existente, coordenação, recursos, isolamento, recuperação e ciclo real permanecem BLOCKED/NOT TESTED. Não são dispensados nem tratados como PASS. Código inerte preparado para revisão; nenhuma configuração especulativa do host criada.

## Validação final

- `node --test tests/tooling/ciQuotaFallback.test.mjs tests/tooling/ciWorkflow.test.mjs`: 11 PASS, incluindo fixture Git real e negativos API/routing.
- `node --test tests/tooling/releaseDispatcher.test.mjs tests/tooling/prismaContext.test.mjs`: 22 PASS.
- `actionlint` 1.7.7, binário da release oficial com checksum conferido: workflows preparados PASS com label prisma-kvm2-ci declarada em configuração temporária; shellcheck/pyflakes externos não executados.
- `bash -n scripts/ci/diagnose-kvm2.sh`, lint, foundation e contexto: resultados registrados no fechamento do PR.
- Não executada suíte integral local; alteração limitada a CI/docs/tooling. CI obrigatório continua com `pnpm validate`, sem remoção de gates.

## Git / QA / ambiente

Branch `codex/prisma-kvm2-ci`, origin existente, baseline acima; PR de preparação em draft. Revisão exata e resultados remotos ficam no PR após publicação. Sem merge, ativação, deploy ou acesso a dados. Não há QA de aplicação necessário para código inerte; ensaios de isolamento/coordenação host continuam obrigatórios antes de ativação.

## Conclusão

PARTIAL/BLOCKED. Próxima ação concreta é disponibilizar rota SSH autorizada para o ambiente e retomar a inspeção efetiva das unidades/regras. Conta nova preparada pelo operador; só após conferir o restante do estado real pode-se configurar runner/Docker, concluir coordenação, teste de disputa/cancelamento/falha e ciclo completo. Não solicitar chave/token ao chat. Rollback da preparação: reverter o PR; rollback operacional futuro detalhado no runbook. Nenhuma alegação de conclusão operacional.
