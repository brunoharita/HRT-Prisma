# AoT — M7.5 Recuperação de cobertura de competências

Contrato: `agreement-m75-competency-coverage-recovery.md` 1.0.0. Prompt: `execution-m75-competency-coverage-recovery.md`. Baseline: `080a4067d14e7e71d3147ad10962bd195d74d874`.

## Matriz

| IDs | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-01, D-02, D-04 | RPC V5 usa último `complete`; `latestAttempt` e `coverage` são separados; retry não sobrescreve resultado | PostgreSQL descartável: execução completa + falha `BUDGET_LIMITED`; V5 preserva associações e expõe falha | PASS |
| D-03 | reserva V2 conta somente normalização; variáveis dedicadas 20/dia e 200/mês | Deno 3/3; SQL prova zero/esgotamento/race; Edge Function v16 ativa | PASS |
| D-05, D-06, D-07, D-08 | agrupamento por termo, `searchTerms` deduplicados, nenhuma seleção automática; alias/proposta reutilizam fluxo transacional vigente | testes de domínio 16/16 no recorte; fixture desktop/mobile; QA SQL de alias, proposta e autorização | PASS |
| D-09 | lote service-only idempotente para todos os Perfis aprovados vigentes | 7/7 concluídos; hashes dos 7 snapshots inalterados; 6 chamadas, 3.002 tokens de entrada e 4.992 de saída | PASS |
| D-10 | contratos, ADR, versão v1.7.6, owner docs e Context Pack atualizados | runtime `9b747a9` integrado em main/GitHub/VPS; frontend e smoke autenticado confirmados | PASS |

## Proibições

| IDs | Prova negativa | Status |
| --- | --- | --- |
| P-01, P-02, P-07 | parcial/ambíguo não é pré-selecionado; somente alias humano resolve; proposta permanece pendente | PASS |
| P-03 | hashes de `profile_data` idênticos antes/depois nos 7 Perfis; histórico completo preservado | PASS |
| P-04 | RPCs cliente guardadas; orçamento/lote service-only; outsider e anon rejeitados no PostgreSQL real | PASS |
| P-05 | limites positivos server-side; zero/esgotamento fail-closed | PASS |
| P-06 | nenhuma dependência, fonte, embedding, provider ou modelo novo | PASS |

## Fidelidade visual

Referências normativas M7.2/M7.4. Fixture sintética `tests/ui/m74.html`, mesmo estado/dados: desktop preservou mapa, lista e painel lateral; 390×844 transformou o painel em superfície integral com ações fixas. O grupo BPMN mostrou 2 ocorrências, candidato oficial não selecionado e aviso de reutilização. Sem desvio material observado.

## Rollout, métricas e limites

Antes do rollout, o Perfil investigado exibia 3 conceitos porque a revisão 3 falha (`BUDGET_LIMITED`) havia substituído visualmente a revisão 2 completa. A base completa possuía 67 itens, 7 associações, 5 conceitos e 60 pendências.

Após migration remota `20260918193317`, Edge Function `knowledge-agent` v16 e reprocessamento, o mesmo Perfil ficou `complete`: 43 declarações, 66 itens, 7 associações, 5 conceitos, 59 pendências e 57 termos únicos pendentes. Portanto, a recuperação visível imediata é de 3 para 5 conceitos, sem aumento líquido de conceitos automaticamente associados em relação ao último resultado completo. Isso é limite real, não sucesso omitido: o ganho adicional depende de decisões humanas de alias/conceito, agora agrupadas e reutilizáveis.

No lote completo, 7/7 Perfis terminaram `complete`; 6 usaram o provider e um Perfil vazio não chamou IA. Totais observados: 3.002 tokens de entrada e 4.992 de saída. As associações automáticas permaneceram 14 antes/depois; nenhum snapshot mudou. Advisors pós-DDL mantiveram achados preexistentes/esperados: tabela de runs sem policy pública por ser service-only e RPCs `SECURITY DEFINER` intencionais com guardas internas; nenhuma nova exposição foi aceita.

O frontend v1.7.6 foi construído do runtime `9b747a9` com `baseline` e Parser IA `hosted`; somente `prisma-web` foi recriado. A imagem ativa é `sha256:a033d20389aba9b687dd8d7e9903603593d9e2889508783b5480dcb73efc042b`, com rollback `prisma-web:rollback-before-m75-20260918` apontando para `sha256:e7280c2e28419cb62a8109ce807815b48fe749de872d0d1b382cec63bf0a8c01`. HTTPS respondeu 200 e o container permaneceu estável, sem reinício.

No smoke autenticado de produção, o Perfil investigado exibiu v1.7.6, 5 conceitos em 3 agrupamentos e 59 ocorrências pendentes agrupadas em 57 termos únicos. A abertura da curadoria informou explicitamente que nenhuma opção é selecionada automaticamente; não havia candidato marcado e os botões de gravação permaneceram desabilitados. O painel foi cancelado sem escrita. Main local, GitHub e VPS foram sincronizados no fechamento; resíduos locais e remotos alheios ao movimento foram preservados.
