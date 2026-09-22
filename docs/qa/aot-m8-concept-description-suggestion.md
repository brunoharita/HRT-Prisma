# AoT — M8 UX — Sugestão de descrição de competência

Contrato: `docs/agreements/agreement-m8-concept-description-suggestion.md` v1.0.0. Prompt: `docs/qa/execution-m8-concept-description-suggestion.md`. Estado: **PARCIAL**, em 2026-09-21, porque o rollout foi concluído sem smoke hospedado, conforme decisão do Product Owner.

## Matriz de Acordos

| ID | Implementação | Teste/evidência | Status |
| --- | --- | --- | --- |
| D-UX-01 | Botão junto ao rótulo da descrição, somente no modo de proposta | Teste estático da UI e build web | PASS local |
| D-UX-02 | Adapter → `knowledgeService` → modo dedicado; JSON `definition` normalizado | Teste estático do payload/schema; typecheck | PASS local |
| D-UX-03 | Sugestão altera apenas estado do formulário; RPC existente continua no Gravar | Revisão do diff e teste da UI/adapter | PASS local |
| D-UX-04 | Loading, erro, aviso de IA e preservação de edição | Teste estático e inspeção visual do fixture local em viewport desktop; sugestão sintética preenchida sem gravação | PASS local |
| P-UX-01/P-UX-02 | Handler não acessa Inbox/propostas e rejeita PII | Teste estático; sem chamada real | PASS local |
| P-UX-03 | Prompt limita saída a definição, sem evidência/decisão | Revisão do prompt e schema | PASS local |

## Fora de escopo e limites

Não houve migration, provenance persistida, chamada paga durante a validação ou mutação de dados Supabase. A sugestão usa o bloqueio de orçamento existente do Knowledge Agent, mas não cria registro próprio de uso nesta opção sem schema. O rollout foi concluído: a Edge Function `knowledge-agent` está publicada no projeto `ioldpnqqvobprjiontre`; o runtime web foi construído do SHA funcional `8dd0f0c22eef1318153006a21a6304a79c61ea98`; e o commit documental `0fde766` está em `main`, GitHub e checkout VPS. Somente `prisma-web` foi recriado, com contêiner `running`, zero reinícios e assets legados preservados. O smoke hospedado não foi executado por solicitação do Product Owner; a disponibilidade funcional remota e a inspeção visual autenticada permanecem `NOT TESTED`, mantendo o movimento `PARTIAL`.
