# AoT — reconhecimento da trajetória pelas atividades

Acordo congelado `docs/qa/agreement-trajectory-activity-recognition.md`v1.0.0 e execução correspondente. Baselineb00f03f5c5337772694e779a97b1c40fa41cdad3; branchcodex/trajectory-activity-recognition. Autorização explícita de implementação/publicação23/10/2026. ClasseD; reaproveitamento de motor/Knowledge/cache/consenso/leases, sem biblioteca/provedor novo. Matching5.2.0/triagem2.1.0/reconhecimento1.0.0; score1.4.0, pesos, semântica7.0.0 e prompt/modelo preservados.

## Acordos, implementação e evidência

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | Recuperação conservadora de atividades atribuídas ao núcleo e responsabilidades específicas; conjunto das experiências e fontes | Casos de cargo distinto, estoques plural, experiências históricas, marketing e responsabilidade fiscal em `trajectoryActivityRecognition.test.ts`;200testes dirigidos | PASS local |
| D-02 | Trajetória relacionada sem equivalência integral; requisito e senioridade separados; nota provisória explicada | Estoque/SAP/gestão de pessoas, nível adjacente, fonte real de leitura restrita executada offline no runtime exato | PASS local |
| D-03 | Dúvida explícita em resumo/tag/drawer; grupo contextual com dúvidas aberto e título próprio |32checks browser1448/390, screenshots com componentes reais, zero chamadas externas | PASS local |
| D-04 | Triagem seletiva por atividades; precedência de decisões/referências mantida; fallback intacto |200Node/42Edge, paridade web/Edge e falha da interpretação | PASS local |
| D-05 | Allowlist5.2.0 em score/SQL; CREATE OR REPLACE por substituição estrita preserva guardas/grants |50assertivas SQL locais, comparação ACL, versão desconhecida negada, histórico e M6.2 | PASS local |
| D-06 | Dependência causal trajectoryRecognition; atualização append-only sob demanda, lease e anterior na falha | SQL: uma atualização causal, nova versão aceita, segunda consulta estável, histórico imutável; testes Edge de atualização/falha/autoridade | PASS local |
| D-07 | Positivos e negativos contrastantes; publicação seletiva | QA local PASS; CI/publicação/smoke pendentes | PARTIAL |

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
