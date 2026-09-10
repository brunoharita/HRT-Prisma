# AoT M5.6 Resume Parser Upgrade

## Matriz de Acordos

| ID | Implementação e evidência | Status |
| --- | --- | --- |
| D-01 | `DocumentIntelligenceProvider` explícito no domínio | PASS |
| D-02 | JSON Paddle restrito ao adaptador de infraestrutura | PASS |
| D-03 | `CanonicalDocument` 1.0.0 sob autoridade Prisma | PASS |
| D-04 | páginas, dimensões, blocos, linhas, conteúdo, tipo, ordem, regiões, polígonos, scores e proveniência | PASS |
| D-05 | `CanonicalDocument` e trace preservam sinais úteis sem PII integral | PASS |
| D-06 | conversão e validação em `normalized-page-v1` testadas | PASS |
| D-07 | M5, Perfil, Knowledge, matching e Delta sem import Paddle | PASS |
| D-08 | porta substituível e DTO provider-neutral | PASS |
| D-09 | adaptador e serviço self-hosted oficiais configurados; execução bloqueada pelo daemon | PARTIAL |
| D-10 | contrato aceita PDF/imagem e rotas cobrem scan, image-only e layouts; runtime não executado | PARTIAL |
| D-11 | PP-StructureV3, PP-OCRv6, preprocessing, reading order e PaddleOCR-VL integrados; runtime não executado | PARTIAL |
| D-12 | trace registra rota, modelo, versão, páginas, diagnóstico e fallback | PASS |
| D-13 | endpoints somente self-hosted/loopback | PASS |
| D-14 | nenhum envio a serviço externo no código/configuração | PASS |
| D-15 | preflight rápido implementado e testado | PASS |
| D-16 | rotas `native-fast`, `structure`, `vision`, `recovery` | PASS |
| D-17 | PDF nativo simples permanece no PDF.js | PASS |
| D-18 | PDF.js preservado | PASS |
| D-19 | Tesseract.js preservado | PASS |
| D-20 | recuperação Paddle/Tesseract usa imagem de página elegível | PASS |
| D-21 | métricas de tempo por estágio e rota no trace/telemetria | PASS |
| D-22 | adaptador entrega linhas ricas ao parser adaptativo existente | PASS |
| D-23 | labels Paddle não definem semântica profissional | PASS |
| D-24 | ordem, coluna, bloco e geometria chegam ao parser existente | PASS |
| D-25 | regras Prisma continuam responsáveis por estruturas profissionais | PASS |
| D-26 | `competency-list-segmentation` preservado nos 19 goldens e regressões | PASS |
| D-27 | regra de resumo explícito preservada nos testes existentes | PASS |
| D-28 | contratos existentes não foram substituídos | PASS |
| D-29 | `ExtractionDraft` continua fronteira humana | PASS |
| D-30 | versão/semântica do draft não mudou | PASS |
| D-31 | linhas canônicas alimentam evidência por campo | PASS |
| D-32 | apenas `normalized-page-v1`, sem sistema paralelo | PASS |
| D-33 | projeção espacial M5 não foi alterada | PASS |
| D-34 | insuficiência/falha retorna à revisão ou falha segura | PASS |
| D-35 | `organization_extraction_patterns` permanece camada estrutural separada | PASS |
| D-36 | extensão persiste somente metadados estruturais | PASS |
| D-37 | gatilhos humanos e aprovação existentes foram reutilizados | PASS |
| D-38 | aprendizado de irmãos e títulos foi estendido, não duplicado | PASS |
| D-39 | assinatura/aplicabilidade preservam sinais estruturais | PASS |
| D-40 | migration não possui conteúdo integral | PASS |
| D-41 | chave e RLS continuam organization-scoped | PASS |
| D-42 | padrão não publica Perfil | PASS |
| D-43 | versão, status, motivo e data de invalidação | PASS |
| D-44 | extração futura relê documento atual e produz evidência própria | PASS |
| D-45 | catálogo completo existe; conexão fina de falhas semânticas aguarda benchmark/runtime | PARTIAL |
| D-46 | logs/telemetria sem currículo, PII ou prompts | PASS |
| D-47 | diagnóstico metadata-only versionado | PASS |
| D-48 | harness A/B reproduzível implementado | PASS |
| D-49 | amostra real autorizada não fornecida | BLOCKED |
| D-50 | diversidade será validada pelo manifesto; amostra ausente | BLOCKED |
| D-51 | schema exige referência humana; referências ausentes | BLOCKED |
| D-52 | métricas mínimas separadas no relatório | PASS |
| D-53 | resultado por documento, campo, camada e consolidado | PASS |
| D-54 | Document Intelligence e semântica separadas | PASS |
| D-55 | dados privados/output ignorados; relatório sanitizável | PASS |
| D-56 | meta de 90% não medida sem amostra | BLOCKED |
| D-57 | gate bloqueia aumento de unsupported facts | PASS |
| D-58 | cutover não ocorreu | BLOCKED |
| D-59 | comparação real qualidade/tempo/esforço ausente | BLOCKED |
| D-60 | baseline permanece principal e flag fail-closed | PASS |
| D-61 | integração sem etapa nova para operador | PASS |
| D-62 | nenhuma configuração Paddle na jornada | PASS |
| D-63 | fluxo importar, estruturar e revisar preservado | PASS |
| D-64 | UI continua direcionada às pendências existentes | PASS |
| D-65 | correção, seleção, adição e recuperação M5 preservadas | PASS |
| D-66 | nenhum clique obrigatório novo | PASS |
| D-67 | RLS, tenant e papéis preservados | PASS |
| D-68 | novo registro carrega `organizationId/organization_id` | PASS |
| D-69 | migration forward-only com RLS/grants/índice e testes; aplicação QA pendente | PARTIAL |
| D-70 | migration limitada a telemetria persistente e metadados estruturais | PASS |
| D-71 | nenhum provider externo recebe documento | PASS |
| D-72 | baseline e regressões permanecem funcionais | PASS |
| D-73 | flag `baseline|shadow|enabled` implementada | PASS |
| D-74 | falha do provider retorna ao baseline antes de persistir | PASS |
| D-75 | ledger/idempotência existente não foi alterado | PASS |
| D-76 | nenhum histórico é reprocessado | PASS |
| D-77 | ADR-047 criado | PASS |
| D-78 | versões, licença, runtime, instalação e operação documentados | PASS |
| D-79 | Current State registra somente implementação e bloqueios reais | PASS |
| D-80 | architecture, AI, operations, security e QA atualizados | PASS |
| D-81 | Context Pack regenerado e verificado no gate final | PASS |
| D-82 | este AoT liga contrato, implementação, teste e evidência | PASS |

## Proibições verificadas

| ID | Evidência | Status |
| --- | --- | --- |
| P-01 a P-05 | adapter boundary; parser/Perfil/Knowledge/Delta não importam Paddle | PASS |
| P-06 a P-09 | PDF.js, Tesseract, mapa M5 e entidades existentes preservados | PASS |
| P-10 e P-11 | migration estrutural sem CBO/ESCO/O*NET | PASS |
| P-12 e P-13 | metadata-only e organization-scoped, com teste negativo | PASS |
| P-14 e P-15 | self-hosted loopback, sem SaaS ou custo recorrente | PASS |
| P-16 | schema/telemetria sem conteúdo integral ou PII | PASS |
| P-17 a P-20 | runtime/benchmark/90%/cutover explicitamente bloqueados | PASS |
| P-21 | matching, Knowledge profissional, M5.1 e senioridade sem mudanças | PASS |
| P-22 | produção não acionada | PASS |
| P-23 | `TUDO_SOBRE_PRISMA.md` somente pelo gerador | PASS |
| P-24 | nenhum teste removido | PASS |
| P-25 | `PARTIAL` e `BLOCKED` visíveis nesta matriz | PASS |

## Fora de escopo preservado

| IDs | Evidência | Status |
| --- | --- | --- |
| F-01 a F-04 | M5, Perfil, Delta e matching não reescritos | PASS |
| F-05 a F-09 | Knowledge profissional, senioridade, decisão, treino e ATS não alterados | PASS |
| F-10 | allowlist limitada a PDF, PNG e JPEG no provider | PASS |
| F-11 a F-13 | sem promoção cross-tenant, backfill ou remoção do legado | PASS |
| F-14 | nenhuma produção provisionada | PASS |

## Desvios do contrato

Nenhum requisito foi reinterpretado. D-09, D-10, D-11, D-45 e D-69 estão `PARTIAL` por falta de execução do runtime ou aplicação QA. D-49, D-50, D-51, D-56, D-58 e D-59 estão `BLOCKED` pela ausência objetiva da amostra real autorizada.

## Validação final

`pnpm run validate` aprovou lint de 391 arquivos, foundation, Context Pack, dois typechecks, build web, 301 testes técnicos, 19 goldens e `VERTICAL_SLICE_OK`. `docker compose config` aprovou a topologia loopback. O benchmark sem manifesto encerrou corretamente como `BLOCKED`.

## Git, QA e ambiente

Branch isolada criada a partir do baseline verificado. `.tmp.driveupload/` do usuário foi preservado e não integra o diff. Docker client 28.3.3 existe, mas daemon não respondeu. Migration e QA não foram acionados. Produção permaneceu intocada.

## Conclusão

Entrega técnica local `PARTIAL`. Baseline preservado. Cutover `BLOCKED` e flag mantida em `baseline` até runtime, benchmark real, meta de qualidade, performance e QA passarem.
