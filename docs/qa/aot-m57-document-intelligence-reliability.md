# AoT - M5.7 Confiabilidade da inteligência documental

## Matriz de Acordos

| ID | Acordo | Implementação | Teste | Evidência | Status |
| --- | --- | --- | --- | --- | --- |
| D-01 | Executar Paddle real nos dois currículos autorizados | adaptador 1.1.0 e probe loopback | probe real e smoke autenticado | Tainá: 40 blocos/71 linhas; Vagner: 27 blocos/60 linhas; ambos sem fallback | PASS |
| D-02 | Preservar identidade técnica também na falha | `describe()` alimenta o trace antes da chamada | `documentIntelligence.test.ts` | provider, modelo e versões permanecem disponíveis com erro tipado | PASS |
| D-03 | Telemetria allowlisted sem PII | `safeDocumentIntelligenceFailure` e métricas estruturais | teste negativo de mensagem sensível | texto livre do provider não aparece no resultado seguro | PASS |
| D-04 | Timeouts alinhados e limitados | cliente padrão 240 s, faixa 30-300 s; proxy 300 s | typecheck, build web e runtime real | execuções CPU de 66 a aproximadamente 120 s concluíram | PASS |
| D-05 | Preservar `native-fast` | preflight e flag existentes mantidos | regressão `preflight keeps a simple native PDF` | PDF simples continua fora do caminho pesado | PASS |
| D-06 | Bloco equivalente sem período vira possível | agrupamento aceita empresa, cargo e conteúdo próprios | fixtures BATERIAS e AUTONOMO | período permanece nulo e classificação não vira forte | PASS |
| D-07 | Exigir confirmação e não inventar campo | classificação `possible` e aplicação individual | testes de extração adaptativa | nenhum período foi copiado ou inferido | PASS |
| D-08 | Probe reproduzível e sanitizado | `scripts/probe-paddle-runtime.mjs` e `probe:paddle` | execução real nos dois arquivos | saída contém hash curto e métricas, sem caminho ou conteúdo | PASS |
| D-09 | Bloquear cutover sem prova completa | benchmark exige 8-12 casos, 90%, superioridade, menos intervenção, zero fallback e zero regressão crítica | teste contratual e manifesto ausente | comando encerrou `BLOCKED`; somente dois casos autorizados existem | PASS |
| D-10 | Atualizar contratos e estado | documentação AI, arquitetura, operações, QA e Context Pack | lint, foundation, geração e checker | versões e limites atuais registrados | PASS |
| D-11 | Vínculo name-only sem relaxar criação | migrations forward-only da RPC `resolve_resume_intake` | contrato local, inspeção remota e smoke QA | vínculo do Vagner chegou à análise; criação ainda exige nome mais contato | PASS |

## Proibições verificadas

| ID | Guardrail | Teste negativo | Evidência | Status |
| --- | --- | --- | --- | --- |
| P-01 | Somente currículos autorizados | caminhos explícitos no probe | somente os dois arquivos fornecidos foram processados | PASS |
| P-02 | Nenhum envio externo de PII | endpoint restrito a loopback | Paddle operou em `127.0.0.1`; QA recebeu a importação autorizada já prevista | PASS |
| P-03 | Nenhuma publicação automática | smoke parou na revisão | telas declararam perfil preservado e nenhum Perfil foi publicado | PASS |
| P-04 | Nenhum novo parser, OCR, LLM ou dependência | revisão de diff e lockfile | Paddle, PDF.js e Tesseract existentes foram reutilizados | PASS |
| P-05 | Knowledge e matching inalterados | revisão de diff | nenhuma regra CBO, ESCO, O*NET, matching ou senioridade mudou | PASS |
| P-06 | Sem conteúdo integral na telemetria | teste allowlist | falha livre do provider foi descartada | PASS |
| P-07 | Sem produção | verificação de ambiente | mudanças de banco aplicadas somente em `Prisma-QA` | PASS |
| P-08 | Sem alegação representativa | benchmark fail-closed | cutover e meta de 90% continuam bloqueados | PASS |

## Fora de escopo preservado

| ID | Evidência no diff | Status |
| --- | --- | --- |
| F-01 | nenhum challenger foi integrado | PASS |
| F-02 | nenhum treino ou fine-tuning foi criado | PASS |
| F-03 | documentos históricos não foram reprocessados silenciosamente | PASS |
| F-04 | RLS, papéis, publicação e taxonomias não foram alterados | PASS |

## Desvios do contrato

Nenhum. D-11 foi registrado como aditivo autorizado após o smoke revelar um bloqueio contraditório no mesmo fluxo.

## Mudanças autorizadas durante a execução

- D-11 incluiu a correção da resolução de identidade descoberta no teste completo.
- O parser foi versionado como `adaptive-resume-extraction` 7.1.0, `extraction-draft` 8.1.0 e `prisma-layout-adaptive-v9`; contratos persistidos de padrão genérico permaneceram compatíveis.

## Validação final

- lint: 405 arquivos, PASS.
- foundation: 18 tabelas públicas e 6 versões de processamento, PASS.
- typecheck domínio e web: PASS.
- build web: PASS, com aviso preexistente de chunk acima de 900 kB.
- testes focais: 47/47 PASS.
- runtime real: 2/2 PASS sem fallback.
- benchmark sem amostra: `BLOCKED` como exigido.
- validação integral `pnpm run validate`: PASS após autorização explícita do Product Owner, com lint de 405 arquivos, foundation de 18 tabelas públicas e 6 versões de processamento, Context Pack, dois typechecks, build web, 319 testes técnicos, 19 casos golden sem falha ou regressão e demonstração vertical concluída.

## Git / QA / ambiente

- branch: `codex/m5-6-resume-parser-upgrade`.
- QA: duas migrations forward-only aplicadas ao projeto `Prisma-QA`; função remota confirmou estado name-only e mínimo de criação.
- advisors Supabase: nenhum alerta novo atribuído à mudança; permanecem avisos gerais preexistentes de funções SECURITY DEFINER intencionais, políticas e índices.
- produção: não acionada.
- working tree: `.tmp.driveupload/` preservado como material não relacionado do usuário.

## Conclusão

O upgrade reduz trabalho humano nos padrões comprovados e mantém revisão obrigatória para lacunas. A qualidade representativa ainda não está provada: cutover depende de 8 a 12 currículos reais autorizados e medição cega contra baseline.
