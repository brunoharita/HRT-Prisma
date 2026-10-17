# Grupos recolhíveis — acordo e execução 1.0.0

Proposta 2 aprovada por Bruno no chat em 17/10/2026, com autorização de implementação. Referência normativa: painel 2 de `C:/Users/Bruno/.codex/visualizations/2026/10/17/01a147ba-ca8a-7571-865b-c51585226df0/propostas-grupos-empresas.html`; nomes, pessoas e contagens são exemplos. Cópia imutável no movimento: `docs/qa/evidence/groups-accordion-v302/reference.html`, SHA256 `2ed202bcf248b45153d9ea44f36f267036f2e591559b62c418b88a376773e9f7`. Baseline Git43e70d360980e446dca577bcbbd20aa6602b54ff, runtime3.0.1/aa580ac515083df5098280e86dc5f3146308df41. Entrega3.0.2.

- D-UX-01: grupos separados por espaço e borda, resumo com nome, plano, capacidade, empresas ativas e situação; primeiro grupo aberto inicialmente, no máximo um aberto, permitindo recolher todos. Teclado e foco visíveis.
- D-UX-02: detalhes com ações no topo direito, metadados, orientação compacta de preparação e tabela de empresas. Preservar Owner pendente, limites e suas explicações, Principal, Editar, Acessos e Cadastrar Owner contextual.
- D-UX-03: manter cabeçalho e busca por grupo/empresa; busca revela o primeiro resultado, sem mutação; atualização preserva o grupo aberto. Em até580px empresas viram blocos com nome, situação, usuários e ações, sem perda de conteúdo ou overflow.
- P-01: nenhuma mudança em autoridade, perfis, escopos, planos, capacidade, cobrança, dados, backend, contratos persistidos ou cadastro Owner3.0.1. Abrir, buscar e recolher não gravam dados.
- F-01: outras páginas, novas funcionalidades de administração, dependências, migrations/Edge e redesign global.
- A-UX-01: reutilizar HTML acessível, componentes AntD e tokens existentes; detalhes de espaçamento, cores neutras e labels acessíveis delegados. Preservar sistema visual Prisma; sem fornecedor ou biblioteca nova.
- CA-01: browser determinístico desktop1448/1024 e mobile390/320, abertura exclusiva/recolhimento/teclado/busca/refresh/sem overflow; comparação visual com os mesmos dados/viewport da referência.
- CA-02: regressão dos quatro perfis, criação explícita, limites, modal/rascunho/erro, vínculos, rota Owner contextual e ausência de mutações por disclosure. Tipos/build e testes dirigidos; CI obrigatória.
- CA-03: documentação/contexto, versão3.0.2, publicação apenas web e smoke público de rotas/assets/SHA, rollback e sincronização; sem criar dados reais em produção.

## Mapa de impacto e fechamento

| Capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| Listagem, busca, disclosure e apresentação responsiva | direct | Cards atuais baseline acima; browser, medidas e screenshots pareadas |
| Editor e vínculos, atualização e CTA Owner | plausible_indirect | Handlers mantidos; regressão sintética com serviço determinístico e rota contextual |
| Autorização / tenant | critical_transversal | Mesmos serviços, filtros e condições de ações; quatro perfis no browser, diff sem backend; não revalidar RLS inalterada |
| Versão / release | direct | Registro/teste, tipos/build/contexto/CI e plano seletivo web |
| Knowledge, talentos, Tokens, Auth persistida, banco/Edge | no_impact_identified | CSS local e disclosure não mudam handlers nem serviços; conferir diff e destinos, sem acessar/publicar esses ambientes |

Execução incorpora integralmente D/P/F/A e CA acima, sem Q material pendente. Não executar suíte integral local. Fechar quando critérios obrigatórios PASS, publicação/smoke/sincronização e AoT com limites; produção autenticada com dados humanos não será simulada como prova real.
