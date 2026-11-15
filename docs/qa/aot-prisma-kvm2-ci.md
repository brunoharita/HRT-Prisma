# AoT — Prisma CI KVM2, preparação 1.0

Contrato: [versão 1.0](agreement-prisma-kvm2-ci.md), derivado do pedido explícito do usuário. Risco D/E: executor persistente, identidade, rede e orçamento compartilhado. Baseline Prisma b052be8751e66d495c160959839e4cb133ea5ae4; referência Horus 5c288b0c152d813cd32710372c07ce2e0df3f102. Reutilização: verificador e testes Horus adaptados, Actions oficiais existentes e nenhuma nova dependência de produto. Decisão de arquitetura host/coordenação não implementada sem diagnóstico; eventual ADR e PR Horus pertencem à continuação deste mesmo movimento.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- |
| D-01 | Label/workspaces exclusivos preparados; não alterada conta existente | SSH direto recusado, sem autenticação; diagnóstico read-only entregue | BLOCKED | Arquivos/sockets/rede/credenciais/processos do host não inspecionados |
| D-02 | Ativação bloqueada por readiness ausente/false | Roteamento testado fechado; nenhum limite alegado como efetivo | BLOCKED | Coordenação/limites/disputa/recuperação no host pendentes; não habilitar |
| D-03 | Controlador main e verificador main antes do código testado/dependências; uma repetição | 7 testes API com múltiplos negativos e 3 testes de política/workflow PASS | PARTIAL | Ciclo real hosted → controlador → VPS pendente |
| D-04 | Três checkouts independentes, cache/lock/cwd/relatórios explícitos | Fixture Git parcial/promisor e filho completo PASS | PARTIAL | Checkout real/uploads na VPS pendentes; nenhum banco nativo adicionado |
| D-05 | Script de diagnóstico somente leitura e checklist no runbook | bash -n PASS; SSH Connection refused; nenhuma unidade criada/alterada | BLOCKED | Persistência/recovery/readback/carga não testados |
| D-06 | validate/comandos/publicadores preservados; runbook, contexto e PR preparado | Dispatcher, revisão de diff e 22 testes release/contexto PASS | PARTIAL | Integração e ciclo pós-merge não efetuados; produção intocada |

## Proibições verificadas

| ID | Guardrail / teste | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Nenhuma operação host ou Horus; escopo Git apenas Prisma | Diff e registro de conexão recusada; nenhum secret de deploy em workflow | PARTIAL — isolamento operacional não testado |
| P-02 | Rejeita erro de código/teste/dependência/timeout/storage, forks, revisões fechadas/obsoletas e tentativas extras | Fixtures API e expressão real de roteamento, 11 testes PASS | PASS local |
| P-03 | Readiness fechado; sem aumento de orçamento ou deploy | Workflow negativo readiness ausente/false; publicadores intactos | PASS local — confirmar variável remota antes de integrar |
| P-04 | Nenhuma chave/token em diff/relatórios; SSH sem autenticação após falha de conexão | Chave temporária removida, não impressa; bloco operador compara ED25519 antes de autenticar | PASS nesta sessão |

## Mapa de Impacto e Preservação

| Área | Relação | Baseline / regressão | Evidência | Status |
| --- | --- | --- | --- | --- |
| Política Prisma CI | direct | foundation hosted/validate preservados; fixtures positivas/negativas | 11 testes dirigidos, actionlint 1.7.7 com label local declarada, bash -n | PASS local; remoto pendente |
| Recursos/rede/segredos KVM2 | critical_transversal | estado não observado; nenhum serviço alterado | Conexão recusada, readiness fechado | BLOCKED |
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

PARTIAL/BLOCKED. Próxima ação concreta é executar o diagnóstico mínimo do runbook pelo operador, sem enviar chave/token ao chat. Só após inspecionar o estado real pode-se configurar a conta existente e concluir coordenação, teste de disputa/cancelamento/falha e ciclo completo. Rollback da preparação: reverter o PR; rollback operacional futuro detalhado no runbook. Nenhuma alegação de conclusão operacional.
