# ADR-066 — Preservar cobertura e acelerar curadoria de competências

Status: accepted — 2026-09-18.

## Contexto

Uma nova tentativa `BUDGET_LIMITED` passou a ser usada como base da projeção e reduziu a leitura real de cinco para três conceitos. Mesmo a última execução completa associou apenas sete de 67 itens atômicos: a Knowledge publicada tem boa amplitude, mas poucos aliases para o vocabulário empresarial e tecnológico observado.

## Decisão

Separar o **resultado-base** da **última tentativa**. A projeção usa o processamento completo compatível mais recente; se não existir, usa a tentativa mais recente. Falhas continuam explícitas, mas não apagam associações derivadas anteriores.

A normalização recebe orçamento dedicado e limitado. A curadoria agrupa termos equivalentes e reutiliza todas as expressões de busca versionadas, apresentando candidatos deduplicados sem pré-seleção. Somente alias humano aprovado resolve candidato parcial; conceito ausente permanece proposta.

## Consequências

- Repetir processamento deixa de causar regressão visual ou semântica.
- Orçamento de pesquisa de mercado não bloqueia normalização de Perfil e vice-versa.
- Uma decisão humana pode beneficiar várias ocorrências e futuros Perfis da empresa.
- Cobertura melhora por aprendizado governado; não há garantia artificial de 100%.
- RPCs antigas permanecem disponíveis; o frontend novo exige a versão aditiva da projeção.

## Alternativas rejeitadas

- Promover candidatos parciais automaticamente: aumenta números ao custo de equivalências falsas.
- Criar embeddings, nova taxonomia ou fonte: adiciona arquitetura antes de explorar aliases e conceitos da empresa já previstos.
- Exibir somente a tentativa mais recente: confunde falha operacional com perda de conhecimento.
