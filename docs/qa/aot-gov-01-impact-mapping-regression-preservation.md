# AoT — GOV-01 — Mapa de Impacto e Preservação

Contrato de referência: `docs/qa/agreement-gov-01-impact-mapping-regression-preservation.md` versão 1.0.0. Execution Prompt: `docs/qa/execution-gov-01-impact-mapping-regression-preservation.md` versão 1.0.0.

## Baseline e mapa inicial

- Baseline: `5d1c51a53b638989a0b13aa583fe21688903e5e9`, branch `main`, working tree com `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` não relacionados preservados.
- Ambiente: checkout local Prisma; nenhum produto, banco, Supabase, VPS ou navegador foi alterado.
- Cenário: governança documental antes da implementação do GOV-01.
- Evidência: `git status --short --branch`, `git rev-parse HEAD` e inspeção dos owners/templates.

| Área / capacidade | Relação | Dependência / mecanismo | Baseline mínimo | Regressão proporcional / evidência prevista |
| --- | --- | --- | --- | --- |
| `AGENTS.md` e processo de implementação material | direct | regra normativa lida pelos agentes | SHA acima; texto existente | revisão de conteúdo e `git diff --check` |
| Templates Agreement/AoT e rastreabilidade QA | direct | owners de QA e contratos de movimento | templates existentes no baseline | inspeção estrutural e checagem de referências |
| Dispatcher, checklist e versionamento | direct | release plan, gate e catálogo documental | docs existentes; Prisma v1.8.2 | inspeção de escopo e `release:plan` |
| Context Pack gerado | direct | índice, gerador e checker | artefatos gerados do baseline | `generate:prisma-context` e `check:prisma-context` |
| Fluxos, schema, migrations, RPCs, Edge Functions, web e VPS | plausible_indirect | somente regra documental; nenhuma alteração de runtime prevista | estado do baseline; release plan sem essas superfícies | prova de não roteamento e diff de caminhos; sem deploy |
| Produto publicado e versão pública | no_impact_identified | GOV-01 é processual e não incrementa produto | Prisma v1.8.2 documentado | versionamento + release plan, após análise proporcional |

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status | Ambiente / limitação |
| --- | --- | --- | --- | --- | --- | --- |
| D-01–D-25 | Mapa, baseline, regressão, AoT, owners e Context Pack | `AGENTS.md`, templates, owners e documentos GOV-01 | checks abaixo | diff, Context Pack, release plan | PASS | local |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01–P-10 | Sem suíte integral reflexa, diff-only, escopo de produto, edição manual gerada ou documento concorrente | revisão de caminhos, plano de release e diff | nenhum arquivo de produto/runtime; gerador usado | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01–F-06 | nenhum código de produto, teste E2E global, CI/CD ou ferramenta externa alterado | PASS |

## Mapa final e preservação

O mapa final não descobriu nova dependência material. A relação dos fluxos de produto permanece `plausible_indirect`/`no_impact_identified` após o `release:plan`; não houve publicação nem acesso a Supabase/VPS. A mudança nova é a regra documental GOV-01; capacidades preservadas são os fluxos e contratos de produto existentes.

| Capacidade protegida / área | Relação | Impacto previsto | Baseline | Regressão executada | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AGENTS e governança de implementação | direct | nova exigência de mapa antes da mudança | SHA baseline | revisão de conteúdo | `AGENTS.md`, diff check | PASS |
| Agreement/AoT/QA/release | direct | templates e gates passam a exigir preservação | templates baseline | inspeção estrutural | arquivos owner e checker | PASS |
| Context Pack | direct | fontes canônicas refletem GOV-01 | artefatos baseline | geração + checker | comandos Context Pack | PASS |
| Produto, banco, integrações e deploy | plausible_indirect | risco processual sem alteração runtime | SHA baseline | release plan e revisão de caminhos | plano sem web/db/functions/VPS | PASS |
| Versão pública Prisma v1.8.2 | no_impact_identified | nenhum incremento de produto | `docs/architecture/versioning.md` | revisão do registro | versão permanece 1.8.2 | PASS |

### Novidade e preservação

- Entrega nova comprovada: protocolo documental GOV-01, templates, ADR e documentação owner.
- Capacidades preservadas comprovadas: código/runtime/produto fora do diff; Context Pack regenerado; plano de release limitado a documentação.
- Relações reclassificadas ou dependências descobertas: nenhuma.
- Limitações de baseline/evidência: não houve smoke autenticado porque não houve alteração de produto; preservação runtime é limitada à análise de caminhos e ao release plan, conforme o contrato.

## Validação executada

- `git diff --check` — PASS.
- `pnpm run generate:prisma-context` — PASS.
- `pnpm run check:prisma-context` — PASS.
- `pnpm run check:foundation` — PASS; contratos/templates normativos permanecem íntegros.
- `pnpm run test:release-tooling` — PASS; 14 testes direcionados de Context Pack/dispatcher.
- `pnpm run release:plan -- --base=origin/main --head=HEAD` — PASS; somente documentação/Context Pack, sem Supabase, Edge Functions, web ou VPS.
- Plano confirmado contra o commit sob teste: superfícies `context-pack`, `documentation` e `generated-context`; banco, Edge Functions e web/VPS não roteados.
- Suíte completa `pnpm run validate` — NÃO EXECUTADA; não é proporcional a uma mudança exclusivamente documental e o contrato a proíbe sem justificativa/autorização específica.

## Desvios do contrato

Nenhum desvio identificado.

## Git / QA / ambiente

Branch de implementação: `codex/gov-01-impact-mapping`. SHA validado: HEAD do commit final deste movimento. Artefatos não relacionados `.tmp.driveupload/` e `services/paddle/Dockerfile.gpu` preservados. Não há migration, função, web ou deploy para publicar.

## Conclusão

`PASS` para o escopo documental GOV-01. A prova não declara smoke de produto nem rollout de runtime; esses itens são fora de escopo e permanecem não aplicáveis.
