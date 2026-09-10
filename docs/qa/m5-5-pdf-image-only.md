# M5.5: PDF de currículo baseado em imagem

## AoT

| ID | Acordo | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- | --- |
| D-001 | PDF image-only segue o fluxo existente | OCR seletivo preservado; assets locais corrigidos | Smoke do arquivo de referência ainda indisponível | PARTIAL |
| D-002 | Reutilizar Tesseract existente | `createLocalOcrWorker` usa Tesseract 7 já adotado | `pnpm run validate` | PASS |
| D-003 | Decisão por página | detector atual continua por página | regressões existentes do M2-B | PASS |
| D-004 | Ruído não impede OCR | `isNativeTextSufficient` permanece conservador | teste determinístico de suficiência | PASS |
| D-005 | OCR antes do gate de identidade | fluxo currículo-first preservado | contrato/intake existente | PASS |
| D-006 | Identidade mínima não muda | nenhuma alteração no gate | testes currículo-first | PASS |
| D-007 | Linhas e geometria preservadas | Tesseract continua produzindo blocos posicionados | teste de normalização OCR | PASS |
| D-008 | Sem duplicação | composição nativa/OCR existente preservada | regressões M2-B/M5 | PASS |
| D-009 | Proveniência correta | método OCR continua registrado | testes de ingestão | PASS |
| D-010 | Vazio não é sucesso | estados e limiar atuais preservados | testes de falha/insuficiência | PASS |
| D-011 | Erro acionável | boundary visual não expõe asset técnico | testes de feedback | PASS |
| D-012 | Retry | retry existente preservado | testes de idempotência/retry | PASS |
| D-013 | Nativo sem OCR desnecessário | worker só é carregado quando há candidato OCR | código e build | PASS |
| D-014 | PDF misto | decisão por página preservada | cobertura existente; smoke real pendente | PARTIAL |
| D-015 | OCR local | worker e core WASM no bundle web | build sem dependência de CDN para inicialização | PASS |
| D-016 | `por+eng` | configuração mantida | teste de worker | PASS |
| D-017 | Arquivo de referência | não disponível nesta sessão | smoke pendente | NOT TESTED |
| D-018 a D-020 | Regressões image-only, falso nativo e falha OCR | infraestrutura/testes existentes preservados; novas fixtures reais pendentes | suíte determinística | PARTIAL |
| D-021 a D-024 | Telemetria, UX, performance e causa geral | sem telemetria PII ou nova UX; baseline real pendente | lint/build/review de código | PARTIAL |
| P-001 a P-014 | Proibições | nenhuma violação; sem LLM, upload externo, migration ou produção | diff, testes e validação | PASS |

## Evidência local

- `pnpm run validate`: PASS.
- Worker `tesseract.js` e core WASM são emitidos pelo Vite como assets locais.
- Nenhuma migration, RLS, grant, autorização, endpoint ou produção foi alterada.
- O arquivo de referência do Product Owner não foi persistido, logado ou incluído no Git.

## Limitação

O movimento não deve ser considerado concluído até executar o smoke autenticado do arquivo de referência, uma fixture sintética image-only real, um PDF misto e as medições comparativas de OCR solicitadas no prompt de execução.
