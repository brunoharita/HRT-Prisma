# Prompt de Execução — M7.2 v2 Taxonomia de Competências e Perfil de Evidências

Contrato congelado: `docs/qa/agreement-m72-competency-taxonomy-evidence-v2.md` 2.0.0. Baseline imutável: `ccef68c05e10f3c35cf616f92f9a0d55c552a275`. Data: 2026-09-18.

## Entendimento obrigatório

Implementar D-TAX, D-DATA, D-PER, D-POS, D-UX, D-SEC e D-CUR. P-01 a P-25 não podem ocorrer. F-01 a F-16 permanecem fora do movimento, salvo o rollout já coberto pela autorização permanente do repositório. A-01 a A-12 delegam somente o como.

## Execução

1. Reutilizar `knowledge_concepts`, `knowledge_terms`, `knowledge_relations`, mappings, fontes, versões, Inbox, change sets e RLS. Não criar catálogo de conceitos paralelo.
2. Registrar releases independentes dos domínios ocupacional e de competências. Manter `position-taxonomy-1.0.0`; criar `competency-taxonomy-1.0.0` sobre conteúdo Knowledge aprovado e não ocupacional já publicado.
3. Corrigir o contrato de projeção de Pessoa por RPC aditiva. V1/V2/V3 continuam disponíveis; V4 expõe versões ocupacional/competência separadas, omite ocupações do mapa de competências e não reescreve Perfil/runs/snapshots.
4. Disponibilizar busca de competência server-side, token-aware e tenant-scoped. Somente exatos aprovados podem sustentar resolução; parcial é candidato humano. Expor autoridade e referências oficiais.
5. Integrar a busca e a nova projeção ao painel contextual existente sem mudar sua topologia normativa.
6. Requisitos novos/alterados com `concept_id` devem apontar a conceito publicado não ocupacional visível e registrar a versão de competência. Legado nulo permanece legível. Nenhuma relação cria requisito.
7. Expor relações ocupação→competência publicadas com fonte/versão/proveniência e marcador explícito de que não criam evidência pessoal.
8. Preservar matching, M5.1, parser, fontes e providers.
9. Validar domínio, SQL/RLS/autorização, projeção, curadoria, requisitos, regressões de matching, UI desktop/mobile e fidelidade visual. Fixtures são sintéticas ou transacionais com rollback.
10. Atualizar owners, ADR, Current State, versão/release, Context Pack e AoT. Depois dos gates proporcionais, executar commit, push, integração, migration/frontend em produção, smoke e sincronização conforme `AGENTS.md` 1.3.0.

## Rollback

Frontend pode voltar a V3/V1 do workflow sem perda. A migration é aditiva; RPCs antigas permanecem. Releases e coluna nova não reescrevem histórico. Em incidente, retirar consumidores V4/V2 e manter o schema até correção forward-only.
