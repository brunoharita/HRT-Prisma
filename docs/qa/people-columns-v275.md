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
