# Evidência M5.6 Resume Parser Upgrade

Data: 2026-09-10

Branch: `codex/m5-6-resume-parser-upgrade`

## Resultado verificável

A infraestrutura local do M5.6 está implementada atrás de flag fail-closed. O pipeline existente continua default. O cutover não está aprovado porque não existe amostra de aproximadamente 10 currículos reais autorizados e o daemon Docker local não respondeu para executar Paddle, warm-up e medições.

## Fluxo implementado

`File -> PDF.js/preflight -> native-fast | PP-StructureV3 -> CanonicalDocument -> linhas normalized-page-v1 -> parser adaptativo Prisma -> ExtractionDraft -> revisão M5`

Página ausente ou insuficiente segue `imagem da página -> PaddleOCR-VL 1.6 -> Tesseract.js`, sem publicação automática. Uma resposta Paddle inválida, incompleta ou indisponível preserva o documento e retorna ao baseline.

## Provas locais

- baseline anterior: 291 testes técnicos e 19 goldens aprovados;
- testes novos: preflight das três rotas, flag desconhecida, mapeamento Paddle, reading order, polígonos normalizados e rejeição de geometria inválida;
- migration: testes negativos estáticos para `organization_id`, RLS, ator, grants, ausência de conteúdo integral e separação da Knowledge ocupacional;
- typechecks root e web aprovados após integração;
- `pnpm run validate`: lint de 391 arquivos, foundation, Context Pack, dois typechecks, build web, 301 testes técnicos, 19 goldens e `VERTICAL_SLICE_OK`;
- benchmark sem manifesto autorizado: `BLOCKED`, exit code 2 no script e exit code 1 no wrapper pnpm;
- Docker: cliente 28.3.3 encontrado; daemon não respondeu mesmo após tentativa elevada e o comando foi interrompido.
- Compose: `docker compose config` aprovou a topologia e confirmou bind em `127.0.0.1`.

## Benchmark exigido

O harness exige 8 a 12 casos reais autorizados, referência humana e saídas baseline/M5.6 para o mesmo documento. Ele mede por documento, campo, camada e consolidado: blocos, ordem, experiências, associação empresa/cargo/período, formação, competências, segmentação, recall, precisão, unsupported facts, evidência, intervenção, tempos e fallback.

Nenhum caso real foi inventado. Meta de 90%, superioridade, redução de trabalho humano, média/p95 e consumo permanecem `BLOCKED`.

## Segurança e rollout

A configuração publica portas apenas em loopback. Não existe endpoint SaaS obrigatório. A migration é forward-only, adiciona telemetria metadata-only e estende o catálogo estrutural organization-scoped. Ela não foi aplicada no Prisma-QA nesta evidência. Produção não foi alterada.

## Pendências objetivas

1. tornar o daemon Docker funcional e executar build, download oficial, warm-up e smoke com fixture não pessoal;
2. reunir 8 a 12 currículos reais autorizados com referência humana;
3. executar A/B e registrar relatório sanitizado;
4. somente se a meta e a superioridade passarem, decidir cutover e validar QA autenticado.
