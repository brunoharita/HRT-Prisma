# Plano de testes

## Objetivo

Demonstrar comportamento, segurança, compatibilidade e explicabilidade proporcionalmente ao risco. Código que compila, migration que existe ou IA que responde não são evidência suficiente.

## Níveis

- Unit: regras, validação, estados, confiança, matching.
- Contract: versões, schema, provider, Context Pack.
- Integration: repository, banco, Auth, storage e provider quando existirem.
- Golden: extração, prompt injection, matching, empate e insuficiência.
- E2E: importação até resultado explicado.
- Security: autorização negativa, tenant, PII, documento malicioso, secrets.
- Operational: migrations, deployment, rollback, observabilidade e incidentes.

## Estratégia por risco

Classes A/B usam checks focados. Classe C inclui integração e regressão afetada. Classes D/E exigem teste negativo, ADR/contrato quando duradouro, QA-first, rollback, evidência e gate completo.

## Dados

Local e QA usam fixtures sintéticas ou anonimizadas. Dados reais exigem autorização, finalidade, base legal, minimização, acesso e retenção. Evidência de teste não copia PII integral.

## Automação atual

`pnpm run validate` executa lint, invariantes de fundação, Context Pack, typecheck, testes, golden tests, build e demo. `pnpm run audit:dependencies` consulta advisories do registry e também integra a CI. Testes conectados de Auth/RLS/storage ainda não existem porque não há ambiente.

## Critério de promoção

Sem regressão não justificada, contratos compatíveis, segurança negativa aprovada, custo/latência dentro do budget, documentação/contexto atualizados, QA com evidência e aprovação explícita para produção.

## Evidência

Registrar commit, ambiente, versões, fixtures, comando, resultado, falhas, correções, limitações e timestamp. Snapshot de UI ou log não substitui assertiva reproduzível quando automação é possível.
