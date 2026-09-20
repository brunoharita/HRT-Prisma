# ADR-071 — Classificação assistida do catálogo global de competências

Status: implementação M8.2 em validação. Autoridade de produto: Agreement M8.2 v1.0.0, aditivo ao M8/M8.1; decisão explícita de Bruno em 2026-09-20.

## Contexto e alternativas

O backfill M8.1 usou o tipo estruturado `technology` do O*NET para H2. Isso deixou 13.933 conceitos ESCO e 44 conceitos O*NET de competência sem Hard/Soft no banco; a associação ao Perfil preservava a declaração, mas aparecia em classificação pendente. O tipo nativo `knowledge` da ESCO não implica Hard e `skill/competence` não implica Soft. Revisão humana de cada item é impraticável para o Product Owner.

Foram consideradas: (1) manter revisão manual, incompatível com a cobertura requerida; (2) classificar por tipo/termos da fonte, rápido mas semanticamente incorreto; (3) criar ontologia paralela ou embeddings, introduzindo identidade e operações redundantes; (4) reutilizar os conceitos e classificações M8.1 e fazer classificação semântica em lote sobre o snapshot oficial. Adotamos (4). O classificador recebe somente dados públicos da fonte, decide um dos nove subagrupadores e registra justificativa, versão e método `ai_assisted`. O operador audita amostras e conflitos antes da publicação. Decisões humanas continuam com `human_curated` e têm precedência.

## Limites e controles

O processo offline não recebe Pessoas, currículos, Perfis nem dados de organizações. Os dados da fonte são entradas não confiáveis. A execução tem orçamento limitado, saída estruturada, validação de cardinalidade/enum, arquivos de retomada e hash do catálogo. Uma segunda revisão busca falsos Soft e a auditoria de conceitos com duas URIs evita conflito de classificação por identidade. O backfill usa URI de mapping oficial, versão de fonte publicada, FK para o subagrupador global e proteção contra sobrescrever uma classificação corrente. O modelo não decide evidência ou aptidão de uma Pessoa.

Não se pode provar acurácia perfeita de milhares de decisões por amostragem. A meta ≥99% é cobertura de conceitos elegíveis; qualidade é medida separadamente pelos exemplos normativos, revisão adversarial e amostra diversificada. Conceitos indetermináveis permanecem pendentes. Publicar nova versão de fonte oficial requer novo lote e auditoria para conceitos novos; a aprovação humana de novo conceito já exige subagrupador no fluxo M8.1.

## Compatibilidade e reversão

`competency-taxonomy-2.0.0` e os nove subagrupadores não mudam. A migration amplia apenas o método da tabela de classificações e grava linhas versionadas; RPCs e projeção do Perfil existentes passam a mostrar a classe corrente sem novo vínculo pessoal. Uma reversão de dados desativa apenas classificações `ai_assisted` identificadas pelo classificador M8.2, preservando histórico e decisões humanas posteriores. O método pode permanecer no schema. A limpeza M8.1, matching e Assessment não participam.
