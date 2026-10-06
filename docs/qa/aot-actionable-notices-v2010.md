# AoT — Avisos com ação v2.0.10

Contrato: `docs/qa/agreement-actionable-notices-v2010.md` v1.0.0, aprovado no pedido explícito de Bruno de 06/10/2026. Baseline main `bfbf2456921b38f7a55b9e029c8ea9cf5597a000`, produto 2.0.9.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Explicar grupo indefinido, contagem e ação exata | PersonProfessionalEvidenceMap, CompetencyGroupModal | UI desktop/celular: 2 vínculos, competência correta, classificação atualiza grupo e mantém evidências | PASS | Sintético local |
| D-02 | Reusar classificação, autoridade e histórico | Adapter e RPC existente classify_knowledge_competency | 10 checks SQL, replay, grupos/empresa/global/papéis; UI sem preseleção e seleção preservada; grants remotos somente leitura | PASS | PostgreSQL local com rollback; sem mutação real |
| D-03 | Outros avisos com problema e destino contextual | Inventário, noticeActions, ActionableMessage, páginas/componentes | 63 pontos AST, revisão de destinos/diff, foco de campo inválido e rascunho preservado em desktop/celular | PASS | Não equivale a testar todos os estados autenticados |
| D-04 | Versão 2.0.10, main/produção e smoke seletivo | Registry, documentos/contextos; web somente | Types/build/registry/contextos PASS; CI branch/main success; web42308e72,11 HTTP200 e SHA/bundle | PASS | Smoke público; jornada real autenticada não executada |

## Proibições verificadas

| ID | Guardrail | Prova | Status |
| --- | --- | --- | --- |
| P-01 | Sem grupo automático, justificativa fabricada, perda de edição, ampliação de acesso ou QA mutacional real | Select vazio, lock de duplo clique, erro mantém escolha, foco não grava; RPC existente com negativos/global/tenant/member/anon; evidências preservadas; diff sem novas permissões/schema/IA | PASS |

## Mapa de Impacto e Preservação

| Capacidade / relação | Baseline | Regressão / evidência | Status |
| --- | --- | --- | --- |
| Competências, grupo e avisos / direct | 2.0.9, imagem de pendência é contraexemplo | 10 cenários UI desktop/celular e inventário | PASS |
| Vínculo unitário e múltiplo / plausible_indirect | Wrapper v2 ativo, UI 2.0.9 | 4 fluxos single/multiple em 1416/390; uma chamada, todas fontes, sem justificativa, projeção atualizada | PASS |
| Rascunhos, foco, navegação / plausible_indirect | Formulários e escolhas existentes | Foco no campo inválido sem apagar rascunho; revisão evita recarga da página; destinos existentes conferidos | PASS |
| Autorização/classificação/histórico / critical_transversal | RPC existente; authenticated permitido/anon negado | 10 checks SQL locais, ROLLBACK; leitura remota confirma guardas e RPC legado | PASS |
| Parser/worker/gateway/matching/schema / no_impact_identified | Imagens indicadas no acordo; regras existentes | Diff sem mudança em backend/schema/prompts/matching; imagens e saúde/restarts idênticos após deploy | PASS |

Entrega nova: explicação do grupo indefinido com ação; mensagens persistentes e navegação contextual. Preservação: vínculo múltiplo e autoridade; sem nova dependência. Nenhuma relação material adicionada ao mapa. Limites: cenário real autenticado não executado; testes de foco não provam todos os formulários.

## Fora de escopo

F-01 PASS: nenhuma migration/Edge/Parser/worker/IA, nenhuma reforma do matching, backfill ou envio externo. Informações sem intervenção não recebem botão artificial.

## Fidelidade visual

A imagem do usuário é contraexemplo, não alvo de dados nem identidade de pixels. Cabeçalho, abas, filtros, cartões Hard/Soft e pendências mantidos. Renders sintéticos 1416 e390 em `docs/qa/evidence/actionable-notices-v2010/`: explicação e ação visíveis mesmo recolhido, modal responsivo, sem sobreposição/overflow. PASS para topologia preservada; dados reais da imagem não usados em QA.

## Desvios e mudanças autorizadas

Nenhum desvio de comportamento identificado na revisão do contrato/diff. Sem nova decisão de produto ou destino. O plano automático sugerirá teste geral pela presença de web/tests; a instrução explícita e o acordo usam somente validação local focada. CI remoto obrigatório permanece intacto.

## Validação final

Types root/web, build web: PASS. Registry:5 testes; avisos AST:3; jornada de convite:4; UI:10 cenários; vínculo:4; SQL:10 checks, ROLLBACK. Warnings de chunk/dynamic import preexistentes não alterados. Contextos/lint/foundation PASS no snapshot Git somente com os arquivos do movimento; não incluir o acordo de matching não rastreado. Primeiro CI identificou assertion antiga de redação do aviso de cópia; teste atualizado para mensagem com link/ação, preservando todas as provas de não simular envio/conclusão. CI final branch/main PASS, sem suíte completa local. Evidências em `docs/qa/evidence/actionable-notices-v2010/inventory.md`.

## Git / produção

SHA publicado `42308e72e49ffcc28af632a7700a3c5451137f4e` (aplicação4227cfc + ajuste do teste diretamente afetado). Main promovida por fast-forward. CI branch37412432194 e main37412586909 success. Plano1.0.3:63arquivos, sem migration/Edge/Parser/síntese; somente prisma-web. As recomendações amplas de testes do dispatcher foram substituídas pela validação proporcional do acordo, sem alterar o dispatcher ou CI obrigatório.

VPS existente /opt/prisma: web `sha256:24f9017604034ec26e25a5764d3e38597e856a19842fd433e268cf2993464554`, running,0restarts, entry `/assets/index-DxCL2PFY.js`. Primeiro HEAD coincidiu com recriação e404; após estabilização11verificações HTTP200 e6checks do bundle (SHA,versão,grupo,explicação,lote,fontes sob demanda), sem novo build. Rollback `prisma-web:rollback-before-42308e72e49f` aponta para08ce658e93da605dcb6b03f3393d4856ca0807379cdfdac59c6c483d1c879511. Assets anteriores preservados. `public-smoke.json` contém o resultado sanitizado.

Preservação operacional: síntese8526717f healthy0, Parser8682af7d healthy0, gatewayd061cea3 running0, imagens exatamente iguais antes/depois. RPC de classificação existente no projeto Prismaioldpnqqvobprjiontre, authenticated permitido/anon negado/guardas de administrador e alcance presentes, RPC de projeção preservado; leitura remota, nenhuma mudança de banco.

Local/main/origin/VPS no mesmo SHA funcional na conferência de publicação. Fechamento de evidência/documentação sincronizado sem reconstruir a aplicação. Trabalho não relacionado preservado. Manutenção automática local do Git tentou limpar registros antigos de worktrees sem permissão; commits tiveram sucesso, nenhuma remoção ou reparo desses registros foi feito. O bloqueio de promoção pela revisão automática ocorreu antes da prova atual do CI; não houve promoção naquela tentativa, e a nova execução usou CI completed/success verificado.

## Conclusão

Todos os D e P aplicáveis PASS dentro das evidências declaradas. Versão2.0.10 publicada somente na web. Não se afirma teste de clique autenticado em Pessoa real nem runtime de todos os estados do inventário. Evidências e autoridade preservadas, sem decisões artificiais de classificação.
