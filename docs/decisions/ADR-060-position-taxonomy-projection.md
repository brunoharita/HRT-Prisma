# ADR-060: Taxonomia de Posições como projeção versionada da Knowledge existente

- Status: accepted (escopo autorizado pelo acordo M7.1; implementação e prova locais)
- Date: 2026-09-18
- Owners: product, engineering, security
- Agreement: `docs/qa/agreement-m71-position-taxonomy.md` 1.0.0 e execução integral referenciada.

## Context / Problem

A UI de Posições usa `vacancies` e `vacancy_versions`, não um novo cadastro. Já existem conceitos, termos, relações, mappings, reconciliação aprovada, overlay Organization e Inbox. A inspeção read-only confirmou CBO, ESCO e O*NET correntes/publicados, mas nenhuma reconciliação ocupacional aprovada no remoto. Os mocks não provam equivalência. O gate anterior de referência obrigatória e sua etapa de IA divergem do fluxo explicitamente autorizado no M7.1.

## Decision

Projetar a Knowledge aprovada sob demanda, sem nova ontologia/tabela: correspondência exata inequívoca de termos, precedência pelo escopo do termo Organization > Global e vínculo oficial publicado/corrente para conceitos globais. Substring serve apenas à seleção humana. Alias ambíguo não resolve automaticamente. Reconciliações aprovadas conectam identidades; rótulos parecidos não. Todas as fontes sustentadas permanecem, com métricas originais.

`position-taxonomy-1.0.0` é salvo atomicamente em `vacancy_versions.taxonomy_snapshot` por `save_position_taxonomy`, que reutiliza a RPC vigente de definição e de estrutura. `vacancy-definition-1.3.0` é aditivo: metadados não entram no score. O servidor recompõe proveniência; não confia na prévia do navegador. Comparação de versão esperada evita sobrescrever edição concorrente.

Estados: resolved, ambiguous, unresolved. Título é preservado literalmente. Uma escolha/remoção humana persiste ao editar o título até ação explícita de reavaliar/corrigir; novas decisões são versionadas. Sem associação, o operador pode salvar manualmente e alimentar a Inbox do tenant. Não há confirmação extra para associação automática segura.

Sugestões não geram requisitos. Botões obrigatório/desejável usam o requisito existente. `taxonomy_origin` guarda a origem, inclusive após desassociar a ocupação. Complementos são conceitos Organization existentes ou criação explícita por administrador por Inbox/proposta/aprovação. Associação de complemento e seleção de requisito são ações distintas. A proposta original é preservada; o payload decidido omite somente o alias duplicado do próprio canônico, com auditoria. Nenhuma correção promove Global.

## Alternatives considered / Reasons

- Reuso de Knowledge + RPCs existentes: escolhido; já cobre identidade, curadoria, tenant e histórico.
- Resolver M5.4.4 com IA/web: preservado como legado, não acionado pelo novo fluxo; ampliar IA/fontes é proibido pelo acordo.
- Nova ontologia/tabela/importação em massa: rejeitada por duplicar fundação e publicação.
- Grupos de software hardcoded e equivalência textual entre fontes: rejeitados; agrupamento deriva dos tipos reais publicados.

Não foi necessária pesquisa externa, biblioteca, provider ou tecnologia nova. A autonomia A-* cobre a extensão aditiva, sem nova decisão de produto.

## Consequences / Risks / Mitigation

Limitação consciente: sem alias inequívoco ou reconciliação aprovada não há consolidação automática, mesmo que títulos pareçam próximos. CBO publicada fornece família ocupacional; não inventamos skills. A classificação ESCO publicada permanece knowledge, sem reclassificar silenciosamente a fonte. Payloads versionados crescem conforme as relações da ocupação; consultas são por ocupação, busca paginada e histórico carregado sob demanda. Operador mantém preenchimento em erros, pode tentar novamente e corrigir/desfazer. Falha de auditoria transacional bloqueia o salvamento, nunca finge sucesso.

## Technical / Data impact

Migration `20260918010000_m71_position_taxonomy.sql`: duas colunas opcionais, checks, helpers privados e quatro RPCs públicas. Não há backfill, tabela paralela, publicação massiva nem alteração destrutiva. Componentes Prisma/Ant Design e RPCs Supabase existentes. Preview sem mutação; save recompõe fontes correntes e grava ledger por versão. Instante/ator da decisão humana anterior é distinto do autor do salvamento se a decisão foi mantida.

## Security and LGPD / AI impact

Owner/Admin/Recruiter no tenant podem editar Posições; Super Admin mantém seu acesso prévio; tenant deve existir. Só Owner/Admin/Super Admin criam Knowledge. Membros/anon/inativos/outro tenant não ganham autoridade. Helpers sem grant público, `security definer` com `search_path=''`, snapshot atrás da RLS vigente, referências/itens de outro tenant rejeitados. Sem PII de currículo, segredo, LLM, embeddings ou Web no M7.1. O Assistente de mercado já existente não foi modificado nem incorporado à taxonomia.

## Compatibility / Rollback

NULL identifica versão histórica sem M7.1, não insuficiência profissional. Contrato futuro/inválido falha fechado; matching 5.0.0, score 1.2.0 e M6.2 permanecem. Rollback de ativação: frontend anterior e revogar as quatro RPCs novas por migration controlada; conservar colunas/snapshots para leitura e auditoria. Não apagar versões nem rebaixar dados. Aplicar migration antes de disponibilizar o frontend novo; não fazer deploy parcial.

## Validation / Review / Replacement

AoT `docs/qa/aot-m71-position-taxonomy.md`: PostgreSQL 17 descartável com RLS real das migrations, fixtures sintéticas e identificadores oficiais versionados; unitários, regressão e componente real no navegador. Nenhuma migration/deploy remoto nesta entrega. Revisar se volume real mostrar gargalo, novos mappings exigirem semântica não representada ou PO autorizar fonte/provider novo. Mudança de semântica requer novo acordo e versão, não extensão silenciosa.

## References / Change history

ADRs 013, 032, 036–040, 043, 050 e 057; owners de Knowledge/Posições/segurança. 2026-09-18: decisão derivada do acordo executada localmente.
