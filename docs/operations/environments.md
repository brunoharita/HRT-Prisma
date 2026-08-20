# Ambientes

## Estado atual

Somente ambiente local existe. Não há projeto Supabase vinculado, QA, produção, domínio, CI remoto ou secret store configurado.

## Local

Objetivo: desenvolvimento determinístico, testes, migrations e Context Pack. Dados permitidos: fixtures sintéticas. Secrets: nenhum necessário no fluxo atual. `.env*` não entra no Git.

## QA planejado

Objetivo: validar Auth, RLS, storage, migrations, parser, provider, observabilidade e fluxos negativos antes de produção. Dados: fictícios ou anonimizados. Dados reais somente com finalidade, base legal, autorização, minimização, acesso e retenção documentados.

## Produção planejada

Objetivo: uso real aprovado. Produção nunca é primeira superfície de teste. Exige aprovação explícita, release checklist, backup, rollback, incident response, auditoria e smoke pós-deploy.

## Variáveis e secrets

Frontend futuro pode receber somente URL pública e chave publicável adequada. Secret/service key, connection string privilegiada, provider key e credencial de storage ficam em backend/secret store. Logs, bundles e Context Pack não contêm valores.

## Promoção

```text
local -> QA -> evidência -> aprovação -> produção -> smoke -> sincronização documental
```

Migration aplicada não prova aplicação publicada; aplicação publicada não prova capability ativa. Evidência por ambiente atualiza `PRISMA_CURRENT_STATE.md`.

## Rollback

Código: ref/artefato anterior. Migration: preferir forward fix; rollback destrutivo exige plano e aprovação. Prompt/modelo: reativar versão aprovada anterior. Capability: flag fail-closed somente quando existir infraestrutura de flags.
