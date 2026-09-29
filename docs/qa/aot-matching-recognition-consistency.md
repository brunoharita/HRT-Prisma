# AoT — consistência do reconhecimento profissional

Contrato: `docs/qa/agreement-matching-recognition-consistency.md` v1.0.0, preservando M8.6 v1.0.0 e fallback v1.0.0. Baseline: `75b3dc52fbb11d5ae2e1e1308ad6e29eadf74896` em `main`/`origin/main` antes do movimento. Esta evidência é sintética; não mede nem altera Pessoas reais.

## Matriz de Acordos

| ID | Implementação | Prova | Status / limite |
| --- | --- | --- | --- |
| D-01 | Relação ocupacional alimenta área, função, trajetória e seleção de períodos com nível relacionado, mantendo referência/alias publicado e origem. | `matchingScore.test.ts`: programador/desenvolvedor, referência genérica e casos negativos. | PASS sintético; não valida o conjunto real de aliases da Posição. |
| D-02 | Área ampla isolada não promove A quando o título define núcleo mais específico. Relação publicada genérica não comprova backend. | Testes de backend sintético, Marketing e Gerente de Tecnologia. | PASS sintético. |
| D-03 | Períodos de função relacionada prevalecem sobre liderança/área contextual; nenhuma alteração nas faixas temporais. | Contraste sintético com programação histórica e liderança atual; `m84ScoreTemporal.test.ts`. | PASS sintético. |
| D-04 | Avisos de busca/comparação e tag de detalhe nomeiam cálculo pré-IA vigente e versão; fallback mantém objeto calculado. | `matchingScore.test.ts` verifica textos; `semanticTriage.test.ts` verifica falha e resposta válida. | PASS local; tela autenticada real não exercida para evitar IA sobre Pessoas. |
| D-05 | Matching 5.1.0 versionado; score 1.4.0 sem novos pesos; runtime web/Edge gerado; M6.2 amplia allowlist sem reescrever registros. | Teste estático e PostgreSQL 17 descartável, baseline remoto lido, verificador de runtime, testes de snapshot. | PARTIAL até aplicação e leitura remota da migration; validação SQL local PASS. |

## Proibições

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Negativos: programador de produção, venda de software/Tecnologia, outro domínio, desenvolvedor genérico e Knowledge genérica não viram backend direto; requisitos sem evidência. | PASS sintético. |
| P-02 | Diff sem escrita de Perfil, Posição, Knowledge, decisão humana ou snapshot; pontuação não usa nome/identidade. | PASS no diff local. |
| P-03 | Testes de versão desconhecida, tenant/autoridade/caches da Edge e falha de IA; guard SQL conserva rejeição de versões desconhecidas. | PASS local, com stub isolado da função M6.2. |

## Mapa de Impacto e Preservação

| Área | Relação | Baseline protegido | Regressão e estado |
| --- | --- | --- | --- |
| Matching/score | direct | 5.0.0, score 1.4.0, A/B/C e pesos existentes | 81 testes dirigidos PASS após correção de regressões; contraste 5.1.0. |
| Busca, comparação e detalhe | direct | Falha de IA não elimina resultado | Teste de fallback e textos PASS; render autenticado não testado. |
| Edge e M6.2 | critical_transversal | Snapshot servidor, tenant, autoridade, histórico e guard de versão | 32 testes Deno PASS; migration em PostgreSQL 17 descartável PASS, com versions, desconhecida, ACL e SECURITY DEFINER. |
| Outras profissões/Knowledge | plausible_indirect | Equivalência publicada específica, sem inferência por setor/ferramenta | Regressão de Marketing/Sistemas/Tecnologia e negativos PASS; corpus real não reprocessado. |
| Parser, requisitos e curadoria | no_impact_identified | Fontes e decisões humanas intactas | Diff sem alterações nessas superfícies; testes de requisito existentes PASS. |

Dependência descoberta após o mapa inicial: M6.2 ainda não aceitava `vacancy-matching-semantic-7.0.0`; a migration inclui essa versão já publicada, além de 5.1.0. Nenhuma nova autoridade/tenant foi criada. Não há referência visual normativa para a alteração de texto do aviso; as imagens do incidente são contraexemplos de classificação.

## Fora de escopo e limitações

F-01/F-02 preservados no diff: sem mudança de prompt/modelo/acionamento da IA, pesos/faixas, requisitos, Knowledge, Perfis ou reprocessamento real. Os quatro itens não rastreados do usuário identificados no início ficaram intocados.

`initdb` falhou inicialmente sob o sandbox do Windows; em execução autorizada fora dele, criou-se PostgreSQL 17 descartável em `localhost`. A migration foi aplicada a uma função M6.2 mínima com o predicado original e testada para 4.0.0, 5.0.0, 5.1.0, semântica 6.0.0/7.0.0 e versão desconhecida; grants e `SECURITY DEFINER` permaneceram. A primeira asserção de ACL confundiu o grant do dono com o público; a asserção foi corrigida e passou sem mudar a migration. O teste não reconstrói todas as dependências da função real. A definição de produção foi consultada somente para leitura e continha o guard esperado. O cluster foi parado e as duas pastas temporárias criadas nesta tentativa foram removidas.

## Validação e publicação

- `pnpm run build`, `pnpm run typecheck:web`, `pnpm run build:web`: PASS.
- 81 testes de matching, taxonomia, triagem semântica, score temporal, migration estática e inteligência da Posição: PASS.
- 32 testes Deno de handler/snapshot Edge: PASS.
- Teste estático e execução da migration em PostgreSQL descartável: PASS.
- `pnpm run check:matching-runtime` e `pnpm run check:prisma-context`: PASS após geração.
- Publicação, CI e smoke: pendentes nesta etapa do AoT. Não declarar produção até confirmação remota.

## Desvios e conclusão

Nenhum desvio funcional intencional do contrato. Regressões intermediárias nos testes de equivalência Knowledge e Posição sem título foram corrigidas antes deste fechamento; os testes respectivos voltaram a passar. Resultado local ainda PARTIAL pelo rollout; atualizar este AoT com SHA e evidência remota após a publicação.
