# M5.5: PDF de currículo baseado em imagem

## AoT

| ID | Acordo | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- | --- |
| D-001 | PDF image-only segue o fluxo existente | OCR seletivo e persistência espacial OCR corrigidos | arquivo de referência lido localmente; contrato de persistência provado em QA; smoke autenticado final pendente | PARTIAL |
| D-002 | Reutilizar Tesseract existente | `createLocalOcrWorker` usa Tesseract 7 já adotado | `pnpm run validate` | PASS |
| D-003 | Decisão por página | detector atual continua por página | regressões existentes do M2-B | PASS |
| D-004 | Ruído não impede OCR | `isNativeTextSufficient` permanece conservador | teste determinístico de suficiência | PASS |
| D-005 | OCR antes do gate de identidade | fluxo currículo-first preservado | contrato/intake existente | PASS |
| D-006 | Identidade mínima não muda | nenhuma alteração no gate | testes currículo-first | PASS |
| D-007 | Linhas e geometria preservadas | Tesseract produz blocos posicionados e `persist_person_extraction` aceita geometria OCR somente com `tesseract-layout-v1` | teste unitário e prova SQL positiva/negativa em QA | PASS |
| D-008 | Sem duplicação | composição nativa/OCR existente preservada | regressões M2-B/M5 | PASS |
| D-009 | Proveniência correta | método OCR continua registrado e é validado contra a origem da página | testes de ingestão e prova SQL negativa em QA | PASS |
| D-010 | Vazio não é sucesso | estados e limiar atuais preservados | testes de falha/insuficiência | PASS |
| D-011 | Erro acionável | boundary visual não expõe asset técnico | testes de feedback | PASS |
| D-012 | Retry | retry existente preservado | testes de idempotência/retry | PASS |
| D-013 | Nativo sem OCR desnecessário | worker só é carregado quando há candidato OCR | código e build | PASS |
| D-014 | PDF misto | decisão por página preservada | cobertura existente; smoke real pendente | PARTIAL |
| D-015 | OCR local | worker, core WASM e dados `por+eng` no bundle web | build sem dependência de CDN para inicialização | PASS |
| D-016 | `por+eng` | configuração mantida | teste de worker | PASS |
| D-017 | Arquivo de referência | usado somente localmente, sem inclusão no repositório | OCR recuperou conteúdo material; persistência corrigida em QA; smoke autenticado final pendente | PARTIAL |
| D-018 a D-020 | Regressões image-only, falso nativo e falha OCR | infraestrutura/testes existentes preservados; novas fixtures reais pendentes | suíte determinística | PARTIAL |
| D-021 a D-024 | Telemetria, UX, performance e causa geral | sem telemetria PII ou nova UX; baseline real pendente | lint/build/review de código | PARTIAL |
| P-001 a P-014 | Proibições | nenhuma violação; sem LLM, OCR externo, persistência do arquivo real, alteração destrutiva ou produção | diff, testes e validação; migration limitada ao contrato já existente e aplicada em QA | PASS |

## Evidência local

- `pnpm run validate`: PASS, com 291 testes e 19 golden cases.
- Worker `tesseract.js` e core WASM são emitidos pelo Vite como assets locais.
- A causa adicional foi classificada como `PERSISTENCE_DROPPED_OCR`: o frontend produzia evidência espacial OCR com `tesseract-layout-v1`, mas a RPC pública rejeitava qualquer coordenada cuja página não fosse `native_pdf`.
- A migration `20260910104122_allow_ocr_spatial_field_evidence.sql` mantém a RPC tenant-scoped e fail-closed, aceita somente `native_pdf + pdfjs-layout-v1` ou `ocr + tesseract-layout-v1` quando há coordenadas e preserva os grants existentes.
- Em Prisma-QA, um payload espacial OCR válido passou pela validação e alcançou a barreira de sessão `42501`; o mesmo payload com método PDF.js incompatível foi recusado antes dela com `22023 adaptive field evidence is invalid`.
- Nenhuma RLS, autorização, endpoint ou produção foi alterada.
- O arquivo de referência do Product Owner não foi persistido, logado ou incluído no Git.

## Limitação

O movimento não deve ser considerado concluído até repetir o smoke autenticado do arquivo de referência após a correção em QA, adicionar as fixtures sintéticas image-only/falso nativo/falha OCR, comprovar PDF misto e registrar as medições comparativas solicitadas no prompt de execução.
