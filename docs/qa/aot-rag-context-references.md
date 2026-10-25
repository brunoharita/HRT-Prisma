# AoT — referências pertinentes no reconhecimento

Contrato/executação: `agreement-rag-context-references.md`1.0.0, aprovado pelo pedido explícito de Bruno. Baseline d9b1d01ab01dcb1afbe5a1b81336c8e9c0e4caf7. Versão pública3.2.1 preservada.

## Matriz de acordos

| ID | Implementação | Teste / evidência | Status |
| --- | --- | --- | --- |
| D-01 | Loader seleciona alvo contextual com decisão alias/justificativa/evidência; projeção compartilhada filtra lista/opções da Knowledge | 7 testes de reconhecimento e SQL com pool misto; `evidence/rag-context-references/sql.txt` | PASS |
| D-02 | Original imutável; conceito publicado por humano prevalece; pool descartado não fica como relação pré-selecionada | 7 testes taxonomia; SQL tenant, publicação humana fora do pool, escolha diferente e nenhum approval implícito | PASS |
| D-03 | Alvo real ESCO existente, exclusão do restante pela projeção; publicação mesma3.2.1 | Leitura produtiva somente alvo ESCO, CI branch/main SUCCESS, web3.2.1 e19smokes/login PASS; production.json | PASS |

## Proibições verificadas

| ID | Guardrail / evidência | Status |
| --- | --- | --- |
| P-01 | SQL altera somente loader/mesmos grants; sem DML/modelo/prompt/tabelas; testes preservam original e autoridade | PASS |

## Mapa de impacto e preservação

| Capacidade | Relação | Baseline / regressão | Status |
| --- | --- | --- | --- |
| Lista e opções RAG | direct | Baseline cinco recuperados mostrados; alvo stock exclusivo na projeção, inclusive relações auxiliares excluídas | PASS |
| Tenant, fonte e decisões | critical_transversal | Mesmos guards/eligibilidade/grants; SQL nega outro tenant, oculta retirado e mantém publicação humana | PASS |
| Revisão/aprovação local | plausible_indirect | Original preservado, nenhuma relação auxiliar invisivelmente selecionada; browser78checks1448/390/320 PASS | PASS |
| Worker/modelos/Score/Perfil/serviços | no_impact_identified | Nenhum módulo de processamento/escrita desses domínios alterado; containers comparados: sete adjacentes sem mudança de imagem/início/reinícios | PASS |

Novidade: conjunto recuperado deixa de ser apresentado como recomendação. Preservação: associação e curadoria continuam humanas, e busca manual independente permanece. Sem mudança de arquitetura ou armazenamento. Projeção não garante infalibilidade da interpretação do modelo; ela exige indicação contextual sustentada e não promove itens auxiliares. Referências relacionadas não são equivalências.

## Fora de escopo

F-01 PASS: diff não altera modelo/prompt/Score nem integra fontes externas. Nenhuma nova inferência será executada; a validação reutiliza a proposta existente em leitura.

## Evidência visual

Captura fornecida é contraprova funcional, sem novo desenho normativo. Mesma composição do drawer e revisão, com exclusão do ruído. Browser78checks1448/390/320 PASS; capturas `evidence/rag-context-references/browser/`, desktop/revisão e320px inspecionados. Conteúdo e ações preservados; sem redesign.

## Validação final / ambiente

PostgreSQL17 descartável em127.0.0.1:55479:54assertions PASS, rollback e nenhuma tabela nova.14testes Node (7reconhecimento/7taxonomia), tipos raiz/web e build web PASS. Três tentativas do browser interrompidas por seletores de teste (label sem associação, texto parcial ambíguo e verificação antes de abrir o popup); escopo do label e espera do item corrigidos, sem mudar produto. Execução estabilizada passou78checks. Sem suíte integral local; CI obrigatório preservado.

Baseline produtivo somente leitura:144tabelas,30257conceitos/hash20a36fbe2acb091c67df9f1e19c7b882,12aprovações/hash7e7931e6c74824a28c8c42180acb486a,23versões/hash9953c62ea8bd79af80a309abe2f86708,2propostas/hash6e8469d11ff54f2d02daa51ba346f601 e1run. Proposta corrente pendente, alvo ESCO94b18be6-387a-451c-abd2-9229c0141e6c; pool5. Comparação final idêntica em todos esses agregados; nenhuma associação, aprovação ou inferência foi executada. Sem QA remoto separado; não executar aprovação/associação produtiva para testar.

Rollback: definição anterior do loader em migração revisada e imagem web anterior; não apagar pool, proposta, curadoria ou histórico.

## Desvios e conclusão

Nenhuma nova decisão material nem desvio do contrato. D-01..03/P-01/F-01 PASS; publicação e preservação comprovadas. Busca manual/histórico permanecem; a correção não promete infalibilidade do modelo. Rascunhos não rastreados preexistentes foram preservados e excluídos da entrega.

## Fechamento operacional

SHA funcionalc188b894d83da118b11c3ab968c41bd4961170bc, CI branch40154682722/main40154815059 SUCCESS. Migração remota20261025023217/local20261025010000,3742caracteres/hash6c7b7f8cb65b765f00ab6bcfaa19f594aa57d4164cac6e689da11edb76a1a1b9 idênticos. Mesmas quatro categorias de advisors; anon EXECUTE false/authenticated true. Ledger incremental atualizado sem replay/repair ou alteração dos totais históricos.

Leitura real autenticada de Gerente de Estoque retorna somente Gestor de armazém/Gestora de armazém (ESCO1.2.1), sustentado por gestão direta de estoque, operações e equipe. Couro/vendas e qualquer outro item sem indicação contextual não entram na lista. Pool original5 preservado; proposta permanece awaiting_human_review. Baseline e após têm hashes idênticos, incluindo as duas propostas; contagem de um run preservada, sem chamada adicional ao modelo. Evidência sanitizada: `evidence/rag-context-references/production.json`.

Web imagem a94a16a71e053415993abb076ac032e99f921bd939d4b8f4124cfcdfb64e94d1 running/restarts0, entrada index-CQLbPBr1.js;19checks HTTP/assets/SHA/3.2.1/build contextual e login PASS. O smoke imediato retornou404 no swap; verificado independentemente sem novo build. Worker/modelo/Horus/parser/gateway/mail/Traefik mantiveram imagem, início e reinícios. Rollback web anterior9273e113cbbc preservado pelo script. Limite: não executamos uma aprovação/associação humana produtiva para testar. Tipos/build e browser reais do componente com fixtures, RPC produtivo e assets publicados fornecem evidência separada. Fechamento documental/contextos não reconstrói runtime.
