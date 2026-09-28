# Acordo — preservação do matching após falha da IA

Versão 1.0.0. Decisão explícita de Bruno em 2026-09-28. Para uma tentativa de interpretação sem resultado válido, este acordo substitui somente o estado de pendência com apagamento do resultado prévio previsto em D-05 do acordo M8.6. As regras de uma interpretação válida permanecem as mesmas.

## DEVE

- D-01: guardar o resultado determinístico anterior à chamada e preservá-lo integralmente quando a IA falhar, divergir, permanecer em processamento ou retornar leitura/proveniência inválida. Isso inclui grupo, score, dimensões, relações, requisitos, evidências e decisões humanas.
- D-02: sinalizar a falha na busca e na comparação, indicando que os resultados exibidos são os calculados antes da tentativa. Identificar os Perfis afetados sem expor dados internos do provedor.
- D-03: uma resposta completa e válida continua a seguir a interpretação versionada atual. Nova consulta pode recuperar a análise, sem apagar histórico.

## PROIBIDO

- P-01: converter a falha em zero, em Grupo C, em ausência de experiência ou em classificação semântica válida.
- P-02: substituir relações, score ou evidências determinísticas por campos vazios/indisponíveis apenas porque a IA falhou.
- P-03: aceitar leitura malformada, tenant/Perfil/Posição/versão divergente ou proveniência ausente como conclusão da IA.

## FORA DE ESCOPO

- F-01: mudar a política de acionamento A/B/C, o prompt, modelo, orçamento ou número de leituras.
- F-02: alterar Knowledge, banco, contratos persistidos, pesos ou dados reais de Pessoas e Posições.

## AUTONOMIA

- A-01: engenharia define uma anotação transitória de falha e os avisos nas superfícies existentes, com testes de regressão.

## CRITÉRIOS DE ACEITE

- CA-01: falha indisponível, divergência, resposta inválida e proveniência incompatível deixam o resultado anterior intacto, inclusive para Analista de Marketing com experiência publicada em Marketing.
- CA-02: busca e comparação exibem aviso e ainda mostram grupo, score e evidência anteriores; resposta válida mantém o comportamento vigente.
- CA-03: testes direcionados, tipos/build, runtime compartilhado e regressão proporcional passam; release somente de superfícies necessárias.

## Mapa inicial de impacto

| Área | Relação | Baseline e preservação |
| --- | --- | --- |
| Aplicação da interpretação e descoberta | direct | `main` anterior: falha apaga área/score; preservar objeto determinístico completo |
| Busca e comparação | direct | Aviso visível e grupo/score anteriores; manter ações humanas e acesso ao Perfil |
| Score, snapshots e versões | plausible_indirect | Não mudar cálculo nem contrato persistido; regressão de ordenação e avaliação determinística |
| Edge, autenticação e tenant | critical_transversal | Sem mudança de RPC/provedor; rejeitar saída inválida, não aceitar como semântica |
| Knowledge, parser, publicação e banco | no_impact_identified | Somente resultado em memória e UI; sem nova escrita de fonte ou schema |
| Release | direct | Web e espelho gerado do domínio, sem migration nem publicação de Edge se o bundle não mudar materialmente |

Decisão de versão: sem bump dos contratos persistidos `vacancy-matching-semantic-7.0.0` e `matching-score-1.4.0`, pois a resposta válida e o cálculo não mudam. A mudança é o fallback transitório da interface.
