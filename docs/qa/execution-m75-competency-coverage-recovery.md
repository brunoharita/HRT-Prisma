# Prompt de Execução — M7.5 Recuperação de cobertura de competências

Implemente integralmente o contrato `docs/qa/agreement-m75-competency-coverage-recovery.md` versão 1.0.0, aprovado sobre o baseline `080a4067d14e7e71d3147ad10962bd195d74d874`.

## Entendimento obrigatório

- Implementar D-01 a D-10 e provar CA-01 a CA-07.
- Impedir P-01 a P-07 com testes negativos.
- Preservar F-01 a F-04.
- Usar A-01 a A-04 somente para o como; nenhuma autonomia cria equivalência ou aprovação humana.

## Sequência

1. Versionar a projeção aditiva e preservar RPCs anteriores.
2. Separar resultado-base da tentativa mais recente e calcular métricas de cobertura.
3. Isolar o orçamento de normalização no backend e manter configuração fail-closed.
4. Agrupar pendências e pesquisar as expressões versionadas sem seleção automática.
5. Validar localmente, comparar visualmente e revisar diff/segurança.
6. Aplicar migration/Edge/frontend na ordem segura, reprocessar, medir e executar smoke.
7. Atualizar owners, ADR, Context Pack e AoT; sincronizar branch, main, origin e VPS.

## Fechamento

Não declarar conclusão se uma execução falha reduzir cobertura, se parcial for promovido automaticamente, se decisão humana for fabricada ou se cobertura/rollout não tiver evidência. Relatar separadamente implementação pronta, decisões humanas ainda pendentes e cobertura efetivamente observada.
