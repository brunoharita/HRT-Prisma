# AoT — Avisos com ação v2.0.10

Contrato: `docs/qa/agreement-actionable-notices-v2010.md` v1.0.0, aprovado no pedido explícito de Bruno de 06/10/2026. Baseline main `bfbf2456921b38f7a55b9e029c8ea9cf5597a000`, produto 2.0.9.

## Matriz de Acordos

| ID | Acordo | Implementação | Teste / evidência | Status | Ambiente / limite |
| --- | --- | --- | --- | --- | --- |
| D-01 | Explicar grupo indefinido, contagem e ação exata | PersonProfessionalEvidenceMap, CompetencyGroupModal | UI desktop/celular: 2 vínculos, competência correta, classificação atualiza grupo e mantém evidências | PASS | Sintético local |
| D-02 | Reusar classificação, autoridade e histórico | Adapter e RPC existente classify_knowledge_competency | 10 checks SQL, replay, grupos/empresa/global/papéis; UI sem preseleção e seleção preservada; grants remotos somente leitura | PASS | PostgreSQL local com rollback; sem mutação real |
| D-03 | Outros avisos com problema e destino contextual | Inventário, noticeActions, ActionableMessage, páginas/componentes | 63 pontos AST, revisão de destinos/diff, foco de campo inválido e rascunho preservado em desktop/celular | PASS | Não equivale a testar todos os estados autenticados |
| D-04 | Versão 2.0.10, main/produção e smoke seletivo | Registry, documentos/contextos; web somente | Types/build e registry locais PASS; publicação em andamento | PARTIAL | Fechar após CI, release e smoke |

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
| Parser/worker/gateway/matching/schema / no_impact_identified | Imagens indicadas no acordo; regras existentes | Sem mudanças em runtime de backend, schema, prompts, matching ou serviço; confirmar imagens após publicação | PARTIAL |

Entrega nova: explicação do grupo indefinido com ação; mensagens persistentes e navegação contextual. Preservação: vínculo múltiplo e autoridade; sem nova dependência. Nenhuma relação material adicionada ao mapa. Limites: cenário real autenticado não executado; testes de foco não provam todos os formulários.

## Fora de escopo

F-01 PASS: nenhuma migration/Edge/Parser/worker/IA, nenhuma reforma do matching, backfill ou envio externo. Informações sem intervenção não recebem botão artificial.

## Fidelidade visual

A imagem do usuário é contraexemplo, não alvo de dados nem identidade de pixels. Cabeçalho, abas, filtros, cartões Hard/Soft e pendências mantidos. Renders sintéticos 1416 e390 em `docs/qa/evidence/actionable-notices-v2010/`: explicação e ação visíveis mesmo recolhido, modal responsivo, sem sobreposição/overflow. PASS para topologia preservada; dados reais da imagem não usados em QA.

## Desvios e mudanças autorizadas

Nenhum desvio de comportamento identificado na revisão do contrato/diff. Sem nova decisão de produto ou destino. O plano automático sugerirá teste geral pela presença de web/tests; a instrução explícita e o acordo usam somente validação local focada. CI remoto obrigatório permanece intacto.

## Validação final

Types root/web, build web: PASS. Registry:5 testes; avisos AST:3; UI:10 cenários; vínculo:4; SQL:10 checks, ROLLBACK. Warnings de chunk/dynamic import preexistentes não alterados. Contextos/lint/foundation pendentes do snapshot Git limpo. Evidências em `docs/qa/evidence/actionable-notices-v2010/inventory.md`.

## Git / produção

Em andamento. Somente web requerida; RPC existente ativo, sem publicação de banco. Rollback, SHA, imagens e smoke serão registrados após publicação. Trabalho não relacionado preservado.

## Conclusão

Implementação e validação funcional local concluídas; entrega ainda não encerrada enquanto D-04 e preservação operacional estiverem parciais.
