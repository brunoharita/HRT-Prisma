# ADR-070 — Arquitetura sistêmica de competências M8.1

Status: implementação local em validação. Decisão de produto: Agreement M8 v1.0.0 e aditivo M8.1 v1.1.0, com as decisões posteriores de Bruno registradas no aditivo.

## Contexto e decisão

A Knowledge já fornece identidade canônica, termos, aliases, fontes e escopos. Os seis tipos históricos continuam necessários para ingestão e proveniência, mas não representam a estrutura de Hard Skills e Soft Skills. Criar outra base de conceitos duplicaria identidade e produziria equivalências artificiais.

M8.1 mantém `knowledge_concepts.id` e acrescenta três tabelas: `competency_macro_groups` guarda as duas definições globais; `competency_subgroups` guarda os nove subagrupadores globais e admite linhas de uma organização; `knowledge_competency_classifications` liga cada conceito aprovado a um subagrupador principal atual, com versões históricas e `organization_id` persistido para linhas tenant-owned. A FK, a unicidade parcial e o trigger protegem integridade e escopo inclusive em escrita direta. Conceito global só aceita subagrupador global; subagrupador organizacional só classifica conceito da mesma organização. Organização pode usar a estrutura global. Cadastro e edição de subagrupadores pela UI ficam para outro movimento.

O backfill determinístico usa apenas o tipo `technology` proveniente de mapping oficial O*NET para H2. Os demais conceitos existentes ficam pendentes até decisão humana; o tipo nativo, aliases, fontes e taxonomia ocupacional não são reescritos. Propostas novas de competência exigem subagrupador compatível na aprovação. A curadoria contextual, complemento de Posição e aprovação da Knowledge reutilizam os fluxos e auditoria existentes.

A relação Pessoa × conceito continua uma projeção do Perfil publicado, Knowledge e Assessment. Declaração, contexto factual, credencial, resultado de Assessment e habilidade prática são naturezas diferentes e cumulativas. A nova tabela `person_competency_evidence_links` registra somente vínculo humano a experiência publicada ou credencial declarada, com trecho e justificativa; currículo e certificado não geram verificação ou habilidade prática. Sem fonte de prática organizacional suportada neste movimento, não existe escrita de `demonstrated_skill`.

## Compatibilidade, risco e reversão

RPCs e contratos M8 têm nomes/versões novos; os anteriores permanecem para consumidores históricos. Matching, Prisma Score, Assessment e snapshots anteriores não mudam. RLS de leitura e RPCs administrativas impõem tenant e papel fora do frontend. A projeção falha fechada em versão/tenant inválido. O rollback de interface retorna ao consumidor anterior; os dados novos permanecem até uma reversão de schema explicitamente planejada. A limpeza de dados do M8.1 é uma operação separada e só pode ocorrer após backup, inventário de proveniência, prova das guardas e plano de Storage.

## Evidência

Migrations `20260920110000`, `20260920111000`, `20260920111500` e `20260920112000`; QA sintético transacional em `supabase/qa/m81_competency_verification.sql`; contratos TypeScript e AoT M8.1. A aprovação deste ADR não afirma rollout remoto.
