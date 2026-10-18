# Coerência tipográfica nas telas do Prisma, versão 3.1.1

## Acordo e execução

Autorização: Bruno aprovou corrigir todos os pontos da revisão tipográfica, preservar densidade e funcionalidades, integrar em main e publicar sem alterar a versão. Referência: `prisma-ux-foundation-1.5.0`, `docs/product/ux-foundation.md`, acordo e execução da padronização visual v2.8.0. Baseline de código: `bc736bc67a9561a9cf62de96c0b3b9e2f1360339`.

- **D-01:** corrigir os textos pequenos do contexto de documentos e formação na Pessoa: metadados/legendas 14/20, informação principal 16/24.
- **D-02:** normalizar rótulos da busca de profissionais para 14/20/400.
- **D-03:** normalizar cabeçalhos das tabelas de verificações, usuários, empresas, comparação contextual e avaliações para 14/20/600.
- **D-04:** corrigir explicações de capacidade/preparação de grupos para 14/20 e manter metadados compactos válidos.
- **D-05:** seções do cadastro de usuário/Owner 20/28/600; rótulos dos formulários de usuário e Pessoa 14/20/400; metadados laterais de Pessoa 14/20.
- **D-06:** seções do resumo do Perfil e detalhe da Posição com peso 600, preservando níveis, destaques e composição.
- **D-07:** seções do Perfil completo/comparação/versões 20/28/600; títulos de registros 16/24/600; metadados de versões 14/20 e ênfase 600.
- **D-08:** comparação contextual: títulos principais 24/32/600, preservando composição e indicadores.
- **D-09:** subtítulos de configuração de avaliações 20/28/600; instruções e título do cartão de questão no portal 20/28/600.
- **D-10:** rótulos de login 14/20/400; legenda de requisitos mínimos 14/20/600; continuar na Home e identificação das tarefas com peso 600.
- **D-11:** preservar densidade, topologia, funcionalidades, família de fonte, cores, permissões e adaptação responsiva; manter versão 3.1.1.
- **P-01:** não normalizar indiscriminadamente Pessoas (14/12), Kanban (16/14), indicadores, enunciados ampliados ou metadados compactos permitidos.
- **P-02:** não alterar autenticação, regras, contratos persistidos, IA, dados ou backend; não acionar IA nem modificar dados reais durante validação.
- **F-01:** novo desenho, novas funcionalidades e correções adjacentes não aprovadas.
- **A-01:** seletores, reutilização dos tokens e remoção de declarações locais conflitantes, sem nova dependência.
- **CA-01:** estilos computados nas telas/estados afetados em desktop e celular; comparação com o baseline nos mesmos dados e viewport; prova de preservação de padding, família, cores e controles; screenshots identificáveis.
- **CA-02:** typecheck/build web, lint/contexto, CI; plano seletivo, publicação somente web, smoke público, rollback disponível e sincronização de fonte.

Este documento reúne o acordo já aprovado, o escopo de execução e seu AoT. Não há decisão de produto pendente. A execução implementa D-01 a D-11, impede P-01/P-02, exclui F-01 e usa A-01 exclusivamente na implementação visual.

## Mapa de impacto e preservação

| Relação | Áreas | Capacidades e evidência mínima |
| --- | --- | --- |
| direct | Pessoa/documentos/formação; busca; verificações; usuários/Owner; grupos; formulários; Perfis/comparações/versões; Posição; avaliações/portal; login; Home | Estilos computados, mesmos fixtures/estados em 1448 e 390 px; amostra de 320 px; navegação, filtros e controles nos fluxos afetados. |
| plausible_indirect | Demais consumidores dos seletores compartilhados de Perfil, tabela e cartões | Inventário de usos e regras com escopo limitado; comparação de controles já conformes em Pessoas, Kanban, documentos, Knowledge e Tokens. |
| critical_transversal | Navegação responsiva, bloqueios Owner, feedback de senha e controles de avaliação | Interações sintéticas locais; nenhum envio real. Smoke das rotas e assets publicados. |
| no_impact_identified | Backend, RLS, banco, Auth, extração, matching e decisões humanas | Diff limitado a apresentação/documentação; plano de release sem migrações/Edge Functions/serviços. Nenhuma alteração de handlers ou contratos persistidos. |

Baseline operacional e resultados serão registrados nas evidências deste movimento. Aumento natural por quebra de linha de textos antes ilegíveis será distinguido de alteração de padding ou desenho; não se reduz texto para forçar altura idêntica.

## AoT

| IDs | Implementação e evidência local | Estado |
| --- | --- | --- |
| D-01 | Contexto do documento, cartões de fonte, formação, legendas e próxima ação em `styles.css`; papéis computados e screenshots. | PASS |
| D-02 | Rótulos da busca 14/20/400 e vínculo atual 14/20; desktop/celular. | PASS |
| D-03 / D-04 | Cabeçalhos 14/20/600 nos escopos existentes; explicações de grupos 14/20; metadados compactos de 13 px mantidos. | PASS |
| D-05 / D-10 | Seções de usuário 20/28/600, rótulos 14/20/400, checklist 14/20/600, login e Home; bloqueios e reação da senha conferidos. | PASS |
| D-06 / D-07 / D-08 | Pesos e hierarquia do Perfil/Posição/comparações, títulos canônicos e metadados; destaques ampliados mantidos. | PASS |
| D-09 | Subtítulos/configuração, instruções e cartão de questão; enunciado ampliado preservado. | PASS |
| D-11 / CA-01 | Mesmo conteúdo/estado/viewports em 52 pares; mais 10 estados em 320 px. Padding, gap, família, cores e controles preservados. Pessoas, Kanban, Conhecimento, Tokens e documento operacional usados como controles de preservação. | PASS local |
| P-01 / P-02 / F-01 | Sete arquivos CSS como único diff de runtime; sem handlers, dependências, escritores, autenticação, schema ou IA. Registro de versão intacto. | PASS |
| CA-02 | Tipos, build final web, lint e contexto aprovados no snapshot exato de arquivos rastreados. Publicação/CI/smoke/sincronização ainda pendentes. | PARTIAL |

Evidência: `docs/qa/evidence/typography-v311/`, com `before.json`, `after.json`, `after-checks.json`, `metadata-checks.json`, `protected-checks.json`, `local-summary.json` e capturas em `before/` e `after/`. Scripts temporários em `tmp/typography-v311/` reutilizam os fixtures reais de UI existentes e os adaptadores sintéticos da auditoria. Fontes estabilizadas antes das capturas; refinamento posterior limitado aos mesmos componentes de Perfil/documento foi revalidado nas superfícies afetadas.

### Densidade e limites

Nenhum padding, gap, grid, margem, breakpoint ou handler foi alterado. As tabelas e cartões usados como controles conservaram tipografia e geometria. Nos textos antes de 10–12 px, a escala legível pode gerar novas linhas e maior altura natural do conteúdo. Não foram adicionados espaços artificiais nem reduzida informação para congelar uma altura anterior. Família, cores, ícones, estados e composição permanecem.

O baseline usa 1448/390 px. Os 320 px são uma amostra adicional de responsividade, sem comparação anterior naquela largura. As evidências são sintéticas locais; não provam uma jornada humana autenticada em produção. Não houve banco remoto, IA paga, envio de convite ou alteração de dados reais. Falhas iniciais de seletor virtual do Ant Select, horário variável do fixture e espera pela atualização React foram corrigidas no harness, sem mudança de produto. Avisos de API deprecated/keys sintéticas são preexistentes no fixture.

Sem desvio de produto ou ampliação funcional. Estado operacional e CI serão registrados após publicação.
