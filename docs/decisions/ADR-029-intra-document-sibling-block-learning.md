# ADR-029: Aprendizado estrutural intra-documento e blocos irmãos

- Status: accepted
- Date: 2026-09-01
- Owners: product engineering, AI engineering, data and QA

## Context

A extração adaptativa v2 relê experiências já presentes no rascunho, mas não recupera blocos profissionais inteiros que a primeira passagem deixou de criar. Currículos repetem uma linguagem visual própria e uma experiência corrigida pelo operador pode servir como âncora dentro do mesmo documento.

## Problem

Reconhecer experiências irmãs ausentes sem copiar conteúdo, sem transformar pontuação probabilística em verdade, sem misturar colunas ou seções e sem publicar diretamente no perfil.

## Decision

Evoluir o parser adaptativo existente para aprender uma assinatura temporária `experience-sibling-signature-v1` a partir de uma experiência humana completa e com evidência espacial. O algoritmo determinístico `adaptive-sibling-block-v1` compara seção, geometria do cabeçalho, alinhamento do período, padrão do corpo, espaçamento e continuidade de coluna. Candidatos fortes viram propostas completas; candidatos possíveis exigem seleção individual; candidatos ambíguos, duplicados, sem geometria ou em outra coluna são rejeitados.

Cada proposta mantém valores e regiões do próprio bloco. O aceite é transacional, cria a experiência no rascunho, registra evidência complementar por campo e página e permanece separado da publicação Delta. Detecção, descarte e aceite geram eventos metadata-only. Somente a aprovação integral pode promover metadados estruturais tenant-scoped; conteúdo pessoal nunca integra o padrão organizacional.

## Alternatives considered

- Novo parser paralelo: rejeitado por duplicar regras e criar divergência contratual.
- LLM ou visão externa: rejeitado por custo, não determinismo, privacidade e explicabilidade inferior neste caso.
- Aplicação automática: rejeitada porque estrutura semelhante não equivale a fato aprovado.
- Persistir a assinatura completa do currículo: rejeitado porque o aprendizado imediato é document-local e não deve duplicar PII.

## Reasons for the choice

O documento já fornece coordenadas PDF.js ou Tesseract posicionadas, IDs estáveis, ledger espacial e revisão com lock. Reutilizar essas fronteiras oferece rastreabilidade, rollback por revisão e compatibilidade com a governança atual.

## Positive consequences

- Recupera omissões estruturais após uma única correção humana.
- Explica a proposta por critérios nomeados, sem porcentagem arbitrária.
- Funciona em PDF nativo e OCR posicionado.
- Preserva campos humanos, deduplicação, tenant e publicação Delta.

## Negative consequences

- Fontes sem geometria não geram novas experiências automaticamente.
- Layouts muito heterogêneos continuam exigindo revisão manual.
- O aceite acrescenta regiões e vínculos ao ledger, elevando moderadamente o volume de auditoria.

## Risks

Falsos irmãos em documentos multicoluna, período capturado de outro bloco, duplicação semântica e crescimento indevido de padrões organizacionais.

## Mitigation

Gates de coluna e seção, comparação estrutural conservadora, deduplicação por região e identidade semântica, evidência própria por campo, revisão humana obrigatória, promoção somente após aprovação integral e fixtures negativas dedicadas.

## Technical impact

`adaptive-resume-extraction` 5.0.0, `extraction-draft` 6.0.0, `person-ingestion` 9.0.0 e `human-profile-review` 6.0.0. O OCR passa a preservar linhas normalizadas. A migration `20260902003617_m5_sibling_block_learning` estende o ledger v2 e cria RPCs v3, mantendo a RPC histórica. A migration `20260902011222_m5_sibling_block_learning_hardening` isola as implementações internas e adiciona validação espacial independente na fronteira pública. As migrations `20260902021134_restore_adaptive_page_geometry` e `20260902022059_accept_current_adaptive_field_paths` preservam esse contrato quando a extração parcial delega ao wrapper posterior e aceitam somente os caminhos canônicos, numéricos históricos ou IDs estáveis atuais.

## Data impact

Novas colunas aditivas guardam versão do algoritmo, assinatura, âncora e resumos estruturais. O texto selecionado fica somente em `spatial_evidence_regions`; eventos adaptativos e operacionais permanecem metadata-only. Não há publicação automática nem alteração retroativa de perfis.

## Security and LGPD impact

RPCs exigem `private.require_document_reviewer`, validam organização, review, shapes e limites, usam `search_path = ''` e mantêm DML direto revogado. Wrappers públicos rejeitam metadados estruturais inconsistentes, vínculo candidato/campo divergente e proposta sem evidência espacial antes de chamar implementações não executáveis por `authenticated`. Não há chamada externa ou log integral de currículo.

## AI impact

Não usa LLM, prompt, embedding ou score. É uma regra determinística, versionada e explicável, com falha fechada quando geometria ou estrutura são insuficientes.

## Compatibility

Eventos e padrões v2 continuam legíveis e executáveis. Escritas v3 exigem os novos contratos. Versões desconhecidas são ignoradas na primeira extração e bloqueadas na mutação.

## Validation strategy

Fixtures positivas reproduzem o caso visual de três experiências; fixtures negativas cobrem texto achatado, coluna distinta, duplicidade, preservação humana e bypass de metadados na RPC. As migrations são validadas por testes de autorização, payload metadata-only e evidência por campo. O gate final é `CI=true pnpm run validate`, seguido de Prisma-QA e smoke autenticado.

## Review criterion

Reavaliar após currículos reais autorizados mostrarem falsos positivos, perda em layouts multicoluna ou custo de revisão maior que o ganho.

## Replacement criterion

Somente uma estratégia comparativamente avaliada, igualmente auditável e mais precisa pode substituir este algoritmo por novo ADR e migração compatível.

## References

ADR-016, ADR-017, ADR-018, ADR-020, ADR-023 e ADR-025; `web/src/domain/adaptiveResumeExtraction.ts`; `tests/adaptiveResumeExtraction.test.ts`; migrations `20260902003617_m5_sibling_block_learning` e `20260902011222_m5_sibling_block_learning_hardening`.

## Change history

- 2026-09-01: accepted for local implementation and QA-first rollout.
- 2026-09-02: smoke sintético confirmou dois blocos irmãos fortes e revelou duas compatibilidades obrigatórias: a geometria adaptativa deve sobreviver à recuperação parcial, e uma experiência criada pelo humano deve ser localizada pela região espacial persistida mesmo sem `page` ou `evidenceText` no draft. A ampliação de nomes de organização permanece condicionada à âncora humana; a primeira extração continua conservadora.
