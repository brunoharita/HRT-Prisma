# AoT — reconhecimento da trajetória pelas atividades

Acordo congelado `docs/qa/agreement-trajectory-activity-recognition.md`v1.0.0 e execução correspondente. Baselineb00f03f5c5337772694e779a97b1c40fa41cdad3; branchcodex/trajectory-activity-recognition. Autorização explícita de implementação/publicação23/10/2026. ClasseD; reaproveitamento de motor/Knowledge/cache/consenso/leases, sem biblioteca/provedor novo. Matching5.2.0/triagem2.1.0/reconhecimento1.0.0; score1.4.0, pesos, semântica7.0.0 e prompt/modelo preservados.

## Acordos, implementação e evidência

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Recuperação conservadora de atividades atribuídas ao núcleo e responsabilidades específicas; conjunto das experiências e fontes | Casos de cargo distinto, estoques plural, experiências históricas, marketing e responsabilidade fiscal em `trajectoryActivityRecognition.test.ts`;200testes dirigidos | PASS |
| D-02 | Trajetória relacionada sem equivalência integral; requisito e senioridade separados; nota provisória explicada | Estoque/SAP/gestão de pessoas, nível adjacente, fonte real de leitura restrita executada offline no runtime exato | PASS |
| D-03 | Dúvida explícita em resumo/tag/drawer; grupo contextual com dúvidas aberto e título próprio |32checks browser1448/390, screenshots com componentes reais, zero chamadas externas | PASS |
| D-04 | Triagem seletiva por atividades; precedência de decisões/referências mantida; fallback intacto |200Node/42Edge, paridade web/Edge e falha da interpretação | PASS |
| D-05 | Allowlist5.2.0 em score/SQL; CREATE OR REPLACE por substituição estrita preserva guardas/grants |50assertivas SQL locais, comparação ACL, versão desconhecida negada, histórico e M6.2 | PASS |
| D-06 | Dependência causal trajectoryRecognition; atualização append-only sob demanda, lease e anterior na falha | SQL: uma atualização causal, nova versão aceita, segunda consulta estável, histórico imutável; testes Edge de atualização/falha/autoridade | PASS |
| D-07 | Positivos e negativos contrastantes; publicação seletiva | QA local, CI branch40027537656/main40027888027 e produção conforme fechamento abaixo | PASS |

## Proibições

P-01: ferramenta isolada, venda/construção de software, aspiração, curso, negação, área ampla e gestão genérica não viram experiência direta. Gestão de pessoas permanece sem evidência no caso analisado. PASS local.

P-02: pesos/fórmula não alterados (matchingScore muda somente allowlist); fixtures sintéticas, sem provider. Fonte profissional real somente leitura, execução offline; não há alteração de Perfil ou decisão humana nem chamada paga para validação. PASS local; preservação remota conferida no fechamento.

P-03: guards de tenant/lease/fontes/autoridade, versão desconhecida, grants e fallback testados. Migration altera somente fragmentos esperados e falha diante de baseline diferente; nenhuma alteração de ACL. PASS local.

## Mapa final de impacto e preservação

| Capacidade | Relação | Baseline / regressão e limite |
| --- | --- | --- |
| Atividades, grupos e triagem | direct |5.1.0/triagem2.0.0;200Node/42Edge com positivos, negativos, temporalidade e paridade |
| Requisitos, pesos e senioridade | plausible_indirect | score1.4.0/pesos10/25/35/10/10/10 preservados; testes de matching/score e diff |
| Persistência/histórico/M6.2 | direct | lease, avaliação append-only, data fixa e controle de versões;50assertivas em PostgreSQL17 localhost55479, transação ROLLBACK |
| Tenant/decisões humanas | critical_transversal | SQL negativo/ACL e Edge; funções atuais de produção conferidas antes da substituição, sem remover guarda multiempresa |
| Busca/comparação/drawer | direct | apresentação existente,32checks browser1448/390, navegação/comparação/recálculo explícito preservados |
| Parser/Synthesis/Auth/processos | no_impact_identified | nenhuma edição de regras/fontes; release não inclui serviços adjacentes; smoke de IDs/imagens/reinícios no fechamento |

Dependência descoberta e incluída antes da implementação: resultados salvos não atualizariam apenas por deploy. Revisão causal do reconhecimento autoriza atualização única sob demanda, sem varredura ou invalidação por tempo. Ambiente remoto único é produção; QA desta entrega é local sintético. SQL usa baseline descartável vazio `import_evidence_v202`, verificado no início, e fixtures de estabilidade existentes mais `supabase/qa/trajectory_activity_recognition_verification.sql`. A porta estava desligada e foi retomada com pg_ctl no diretório local existente; não se criou ambiente remoto nem se reiniciou serviço de produção.

## Evidência e limites

`docs/qa/evidence/trajectory-activity-recognition/`: testes de domínio/Edge/SQL, browser e screenshots, validação somente leitura de fonte real. Fonte real: perfil1 e posição1 do caso solicitado produzem trajetória relacionada, score provisório disponível, SAP atendido, gestão de pessoas/comunicação sem evidência e senioridade adjacente abaixo; a decisão humana atual `confirmed` permanece e resolve a triagem internamente. Não se afirma nota histórica recalculada em produção, validade empírica universal nem melhor candidato. Falsos negativos por paráfrase ainda são possíveis; recuperação conservadora e interpretação existente não garantem recall universal.

Sem referência visual normativa nova: imagem anterior é exemplo do produto, não alvo de composição para estas regras. Mudança mínima de avisos/grupos, com render real inspecionado. Ajustes de fixture/seletores (env do client, menu Outras ações, animação do drawer) não eram defeitos de produto. Responsabilidades ausentes em fonte legada são tratadas como lista vazia; testes Edge cobrem essa compatibilidade.

F-01 preservado: sem redesign, taxonomia externa, novo modelo/prompt/biblioteca ou decisão de contratação. Nenhum desvio do acordo identificado na validação local. Publicação/CI/smoke e sincronização serão registrados após conclusão.

Revisão de rollout: worker5.1.0 não pode concluir avaliação com a dependência nova; leitura histórica5.1.0 e M6.2 permanecem.50assertivas SQL locais PASS. Primeiro CI40027104054 detectou somente expectativa antiga de versão em positionTaxonomy (1011/1012 passaram); expectativa atualizada para5.2.0 e teste dirigido repetido. Sem mudança de regra de taxonomia. Trava Git vazia ficou sem escritor/handle e só então foi removida; commit7d1bdec concluído no checkout original. Worktree de contingência terminou depois e teve arquivamento solicitado sem uso. Avisos de pruning de outros worktrees não foram tratados como falha funcional nem motivaram limpeza alheia.

## Publicação e sincronização verificadas

Runtime coerente82794add612cb8949f460e1a3f2cce075a827ab1 em main/origin/VPS. CI branch40027537656 e main40027888027 success, fundação integral obrigatória. Complemento de versão:7testes de positionTaxonomy PASS. Tipos/build web, foundation,22release-tooling, ledger e Context Pack PASS. Lint do diretório original encontrou apenas arquivos alheios em output; lint e geração/check de contexto passaram no snapshot exato de4346arquivos rastreados/staged, preservando rascunhos não rastreados.

Migration20261023180000 aplicada como20261023213441 no projeto únicoioldpnqqvobprjiontre. Três funções preservam ACL/security-definer/search_path/guards; hashes restaurados removendo somente os fragmentos autorizados são idênticos aos anteriores. Edge matching-trajectory21 ACTIVE/jwt true,14/14arquivos iguais ao SHA validado; bundle8b5b2bd85622b36c26e5409899379ba8cff759e3b34cfba14a7a31d8f0f79047. Advisors de segurança sem alteração.

Web containerff4c7a04dd28, imagem0eaa081e5c58a63a2826fa2e1287500cf8590326005e2d2f04195f02805e7a26, running/restarts0. Script saiu22 por HEAD404 imediato na troca; conferência independente posterior estabilizou200 sem novo build.15checks de HTTP/assets/SHA/aviso de incerteza/negação anônima PASS; entryindex-DojCWbi-.js/CSSindex-CbWl015i.css. Um primeiro assert de smoke procurava versão do motor no JS cliente; foi corrigido: cálculo ocorre no servidor e essa constante não integra o bundle cliente. A prova do motor é a igualdade dos14arquivos Edge, não uma string no frontend.

Parser, Synthesis, gateway, mail, Horus e Traefik preservam exatamente IDs/imagens/reinícios/status dos seis containers. A advertência de compose sobre orphan containers não motivou remoção. Imagem anterior6128874ace2f19c5161f8e5ff5b4af83e4025fd348a2f996a5dd235d9cae4974 preservada em prisma-web:rollback-before-82794add612c; Edge20 e suas14fontes anteriores foram guardadas localmente para recuperação. Rollback coordenado: restaurar fragmentos anteriores de stable_matching_sources/complete_stable_matching_score antes do worker20, manter M6.2 compatível com históricos5.2.0 e restaurar imagem web; nunca apagar avaliações/decisões para rollback.

Leitura remota após DDL/Edge confirma hash do Perfil inalterado,5avaliações anteriores preservadas e decisionSource humana idêntica. Nenhum backfill/reprocessamento em massa, Perfil real alterado ou chamada paga para teste. Resultado salvo antigo é atualizado pela primeira consulta autorizada; não foi fabricada avaliação real para smoke. Jornada autenticada de recálculo real permanece NOT TESTED; validação do caso real foi somente leitura/offline no runtime exato, seguida da conferência de igualdade do servidor publicado. A recuperação textual segue conservadora e pode não resolver toda paráfrase.

D-01..07 e P-01..03 PASS nas fronteiras e ambientes acima, com limites explícitos; F-01 preservado. Nenhum desvio do acordo. Fechamento documental posterior sincroniza Git/VPS sem rebuild, sem reabrir escopo; CI desse fechamento permanece obrigatório.
