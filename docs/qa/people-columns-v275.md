# Pessoas: leitura profissional 2.7.5

Acordo aprovado por Bruno em15/10/2026, baseline74d517a. Classe B: apresentação/filtros, sem persistência nova.

## Acordo e execução congelados

- D-01 seis colunas, nesta ordem: Pessoa, Área Profissional, Função/Cargo, Última empresa, Cidade, Data do Perfil. Nome abre a Pessoa.
- D-02 cargo original da última experiência, somente o texto; empresa e período do mesmo registro. Priorizar em andamento e início mais recente; senão término mais recente. Ambiguidade explícita, sem inventar cronologia.
- D-03 data da aprovação/publicação do Perfil vigente; importação/rascunho/cadastro da Pessoa não alteram essa data. Ausência explícita.
- D-04 opção Todos/Todas explícita em cada filtro, limpeza individual e global incluindo busca e situação. Cargo filtra texto original da experiência exibida. Retirar recorte temporal da lista.
- P-01 não exibir função agrupada, prefixo Original, status Perfil atual ou importação como coluna. Não alterar fatos, IA, dados, publicação, permissões ou Knowledge.
- F-01 reprocessamento, correção de classificações, redesign do editor, novos campos persistidos e bibliotecas.
- A-01 reutilizar Ant Design/Prisma e dados/RPCs existentes; versão2.7.5 e publicação web seletiva.
- Q nenhuma. Screenshot é contraprova; preservar tabela clara, busca superior, filtros, densidade e navegação; nenhuma composição nova.
- CA-01 testes dirigidos de cronologia/cargo original e empate/ausência; browser nas mesmas fixtures desktop/celular, filtros individuais/globais, data de publicação, navegação e ausência de poluição.

Execução implementa D-01..04, impede P-01, respeita F-01; A-01 cobre detalhes técnicos. Aprovação inclui main e produção.

## GOV-01

| Capacidade | Relação | Baseline e prova proporcional |
| --- | --- | --- |
| Pessoas/colunas/filtros/navegação | direct | 2.7.4; teste domínio, tipos/build web, browser1448/390 com mesmas fixtures antes/depois |
| Knowledge/classificação | plausible_indirect | consumidores da lista apenas; manter área publicada/derivada e originais; teste combinação área/cargo |
| Auth/PII | critical_transversal | serviço e grants intactos; Cidade usa projeção autorizada existente; revisão diff e smoke anônimo |
| Perfil/manual/IA/Score/matching/seleção | no_impact_identified | sem alteração de writers, contratos, prompts ou consumers; revisão escopo e CI obrigatório |

Fechamento: CA-01, lint/contexto, CI, main/origin/VPS, smoke/rollback. Sem suíte integral local; CI obrigatório permanece.

## AoT

D-01..04/P-01 PASS em24assertivas browser1448/390 (colunas/ordem/cargo sem agrupamento/empresa única/cidade/data/filtros reversíveis/navegação/ausência de erro),4testes domínio e regressão documental/Pessoa dirigida. Tipos web, build web, lint e Context Pack PASS. Referência é contraprova; tabela clara/ordem das informações preservadas, screenshots nas mesmas fixtures desktop/celular em evidence/people-columns-v275. Sem QA remoto; fixtures locais não comprovam jornadas autenticadas reais.

Interferências locais: pnpm11 tentou verificar/reinstalar dependências do worktree; usado verify-deps-before-run=false apenas nos comandos da sessão, sem reinstalar/apagar módulos. Browser sintético corrigido com variável publishable requerida e seletor de botão com ícone. Teste legado ainda exigia colunas removidas: atualizado para o novo acordo. Nenhuma dessas correções altera produção ou amplia escopo.

Publicação/CI/smoke pendentes; fechamento operacional será acrescentado após verificação. Tempos UTC: início01:59:14, preparação/implementação até02:03:03 (3m49s, inclui checks sobrepostos); validação local em curso. Não somar durações de jobs paralelos como tempo total.

CI38838840051 detectou expectativa de versão2.7.4 em productRelease.test ainda não atualizada; corrigida para2.7.5 e contador5. É omissão de preparação da release, sem falha funcional de Pessoas. Nova validação necessária apenas para esse teste e CI. Nenhuma produção alterada antes da correção.

## Publicação e fechamento operacional

PASS: runtime40b451341aabfec5782cd41cb04a2130cad78fc7, versão2.7.5; CIs branch38839040394 e main38839071442 SUCCESS. Os dois CIs executados em paralelo sobre o mesmo SHA após a correção da expectativa de versão. Plano seletivo17arquivos: somente prisma-web, sem banco/Edge/gateway/worker. Integração fast-forward, sem force-push.

| Acordo | Implementação/prova | Status |
| --- | --- | --- |
| D-01 | seis colunas na ordem exata e nome navegável;24assertivas browser1448/390 e screenshots | PASS |
| D-02 | latestDirectoryEntry independente de function/status; cargo/empresa/período do mesmo registro, empates/datas insuficientes explícitos;4testes domínio | PASS |
| D-03 | approvedAt do Perfil vigente, sem documento ou updatedAt da Pessoa; browser diferencia14/10 da data cadastral15/10 | PASS |
| D-04 | Todos/Todas em cada seletor, cargos originais, limpeza global incluindo situação/busca; browser reversão de área/cargo e situação all | PASS |
| P-01 | colunas/fallbacks operacionais removidos conforme acordo; writers/IA/Knowledge/permissões inalterados; diff revisado,25Node dirigidos e CI obrigatório | PASS |

17checks de smoke PASS (13HTTP e4bundle): SHA/versão/coluna/fallback, rotas/importação/manual, assets novos e entry anterior. O script de deploy recebeu404 na troca do container; após estabilização todos retornam200, sem rebuild adicional. Uma expectativa do smoke usava aspas duplas; o minificador emite template literal. Corrigido o teste da string, sem alterar runtime.

Containerwebf10e33e5366a running/0, imagemsha256:b15f9259cc9ce2323ea9ce5a7212c8a496e6b89aa5772f128da38f15985a1103. Rollbackprisma-web:rollback-before-40b451341aab preserva sha256:a96ee1a0198c928e15559be7764dd07c5d630355ad1aa839dd0d47fb2b67ab0f. Parser e8bc778c8c00, gateway8fb76416f61c, synthesisdb6c5c0ef238, mailb257a83cbb37 e Traefik5e25fdc6d2e6 mantêm IDs. Sem escrita em Pessoa real, consumo de IA ou reprocessamento. Fluxo autenticado real NOT TESTED; evidência de UI é sintética e smoke produtivo é público. Nenhum desvio de contrato identificado; sem afirmação de acurácia das áreas.

Tempos decorridos por intervalos UTC, sem somar jobs sobrepostos: preparação/implementação01:59:14–02:03:03=3m49s; validação/evidências/preparação release02:03:03–02:08:14=5m11s; integração/CI/correção da expectativa de versão02:08:14–02:12:00=3m46s; deploy/smoke02:12:00–02:13:30=1m30s. Fechamento documental/sincronização começa02:13:30, término reportado na conversa após CI. Soma até smoke14m16s. Clock da ferramenta é a referência; timestamps dos hosts podem divergir em segundos.

Melhorias de desempenho identificadas: atualizar teste de versão no mesmo passo do registro teria evitado uma rodada de CI; reutilizar bootstrap sintético com nome correto da variável e seletores acessíveis teria evitado duas esperas de timeout; preparar verificações de release antes do primeiro push reduz retrabalho. CI branch/main já paralelos, validação local dirigida e nenhum rebuild por404. Não foi retirado nenhum gate para reduzir tempo. Fechamento documental não exige novo runtime.
