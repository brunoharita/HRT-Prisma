# ADR-050: Base compartilhada de UX e continuidade de navegação

- Status: accepted
- Data: 2026-09-13
- Owners: product-engineering
- Autoridade: aprovação explícita de Bruno registrada em `docs/qa/agreement-ux-foundation.md` 1.0.0.

## Contexto

A auditoria identificou navegação por módulos técnicos, diferenças visuais entre áreas, perda de contexto ao voltar e mensagens sem distinção entre ausência e erro. Os grupos 3, 15, 16, 17 e 18 orientam uma base para os próximos movimentos específicos.

## Decisão

Estender a base Prisma/Ant Design da ADR-007. Manter sidebar, marca, utilidades inferiores e autorização existente. Agrupar capacidades entregues em Operação, Curadoria e Administração; usar Posições na interface. Preservar URLs e contratos legados. Matching continua acessível por necessidades de verificação; deixar de anunciá-lo como módulo independente não elimina suas rotas.

Adicionar componentes compartilhados de estados, métricas, divulgação progressiva e identidade pública. Adotar locale pt-BR e CSS de composição responsiva sobre os componentes existentes, sem nova biblioteca nem alteração de geometria de evidências.

Centralizar navegação interna, histórico, foco e proteção de edição. Guardas de alterações usam diálogo Ant Design; recarregamento/fechamento usa o aviso nativo de `beforeunload`. Navegação limpa não exige confirmação. Guardas não substituem confirmação de domínio nem autorização.

Guardar filtros, seleção, paginação e abas integradas somente em memória, limitados a sessão autenticada, identidade, papel e empresa. Limpar ao desmontar esse contexto. Rolagem usa mapa temporário, descartado na troca de contexto. Nenhum registro profissional, resposta, currículo, contato ou credencial entra nesse armazenamento. O rascunho de posição já existente em sessionStorage recebe chave por contexto autenticado; o formato de domínio não muda. O rascunho legado sem contexto não é reutilizado. Recarregar a página reinicia o cache de navegação; o rascunho de posição mantém sua recuperação dentro da mesma sessão e empresa.

## Alternativas e consequências

- **Reutilizar Prisma/Ant Design:** escolhido; integra comportamento e aparência já aprovados, sem licença, custo ou dependência nova. Implementação interna restrita à composição e continuidade específicas do Prisma.
- **Adicionar outra biblioteca visual/roteador:** sem lacuna que justifique custo, migração e duplicação neste movimento.
- **Persistir filtros/seleções globais no navegador:** rejeitado; mistura contexto entre acessos e amplia retenção. Memória exige refazer a busca após recarga completa, limitação intencional.
- **Redesenhar todos os grupos específicos agora:** fora do escopo aprovado para esta etapa; base e integrações representativas são entregues primeiro.

Edição em vários componentes exige regressão dirigida de retorno, cancelamento, casos ausentes e contratos afetados. Comparação continua limitada a duas escolhas explícitas. A definição de uma verificação só é pré-selecionada quando há uma opção compatível única; nenhuma ausência de ID abre outro registro.

## Validação e rollback

Rastreabilidade e prova em `docs/qa/aot-ux-foundation.md`. Rollback por reversão do commit desta entrega, sem migration ou mudança de dados. Chaves novas de rascunho ficam isoladas e não alteram registros persistidos. Implementação local e push não representam implantação em QA hospedado ou produção.
