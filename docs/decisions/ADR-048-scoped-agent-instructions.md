# ADR-048: Instruções com escopo e fidelidade por referência

- Status: accepted
- Date: 2026-09-11
- Owners: Product Owner and engineering
- Authority: aprovação explícita de Bruno para aplicar as alterações sugeridas na auditoria de instruções, nesta tarefa.

## Context and decision

Instruções misturavam fatos históricos com regras, leitura obrigatória com consulta temática e evidência operacional com autoridade de produto. A revisão preserva as decisões e remove essas ambiguidades.

- `AGENTS.md` contém regras duráveis; owners e referências mantêm detalhes consultados conforme a tarefa. Estado operacional comprova o que existe, não revoga uma decisão de produto.
- Auditoria ou discussão gerencial não autoriza implementação. Pedido de implementação autoriza seu escopo; alternativa material nova continua exigindo decisão.
- Contratos aprovados podem ser incorporados integralmente por caminho e versão/revisão imutável. O agente deve lê-los e preservar todos os IDs, proibições e aceites; referência não autoriza resumo seletivo. Correção que apenas restaura acordo existente registra seu delta, sem renegociar o produto.
- Evidência opcional indisponível não bloqueia caminho manual permitido. Autoridade, tenant, segurança e validade da mutação continuam fail-closed.
- A regra de interação da ADR-030 elimina coordenação redundante, não navegação/busca/exploração voluntárias úteis. Publicação, acesso e demais decisões humanas permanecem explícitos. A versão de runtime 1.0.0 não muda.
- Templates começam sem resultados presumidos; status e ambiente são campos separados. Documentação não comprova ativação.
- O prompt histórico de redesign permanece recuperável na revisão Git `7cfd22bc963c2abc49d9242156c7f53c9c799778`; a consolidação editorial 2.0.0 não inicia um novo redesign nem substitui decisões posteriores.

## Alternatives and consequences

Manter instruções extensas e repetidas preservaria ambiguidades; remover detalhes sem referência perderia requisitos. A solução mantém conteúdo histórico e referências verificáveis, reduzindo leitura obrigatória. Exige disciplina de versão, atualização dos owners e validação dos links. Alterações futuras de skills fornecidas por terceiros exigem revisão das cópias pessoais, não sobrescrita automática.

## Evidence and rollout

Entrega de instruções/documentação apenas. Contrato, matriz dos 32 achados, validações e limites: `docs/qa/instruction-audit-20260911.md`. Nenhum código de produto, migração, prompt de runtime ou ambiente remoto é alterado por esta decisão. Não há alegação de ganho medido entre modelos.
