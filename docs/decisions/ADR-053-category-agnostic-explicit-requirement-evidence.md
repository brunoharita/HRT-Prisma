# ADR-053: Evidência profissional explícita independe da categoria do requisito

- Status: accepted
- Date: 2026-09-14
- Owners: product and domain engineering
- Supersedes: somente a barreira por dimensão do ADR-044; preserva a separação entre descoberta, relação ocupacional e aderência

## Context

O Perfil e a Vaga organizam conhecimentos, competências, tecnologias, experiências, formação e credenciais em grupos úteis para apresentação e proveniência. Na prática, a mesma competência pode ser publicada em mais de um grupo ou aparecer explicitamente no texto de uma experiência. A regra anterior consultava somente o grupo associado ao requisito e produziu um falso negativo reproduzível: a Vaga exigia `SAP`, o Perfil publicado registrava `SAP` na descrição de uma experiência, mas a avaliação retornava `no_evidence` porque o requisito estava classificado como tecnologia.

## Decision

A categoria permanece como metadado de organização, apresentação e proveniência; ela não é uma barreira de recuperação. Um requisito genérico é `met` quando seu termo aparece de forma explícita, delimitada e não negada em qualquer conteúdo profissional publicado: título, área, resumo, objetivo, resultados, experiências, formação, certificações, idiomas, competências, conhecimentos, tecnologias, contextos ou seções profissionais personalizadas.

A correspondência é lexicalmente delimitada, portanto `SAP` é encontrado em `migração para SAP` e `SAP EWM`, mas não em `sapatos`. Uma declaração negada, como `sem experiência com SAP` ou `nunca utilizei SAP`, não comprova o requisito. Equivalência canônica publicada continua válida independentemente do grupo, com termo original e proveniência preservados.

Quando a Vaga exige nível explícito, a mera presença do termo comprova somente a conexão e permanece `partially_met` até que o nível seja demonstrado no próprio conteúdo ou por Evidência Demonstrada válida. Duração, senioridade e proficiência não são inferidas.

## Consequences

Perfis deixam de ser penalizados por diferenças terminológicas de cadastro. A explicação aponta o campo real que sustentou a conexão, inclusive a descrição de experiência. A classificação continua disponível para leitura humana e organização da interface, sem controlar o resultado factual.

## Boundaries

- Sem remoção de grupos ou alteração do schema de Perfil/Vaga.
- Sem reescrita ou reclassificação de Perfis históricos.
- Sem LLM, embedding, busca Web, nova dependência ou nova persistência.
- Sem alteração dos pesos de `matching-score-1.0.0`.
- Ausência de evidência continua epistemologicamente neutra e não significa ausência de capacidade.

## Compatibility and versioning

`vacancy-matching-explainable` avança para 4.0.0 porque a fonte elegível de evidência muda de uma dimensão exclusiva para todo o conteúdo profissional publicado. Avaliações históricas preservam a versão anterior. `matching-score-1.0.0`, `vacancy-definition-1.2.0`, schema e RPCs não mudam.

## Validation

Testes determinísticos cobrem o caso real reconstruído de Bruno com `SAP` na descrição profissional, categoria propositalmente divergente, termo curto, substring indevida, negação, nível não comprovado, nível explícito, equivalência canônica e regressão do score.

## References

- `docs/qa/agreement-m61-matching-score.md`
- `docs/ai/matching-contract.md`
- `docs/architecture/vacancy-profile-matrix.md`
- `web/src/domain/vacancy.ts`
- `tests/vacancyIntelligence.test.ts`
