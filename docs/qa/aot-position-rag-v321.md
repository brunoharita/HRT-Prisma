# AoT — reconhecimento em Corrigir associação 3.2.1

Acordo/execução position-rag-v321 1.0.0. Classe D (RPC, fila/IA e seleção humana), baseline 00f1ca3 / web 303de23 / 3.2.0. Autorização explícita de Bruno para implementação e produção, sem nova aprovação administrativa.

## Mapa de impacto anterior à implementação

| Área/capacidade | Relação | Baseline / validação mínima |
| --- | --- | --- |
| Drawer da Posição/busca/referências | direct | M7.1, escolha e requisitos explícitos; busca/preview, erro/retry, teclado, desktop/mobile |
| Fila RAG/curadoria original | direct | fingerprint por empresa/título/contexto, uma execução original; SQL idempotência/concorrência/revisão |
| Salvamento versionado da Posição | plausible_indirect | trigger existente, requisitos e histórico; prova de mesmo contexto/fila e escolha preservada |
| Knowledge revisão empresa/global | plausible_indirect | componente reaproveitado; default e embedded, aprovação explícita e estados decididos |
| Auth/tenant/fontes/histórico | critical_transversal | funções backend/escopo/fail closed; negativos anon/member/outro tenant/inativo/fontes não publicadas |
| Score/matching/Perfil/modelo e outros serviços | no_impact_identified | sem troca de regras/modelos/handlers; regressão dirigida do contrato e snapshots de serviços |
| Release/registry/banco/web | direct | 3.2.1, plano, SQL local/CI, smoke e rollback; sem worker novo se diff não exigir |

Fechamento mínimo: todos os D e P aplicáveis PASS com testes dirigidos/SQL local/browser, documentação/contexto/CI, migration seletiva, web e smoke/sync. Nenhum registro humano real será alterado para teste. Produção sem QA remoto separado; QA local PostgreSQL descartável e navegador sintético.

## Acordos → implementação → teste → evidência

| ID | Implementação/teste/evidência | Status |
| --- | --- | --- |
| D-01 | Busca limitada, normalização única e predicado sem montar referência completa; SQL M7.1/regressão e falha/retry no browser | PASS |
| D-02 | RPC contextual + helper original de composição; fingerprint antigo inclusive limite de 3.500 caracteres; cliques/salvar e duas conexões concorrentes convergem para uma execução | PASS |
| D-03 | Candidatos elegíveis e abertura do componente original por Inbox exata; browser prova aprovação de Knowledge e seleção da Posição separadas | PASS |
| D-04/P-01 | Resposta tardia descartada por contexto/fechamento; humanos/requisitos/histórico/tenant/fontes e negativos SQL; nenhum catálogo/modelo/prompt novo | PASS |
| D-05 | CI branch40138646351/main40138999192 SUCCESS; migration20261024222951 com hash igual e web22f5c2b2 publicada, 17checks públicos/login/serviços preservados | PASS |
| D-UX-01 | 60 checks em 1448/390/320 e screenshots de reconhecimento/revisão; drawer e ações manuais preservados | PASS |
| CA-01 | Local e rollout PASS; limites da jornada humana real abaixo | PASS |

## Diagnóstico

Busca atual chama m71_concept_allowed por candidato; essa função constrói referências completas incluindo staging/proveniência para decidir apenas elegibilidade. Consulta vazia pode ampliar o trabalho a todo catálogo. Logs registram timeout em 24/10/2026 21:24:09 UTC; associação direta desse evento à RPC não é demonstrada pelo log resumido. Fonte operacional da função conferida, não apenas migration. Advisors de desempenho foram inspecionados; achados adjacentes não entram no escopo.

## Publicação / limites

QA local: 28 testes de codec/Posição/versão/erros, 10 do worker RAG e 22 de tooling PASS; root/web types e build PASS. Browser: 60 checks novos e 21 da revisão padrão Knowledge PASS, dados sintéticos sem LLM/banco remoto. SQL: 137 verificações, incluindo M7.1, curadoria RAG, permissões, origem/histórico, publicações/reconciliação, fila compartilhada e concorrência real de duas conexões; nenhuma tabela nova. Transações revertidas; fixture de concorrência confirmada apenas no banco descartável, excluído ao terminar. Evidências em `evidence/position-rag-v321`.

Performance sintética (100 repetições limitadas dos mesmos conceitos): elegibilidade anterior 2960,927 ms, atual 1070,458 ms; igualdade dos resultados comprovada inclusive fontes substituídas, reconciliação e outra empresa. Não é SLA de produção. A consulta de detalhes continua preservando as fontes completas.

Revisão final materializou os conceitos textualmente encontrados antes de avaliar elegibilidade, impedindo execução sobre conceitos fora dos resultados pelo plano da consulta. A rodada SQL final repetiu 137 verificações e a concorrência, com medição 3917,267 ms anterior / 1622,001 ms atual. Primeiro CI 40138325973 bloqueou 286a8289 por interpretar JSON.stringify da key React como JSON apresentado; cálculo movido para variável sem mudar a chave/comportamento, dois checks de registros legíveis PASS. Três checks de avisos também PASS. Corrigida somente uma quebra de linha final do teste. Nenhuma migration/produção foi aplicada a partir do SHA reprovado. Manutenção automática ativa do Git foi preservada; não houve limpeza de worktrees ou remoção de locks ativos.

As primeiras falhas foram de fixtures: nome acessível inclui ícone no botão; M7.1 histórico antecedia o subagrupador obrigatório M8.1 e leitura de auditoria exclusiva Super do M7.7; bootstrap não carregava a função de classificação; replacement JavaScript interpretava `$$` da SQL. Adaptadores locais passaram a usar a API v2 vigente, classificação original e ator correto, preservar `$$` via função de replacement e conferir original/decisão persistidos. Nenhuma proteção do produto foi removida para aprovar testes. Ajuste de extensão em import somente de tipo atende NodeNext no novo teste; sem alteração do runtime. Uma atualização de tipo recarregou o harness durante a rodada; testes completaram com todos os cenários e sem exceções; não houve alteração funcional durante a validação visual.

Referência do usuário é exemplo do fluxo/defeito. Mantidos drawer à direita, busca/lista e desassociação; bloco de reconhecimento acrescentado no mesmo contexto, revisão contextual reutiliza o layout original. Screenshots desktop/mobile em estados equivalentes registram essa transformação; não houve redesign geral. IA e aprovação local não selecionam automaticamente a Posição.

Rollback: web anterior retida; RPCs novas são aditivas, predicado e trigger mantêm assinatura/semântica. Se necessário, restaurar definições anteriores das funções alteradas por migration de avanço e usar web anterior; não apagar fila, conceitos ou decisões. Sem worker/modelo/Edge novo requerido. Advisors prévios: avisos de segurança existentes (7 anon definers, 147 authenticated definers, 40 RLS sem policy, proteção de senha); não são corrigidos neste escopo. As duas novas RPCs restringem execução a authenticated e validam admin/empresa no backend.

Publicada em 24/10/2026, SHA funcional `22f5c2b21a9f94e1692ee41d11e0d2976a54e247`, CI branch `40138646351` e main `40138999192` SUCCESS. Migration seletiva `20261024222951`/position_rag_v321: MD5 43d83461812d630d2d3701c472531dbe igual à fonte, SHA256 canônico 343693684294643898130bbeb73d48fb01e484962ae7d145a3903f617a0a6eab. As 144 tabelas, 30.257 conceitos, 21 Perfis, 23 versões de Posições e 12 aprovações mantêm contagens/hashes exatos antes/depois. RPCs novas authenticated-only, helpers privados sem grant público; autorização tenant/admin conferida. Advisors mantêm avisos prévios, acrescentando somente as duas APIs authenticated definer esperadas, sem novo acesso anon. Ledger incremental sincronizado sem reexecutar divergências históricas.

Busca somente leitura com ator Super existente e organização Prisma: Gerente de Estoque retornou zero resultados textuais em 1829,16 ms; estoque retornou dois em 1298,37 ms; consulta vazia retornou zero em 1,48 ms. Isso comprova resposta sem timeout, não equivalência semântica nem ausência de uma função. Nenhuma associação, curadoria ou solicitação de IA real foi criada nesses probes.

Web imagem `sha256:75d0faf51c58eda87f2db005663e51729df2563ab64b0d1d41714e211c752dc4`, running/zero reinícios, início2026-10-24T22:33:33.818311784Z; rollbackeded254fbc16 retido. O script recebeu404 no HEAD imediato da recriação e terminou com código22; verificação independente após estabilização passou 17checks de rotas/assets novos/anteriores/SHA/versão3.2.1/renderer/CSS e login público sem exceções. Não houve rebuild adicional. Sete serviços adjacentes, incluindo worker/modelo/Parser/Horus, preservam imagem/início/reinícios exatos. Recibos `evidence/position-rag-v321/production.json` e `production-db.json`.

Fontes local/origin/VPS alinhadas ao SHA funcional no smoke. Fechamento documental/ledger posterior sincroniza fontes sem alterar esse runtime ou publicar outro destino; CI obrigatório mantido. Tipos/build, 65 testes/checks locais dirigidos (incluindo avisos e registros legíveis), 81checks browser e 137SQL PASS. Sem QA remoto separado. Jornada autenticada humana e LLM real neste novo painel NOT TESTED em produção; testes funcionais usam componentes reais e dados sintéticos localmente, sem decisões reais. Nenhum desvio de contrato identificado. Rascunhos não rastreados alheios preservados.
