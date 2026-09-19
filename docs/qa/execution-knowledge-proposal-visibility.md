# Execução — Visibilidade de propostas da Knowledge

Contrato: `docs/qa/agreement-knowledge-proposal-visibility.md` 1.0.0.

## Escopo entendido

- Implementar D-01 a D-03 no filtro cliente do dashboard e no card da proposta.
- Impedir P-01 a P-03: filtro explícito por empresa ativa; nenhuma escrita, migration, RPC ou RLS.
- Preservar F-01 e F-02.
- A-01 permite uma função pura compartilhada e teste direcionado.

## Ordem

1. Extrair e testar a regra de visibilidade por escopo e organização ativa.
2. Aplicar a regra ao carregamento da Knowledge e mostrar o alcance no card.
3. Atualizar owner docs, Context Pack e AoT.
4. Executar typecheck web, testes direcionados e build web; revisar diff e publicar somente web/Git.
