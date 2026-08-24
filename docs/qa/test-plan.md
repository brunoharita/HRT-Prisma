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

`pnpm run validate` executa lint, invariantes de fundação, Context Pack, typechecks, build web, testes, golden tests e demo. A suite inclui guards, username/senha/celular, migrations M2-A/M2-B, PDF inválido, limiares determinísticos, ausência sem invenção, Storage privado, member sem documento bruto e boundaries Edge/RPC. QA conectado comprova login, Usuários, Pessoas e ingestão sintética por texto até perfil versionado. Upload PDF nativo/OCR, papel `member` conectado e mobile conectado permanecem checkpoints antes da produção. `pnpm run audit:dependencies` consulta advisories do registry.

## Critério de promoção

Sem regressão não justificada, contratos compatíveis, segurança negativa aprovada, custo/latência dentro do budget, documentação/contexto atualizados, QA com evidência e aprovação explícita para produção.

## Evidência

Registrar commit, ambiente, versões, fixtures, comando, resultado, falhas, correções, limitações e timestamp. Snapshot de UI ou log não substitui assertiva reproduzível quando automação é possível.
