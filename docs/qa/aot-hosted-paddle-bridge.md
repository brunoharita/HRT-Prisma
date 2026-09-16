# AoT — ponte Paddle hospedada

Contrato: `docs/qa/agreement-hosted-paddle-bridge.md` 1.0.0; execução em `docs/qa/execution-hosted-paddle-bridge.md`. Data: 2026-09-16. Baseline: f1cc983, branch `codex/hosted-paddle-bridge`. Ambiente: frontend público Hostinger com backend Prisma-QA, worker CPU local provisório.

## Matriz de Acordos

| ID | Implementação | Teste / evidência | Status | Limitação |
| --- | --- | --- | --- | --- |
| D-01 | Web/backend preservados; Nginx com rotas adicionais | Login baseline observado; smoke pós-deploy pendente | PARTIAL | Home autenticada não revalidada |
| D-02 | Adapter só acrescenta cabeçalhos; domínio/roteamento/payload sem alteração | 12 testes de adapter/preflight aprovados | PASS | Não é prova de worker real |
| D-03 | SSH reverso, gateway Auth/RLS, socket Unix privado | Testes sintéticos de auth/tenant/rotas; implantação pendente | PARTIAL | Conectividade operacional ainda não provada |
| D-04 | Mesma UI/intake/draft | Importação real ainda não executada | NOT TESTED | Requer sessão autenticada no navegador |
| D-05 | Trace existente; logs somente rota/status/duração | Contrato de logs testado; qualidade e tempos reais pendentes | PARTIAL | Sem comparação semântica por UI |

## Proibições verificadas

| ID | Guardrail | Evidência | Status |
| --- | --- | --- | --- |
| P-01 | Sem novo pipeline/modelo/roteamento | Diff sem mudança de domínio | PASS |
| P-02 | Sem exposição/credencial/PII | Negativos sintéticos; prova de listeners remotos pendente | PARTIAL |
| P-03 | Sem regras de Pessoa/publicação/matching/Knowledge/Supabase | Nenhuma migration ou mutação desses owners | PASS |
| P-04 | Sem falsa conclusão/probe/GPU | Critérios E2E mantidos pendentes | PASS |

## Fora de escopo preservado

F-01: Parser IA continua DEV/loopback; infraestrutura permanente/GPU/autoscaling/migração não alterados. PASS.

## Desvios do contrato

Nenhum desvio funcional identificado no diff. Aceite incompleto não é tratado como sucesso.

## Validação final

23 testes dirigidos aprovados (12 adapter/preflight + 11 gateway), incluindo tenant, status/papel, anonimato, origem/contrato, SSRF/payload, timeout, cancelamento, concorrência e sanitização. Typecheck web, compilação TypeScript e build web aprovados. Aviso preexistente de chunk Ant Design acima de 900 kB. Imagem do gateway construída e smoke descartável confirmou execução como node, filesystem read-only, socket Unix e 401 anônimo; container de teste removido. Sem execução de `pnpm run validate`.

## Git / QA / ambiente

Itens preexistentes `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu` e `/opt/prisma/models/` preservados e fora da entrega. Container experimental remoto `paddle-vl-llama-test` observado unhealthy, sem intervenção; não é worker desta ponte. A chave SSH foi cadastrada pelo PO, conexão root confirmada. Nenhum merge de main ou operação de produção geral.

## Conclusão

PARTIAL. Transporte em preparação; importação/revisão e qualidade hospedadas ainda não comprovadas.
