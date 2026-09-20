# M8.2 — Classificação assistida do catálogo global

Contrato: `docs/agreements/agreement-m82-global-competency-classification.md` v1.0.0. Fonte: ESCO 1.2.1 e O*NET 31.0 publicados no único Supabase existente. O procedimento não usa dados pessoais ou organizacionais como entrada de IA.

## Execução de uma versão de fonte

1. Fixar versão, arquivos oficiais, URI/external ID, hash do catálogo e conceitos realmente publicados. Não usar rótulo textual como chave de gravação.
2. Rodar `node scripts/classify-esco-competencies.mjs prepare`; comparar contagem e hash com o lote esperado. `run --model=gpt-5.6-terra --budget-usd=20 --concurrency=5` grava chunks fora do Git e pode retomar. A chave fica em `.env.local`; não a imprimir nem enviar a logs.
3. Auditar exemplos normativos, as decisões Soft com `node scripts/audit-esco-competency-classifications.mjs --selection=soft` e uma amostra determinística Hard com `--selection=hard-sample`. Revisar divergências e os conceitos que compartilham identidade canônica. Registrar correções pontuais por URI no arquivo de overrides versionado, com razão.
4. Somente após a auditoria, gerar migrations com `node scripts/generate-m82-esco-backfill.mjs`. As migrations exigem mapping de versão publicada, conceito global aprovado e subagrupador global ativo; não sobrescrevem classificação corrente. O método `ai_assisted` preserva justificativa, fonte, versão e modelo.
5. Aplicar a migration de método e os lotes na ordem. O histórico de migrations deste projeto não é equivalente entre local/remoto; usar somente migrations revisadas pelo conector autorizado. Não usar `supabase db push` geral ou `migration repair` automático.
6. Conferir cobertura no banco, distribuição por subgrupo, pendências, Comunicação → S1, ausência de sobrescrita humana, integridade/tenant, projeção da Pessoa e estado do release.

## Nova versão oficial

O monitor de fonte detecta atualização, mas não publica snapshot. Ao publicar uma nova versão ESCO/O*NET, repetir classificação e auditoria para URIs novas antes de considerar o catálogo M8 coberto. A classificação atual de um conceito canônico não é substituída só porque ganhou outro mapping; divergência entre duas URIs do mesmo conceito exige reconciliação explícita. Propostas humanas de conceitos novos continuam usando o subagrupador exigido na aprovação M8.1.

## Reversão de dados

Em incidente comprovado, numa transação e após registrar a contagem alvo, desativar somente linhas `is_current and method='ai_assisted' and provenance->>'agreement'='M8.2-1.0.0'` dos conceitos afetados; preservar histórico e quaisquer decisões `human_curated` posteriores. A projeção voltará a mostrar esses conceitos como pendentes. Não reverter por exclusão de conceitos, mappings, subagrupadores ou dados da Pessoa. Correção pontual pela RPC humana versionada é preferível para erros isolados.
