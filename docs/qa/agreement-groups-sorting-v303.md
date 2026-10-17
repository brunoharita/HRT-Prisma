# Ordenação de grupos e empresas — acordo e execução1.0.0

Bruno determinou no chat17/10/2026: ordenar por nomes dos grupos, criação e atualização, herdando a ordenação nas empresas do grupo. Implementação autorizada como continuidade da página aprovada. Baseline660375176946c8f52921817239f59fe340c16acc/runtime3.0.2 fe551500502ab478e7c439594488a4e935cbfdd4. Entrega3.0.3.

- D-01: seletor Ordenar por com Nome, Data de criação e Data de atualização, e controle de direção crescente/decrescente; padrão Nome A–Z. Aplicar o mesmo critério/direção aos grupos e às empresas de cada grupo, usando o nome/datas próprios de cada registro; Principal continua identificado, sem prioridade artificial. Empates determinísticos por nome/ID.
- D-02: usar created_at/updated_at já persistidos, sem inventar/retroagir datas ou usar posição da lista/revisão como data; indisponíveis ficam por último em ambas as direções e explicitamente indisponíveis quando apresentados. Critério de data mostra a data de referência no resumo/empresa para compreensão. Atualização é do registro, sem propagar automaticamente data de uma empresa ao grupo.
- D-UX-01: preservar arquitetura de grupos recolhíveis da proposta2 e imagem do pedido (referência de composição existente, conteúdo ilustrativo); controles junto à busca, reflow no celular. Busca e refresh mantêm ordenação; grupo aberto preservado por ID quando disponível; escolher ordenação não grava dados.
- P-01: não ampliar autoridade, escopos, campos sensíveis, acesso comum, grants ou RLS; consulta mantém exatamente os mesmos filtros. Mutação, locks/revisões, limites, Owner3.0.1, vínculos e auditoria permanecem intactos.
- P-02: não reescrever migrations/histórico nem exigir atualização imediata de abas3.0.2: contrato1.1.0 aditivo com aceitação explícita1.0.0; sem novo fornecedor/dependência.
- F-01: busca global, paginação nova, filtros de período, mudanças de cadastro/perfis/planos, ordenação em outras páginas, agregação de datas e correção retroativa de histórico.
- A-01: detalhes acessíveis de controle, formatação pt-BR, ordenação local sobre escopo já autorizado, método de extensão compatível da consulta e fixtures delegados à engenharia. Reutilizar AntD, Intl e timestamps existentes.
- CA-01: testes dos três critérios/duas direções, acentos, empates, datas ausentes/inválidas, herança e imutabilidade; browser desktop/mobile com teclado/busca/refresh/mesmo grupo aberto e nenhum overflow/gravação implícita.
- CA-02: PostgreSQL17 local com a função real, datas reais/updated_at e quatro perfis, contrato anterior/novo/desconhecido, grants e corpo da função preservado fora de3substituições explícitas; regressão da administração existente. Conferência antes/depois de produção sem alterar cadastros reais para testes.
- CA-03: tipos/build/checks/contexto/CI e publicação somente migration nova e web, smoke/rollback/sincronização; sem Edge ou outros serviços. AoT documenta evidência/limites.

## Mapa de impacto / mínimo suficiente

| Área | Relação | Baseline e prova |
| --- | --- | --- |
| Página/busca/disclosure/ordenação | direct |3.0.2; testes comparador e browser três critérios/direções em1448/390/320 |
| Consulta administrativa/datas/contrato | direct |1.0.0, timestamps existentes; migração aditiva1.1.0 e SQL real |
| Autorização/escopo | critical_transversal | Ator/filters/ACL/search_path atuais; negativos SQL e perfis/browser |
| Mutação/Owner/vínculos/planos | plausible_indirect | Mesmo corpo SQL fora de três substituições; suíte SQL administração/Owner e browser existente |
| Histórico/dados/updated_at | plausible_indirect | Triggers existentes preservados; nenhuma escrita de dados pela migration; leitura metadata antes/depois |
| Knowledge/talentos/Tokens/Edge/serviços | no_impact_identified | Projeção administrativa e sort local; handlers e serviços alheios inalterados, plano seletivo |

Sem Q material pendente. Execução incorpora integralmente D/P/F/A e CA acima. ClasseD pelo SQL privilegiado, sem nova arquitetura/ADR. Encerrar com provas obrigatórias, publicação autorizada, smoke e CI; sem validate integral local nem jornada humana fictícia de produção.
