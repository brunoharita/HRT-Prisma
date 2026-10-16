# Processos e Conhecimento: ordem de navegação2.7.7

Aprovado por Bruno na conversa, baselinefd924ef. Classe B, duas alterações de apresentação sem nova regra de negócio.

- D-01 Processos seletivos inicia em Em andamento quando não há escolha lembrada; ordem Em andamento, Encerrados, Todos. Manter filtros disponíveis, contagens, busca, paginação e acesso direto a encerrados. Novo processo retorna ao filtro Em andamento.
- D-02 Conhecimento exibe Visão Geral primeiro, Áreas profissionais em seguida, nas bases global e local. Manter aba ativa/links diretos e demais abas.
- P-01 não alterar status/resultados de processos, ocupação de Posições, dados, permissões, IA ou curadoria.
- F-01 redesign, filtros novos, migração de preferências explícitas e backend.
- A-01 reutilizar Segmented/Tabs/useViewState; versão2.7.7 e publicação somente web.
- Q nenhuma. Screenshots são contraprovas; a ordem textual aprovada é normativa. Topologia/ações/responsividade permanecem.
- CA-01 browser1448/390 comprova seleção inicial/ordem/filtros/zero ativos/deep link, ordem Conhecimento global/local, navegação e zero escrita não solicitada; tipos/build web, versão, CI e smoke seletivo.

Execução implementa D-01..02, impede P-01 e respeita F-01/A-01. Não reinicializar preferência explicitamente escolhida pelo usuário ao navegar.

## GOV-01

| Capacidade | Relação | Baseline/preservação/prova |
| --- | --- | --- |
| Processos/filtro e Conhecimento/abas | direct | 2.7.6; browser dirigido ordem/seleção/filtros |
| Processo selecionado/busca/curadoria | plausible_indirect | IDs e keys inalterados; deep link encerrado e abas acessíveis |
| Auth/dados/IA/Posições/resultados | no_impact_identified | sem alteração de domínio/serviços/writers; negativas de rota e contrato existentes |
| Hospedagem/rollover | critical_transversal | web apenas; SHA/versão/assets antigos/rollback e serviços |

Validação mínima: cenários browser acima, testes versão/contrato/rotas, tipos/build web, lint/contexto e CI obrigatório; sem suíte integral local. AoT inicial NOT TESTED, evidência e publicação serão consolidadas aqui.

## AoT local

D-01/D-02/P-01 PASS:32assertivas browser1448/390 (ordem/default ativo, Encerrados/Todos, escolha lembrada, criação volta a ativo, deep link encerrado, zero ativos sem fallback, abas global/local e zero erro).14testes versão/contrato/rotas PASS, incluindo negativas de tenant/role/contrato e separação de resultados. Tipos/build web e lint PASS; escopo revisado restrito a defaults/ordem, IDs e serviços intactos. Screenshots em evidence/navigation-defaults-v277. O teste móvel retorna à lista pelo botão da interface antes de verificar a opção lembrada, respeitando a navegação sequencial existente. As tentativas anteriores de consultar controles ocultos foram falhas do teste; não houve correção de produto motivada por elas.

QA sintético local; única escrita da fixture foi criação explícita autorizada pelo cenário, sem fechamento/resultado fictício em produção. CI/publicação/smoke ainda pendentes. Não equivale a validação autenticada real.
