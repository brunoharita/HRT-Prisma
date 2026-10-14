# Acordo e AoT — economia de execução 1.3.3

Autoridade: pedido explícito de Bruno em 13/10/2026 para inserir os aprendizados na memória persistente e em AGENTS.md. Baseline: main 1aea6294e994b215bf27ddb2e15dfe8bc0dce553; sem alterações rastreadas pendentes. Classe A documental; sem novo contrato de produto ou ADR.

## Acordo, impacto e preservação

- D-01: registrar regras operacionais em AGENTS.md seção 8 e versionar instruções em 1.3.3.
- D-02: registrar uma nota pequena na extensão autorizada de memória; não editar MEMORY.md nem o resumo gerado.
- D-03: manter o contexto documental sincronizado e validar apenas as superfícies documentais afetadas.
- P-01: não retirar gates, proteção de dados, critérios de aceite ou autoridade; não publicar drafts alheios.
- F-01: código, banco, runtime, nova funcionalidade, alteração de CI e prazo fixo de entrega.
- A-01: redação e organização dos registros, reutilizando o processo existente. Sem pendência material.
- Mapa: AGENTS e nota de memória direct; contexto/exportações plausible_indirect; autoridade e validação critical_transversal preservadas por leitura do diff; runtime no_impact_identified por plano documental sem fonte executável alterada. Regressão: diff, contexto e teste dirigido do gerador; sem testes de produto ou rebuild.

## Implementação, teste e evidência

| Requisito | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01 | AGENTS.md seção 8; instruções 1.3.3 | Leitura do diff e conferência de versão/arquivo/whitespace | PASS |
| D-02 | C:/Users/Bruno/.codex/memories/extensions/ad_hoc/notes/2026-10-13T23-05-44-prisma-economia-execucao.md | Arquivo relido e validado; nenhuma edição da memória gerada | PASS |
| D-03 | PRISMA_CURRENT_STATE.md 2.74.11 e exports gerados | Snapshot rastreado: gerador/checker aprovados e 3 testes de prismaContext PASS | PASS |
| P-01/F-01 | Gates mantidos; nenhum código ou draft alheio incluído | Diff e plano: somente documentation/context-pack/generated-context | PASS |

SHA e CI são confirmados no encerramento operacional. Sem desvio do acordo, mudança de produto, rebuild ou destino de produção adicional. Evidência documental exige somente checks documentais; CI automático existente não é retirado.
