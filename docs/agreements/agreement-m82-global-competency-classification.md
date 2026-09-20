# Agreement Contract — M8.2 — Classificação inteligente dos conceitos globais de competência

Versão: 1.0.0. Decisão do Product Owner em 2026-09-20: classificar Hard/Soft com inteligência e cobertura próxima de 100%, sem revisão manual conceito a conceito. Este aditivo complementa o Agreement M8 v1.0.0 e o M8.1 v1.1.1. Substitui somente a decisão A-12 do M8.1 de deixar todos os conceitos não determinísticos pendentes. A classificação de conceitos globais continua global e única por conceito.

## DEVE

- **D-01** Interpretar semanticamente o conceito global de competência, usando rótulo, definição, contexto e tipo da fonte como evidência, para atribuir um dos nove subagrupadores M8.1. O tipo nativo `knowledge` ou `skill/competence` da ESCO não determina Hard/Soft.
- **D-02** Cobrir pelo menos 99% dos conceitos globais de competência publicados de ESCO e O*NET com classificação atual, preservando ocupações e certificações fora da taxonomia de competências.
- **D-03** Classificar o conceito ESCO “comunicação” como Soft Skills → Interpessoais. O conceito global selecionado deve aparecer no macrogrupo da Pessoa assim que a classificação estiver publicada, sem editar evidência ou declaração da Pessoa.
- **D-04** Usar a identidade canônica da Knowledge e as tabelas M8.1 de macrogrupos, subagrupadores e classificações. Persistir método, versão, fonte, versão do classificador, justificativa e histórico; uma decisão automática nunca será registrada como humana.
- **D-05** Submeter a classificação em lote a auditoria proporcional: exemplos normativos M8, amostra diversificada Hard/Soft, casos semanticamente parecidos e verificações de integridade e isolamento. Corrigir erros comprovados antes da publicação. Conceitos realmente indetermináveis permanecem pendentes e identificáveis.
- **D-06** Manter a classificação global reutilizável por todas as organizações; classificação e correção humanas autorizadas prevalecem sobre propostas automáticas. Novo conceito criado pelo fluxo humano M8.1 continua exigindo subagrupador na aprovação.
- **D-07** Publicar somente após validar correspondência entre URIs da fonte e conceitos presentes, ausência de sobrescrita de classificação humana, rollback e projeção do Perfil afetado.

## PROIBIDO

- **P-01** Inferir que uma Pessoa domina uma competência a partir da classificação do conceito; criar ou elevar evidências, certificação, Assessment ou habilidade prática.
- **P-02** Classificar Hard/Soft por palavra isolada, pelo tipo nativo da ESCO ou apenas pela autoconfiança declarada pelo modelo.
- **P-03** Reclassificar ocupações, certificações, conceitos organizacionais, classificações humanas correntes ou subagrupadores de outra organização em lote.
- **P-04** Enviar currículos, Perfis, nomes de Pessoas, dados de organizações ou segredos ao classificador externo.
- **P-05** Inventar equivalência entre conceitos ou duplicar identidades Knowledge para obter cobertura.

## FORA DE ESCOPO

- **F-01** Limpeza de Pessoas/dados M8.1, matching, Score, parser, Assessment, cadastro de subagrupadores organizacionais e redesign visual.
- **F-02** Classificação automática de conceitos criados por organização e alteração da governança de publicação humana de conceitos novos.

## AUTONOMIA

- **A-01** Modelo, lotes, amostragem e implementação do classificador, dentro do orçamento comunicado de US$ 20 para a classificação inicial de dados públicos da ESCO.
- **A-02** Migração e operação de backfill reversíveis, sem alterar os IDs, termos e mappings de Knowledge.
- **A-03** Critérios de revisão para casos difíceis, com registro de justificativa e limite objetivo de qualidade; não há autorização para afirmar acurácia perfeita.

## CRITÉRIOS DE ACEITE

- **CA-01** Cobertura ≥99% dos conceitos globais elegíveis publicados, contada no banco, e relatório separado de pendências.
- **CA-02** Comunicação ESCO aparece em Soft → Interpessoais no Perfil que já a associa, sem novo vínculo Pessoa × conceito.
- **CA-03** Exemplos M8 aplicáveis e amostra diversificada auditados; conflitos conhecidos corrigidos antes do rollout.
- **CA-04** Cada classificação automática tem método distinto de `human_curated`, URI/versão de origem, versão do classificador e justificativa; histórico humano anterior permanece recuperável.
- **CA-05** Testes negativos rejeitam escopo incorreto, classificação de ocupação/certificação e sobrescrita humana; Perfil preserva natureza e fonte da evidência.
- **CA-06** Diff, release, smoke e AoT registram cobertura, limites da medição de qualidade e estado real de local/main/produção.
