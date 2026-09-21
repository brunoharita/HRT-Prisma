# Execution Prompt — GOV-01 — Mapa de Impacto e Preservação 1.0.0

Contrato integral: `docs/qa/agreement-gov-01-impact-mapping-regression-preservation.md`, versão 1.0.0. Ler a íntegra antes de implementar.

Aplicar D-01 a D-25, impedir P-01 a P-10, manter F-01 a F-06 fora do movimento e exercer A-01 a A-08. Atualizar `AGENTS.md`, os templates de Agreement/AoT, owners de QA e release, versionamento, ADR e índice do Context Pack. Criar o AoT do movimento com mapa inicial/final, baseline, regressões, evidência e limites.

Este movimento é documental e de governança. Não alterar produto, schema, RLS, migrations, RPCs, Edge Functions, IA, parser, matching, runtime, UX, infraestrutura ou deploy. Regenerar e verificar o Context Pack pelo gerador oficial. Executar somente validações proporcionais aos arquivos alterados e registrar o plano de release, sem acessar Supabase ou VPS quando o plano não os exigir.
