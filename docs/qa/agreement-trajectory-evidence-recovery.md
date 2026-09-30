# Acordo — recuperação da interpretação semântica com evidência literal

Versão 1.0.0. Decisão de Bruno em 2026-09-29: corrigir a falha recorrente da IA na análise de Perfis, sem intervenção específica em Diego ou Bruno. Execução do contrato M8.6, especialmente D-01, D-02, D-11, P-02 e P-03, e do acordo de preservação após falha.

## DEVE

- D-01: a IA seleciona uma referência estável de trecho da própria entry; o servidor deriva a citação literalmente da fonte publicada minimizada. Referência inexistente, de outra entry ou sem sustentação estrutural não é interpretação válida.
- D-02: manter duas leituras independentes e a concordância de categoria; falha ou divergência conserva integralmente o matching pré-IA e o aviso.
- D-03: nova versão de prompt abre uma chave de cache distinta sem editar avaliações históricas; a UI só oferece atualização como tentativa disponível quando o backend confirma possibilidade ou há processamento a consultar. Espera, limite esgotado e divergência são identificados sem prometer nova chamada.
- D-04: preservar a triagem Knowledge-first, o gate A/B plausível, as decisões humanas, tenant, versões, snapshot e a ordem de publicação de resultados internos antes da IA.

## PROIBIDO

- P-01: aceitar texto inventado, citação de outra entry, saída malformada ou resposta incompleta como evidência.
- P-02: transformar erro ou divergência em zero, Grupo C, alteração de score/requisitos, ou perda de vínculo/evidência anterior.
- P-03: forçar nova chamada pagável a cada refresh, remover limite/cooldown, reescrever cache histórico, vazar PII ou afrouxar autorização.

## FORA DE ESCOPO

- F-01: mudar pesos, critérios de A/B/C, equivalência ocupacional, regras globais da Knowledge ou decisões de curadoria.
- F-02: novo modelo/fornecedor, avaliação ao vivo de todo o corpus, backfill de Pessoas e reprocessamento automático de históricos.

## AUTONOMIA

- A-01: engenharia escolhe a forma de segmentação e validação da referência, migration aditiva de compatibilidade e apresentação resumida do estado de retry, preservando a fonte literal e a política de custo já aprovada.

## CRITÉRIOS DE ACEITE

- CA-01: referência válida produz citação que é substring exata da mesma fonte; referências inventada, cruzada, ausente e `unclear` com referência são rejeitadas.
- CA-02: falha da IA preserva grupo, score, relações e evidências anteriores; dois outputs discordantes não viram conclusão.
- CA-03: prompt 2.1.0 é aceito no claim/commit server-side; cache 2.0.0 permanece separado; UI não oferece retry para divergência, cooldown ou tentativas esgotadas.
- CA-04: testes direcionados de domínio/Edge/web, runtime compartilhado, migration, validação de release, QA e smoke proporcional de produção; qualidade semântica real é reportada apenas onde houver prova.

## Mapa inicial de impacto e preservação

| Área | Relação | Baseline / capacidade a preservar |
| --- | --- | --- |
| Contexto, schema, interpretação e leitura da Edge | direct | `main` anterior: cópia literal frequentemente falha em `reading_quote`; preservar citação estrita e duas leituras |
| Cache, migration e snapshot | direct | Prompt 2.0.0, chave tenant/fonte/modelo e limite de três tentativas; preservar histórico, autorização e rollback |
| Busca e comparação | direct | Aviso e resultado pré-IA intactos; não prometer retry quando indisponível |
| Matching determinístico, Knowledge e triagem | critical_transversal | Mesmo motor e gate anteriores; sem mudança de pesos ou curadoria |
| Parser, publicação de Perfil, requisitos e dados de Pessoa | no_impact_identified | Somente leitura da versão publicada; sem mutação de dados reais |
| Operação e custo | plausible_indirect | Mesmo modelo e duas leituras por tentativa; novo prompt 2.1.0 exige uma nova tentativa somente para pares elegíveis |

## Decisão de versão

Prompt `trajectory-evidence-2.1.0`; método `trajectory-position-2.0.0`, matching `vacancy-matching-semantic-7.0.0` e score `matching-score-1.4.0` permanecem. Nova migration aceita o prompt no claim/commit, sem alterar significado de snapshots antigos.
