# Ambientes

## Estado atual

Existe ambiente local e existe um projeto Supabase remoto de QA (`Prisma-QA`, ref `ioldpnqqvobprjiontre`) já usado para validação inicial de Auth e schema. Produção, domínio público dedicado, CI remoto e secret store ainda não estão configurados neste repositório.

## Local

Raiz oficial: `C:\Users\Bruno\Documents\Prisma`. Objetivo: desenvolvimento determinístico, testes, migrations, Context Pack e validação local do shell web. Dados permitidos: fixtures sintéticas. Secrets: o fluxo CLI não exige secrets; o shell web exige apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env*`, fora do Git. Convenção local atual: app principal em `5555` e variante local QA em `5556`.

## QA

Objetivo: validar Auth, RLS, storage, migrations, parser, provider, observabilidade e fluxos negativos antes de produção. O projeto remoto atual é `Prisma-QA` (`ioldpnqqvobprjiontre`) e, em 2026-08-23, recebeu a migration inicial do Prisma e a primeira membership administrativa para o shell web. Dados: fictícios ou anonimizados. Dados reais somente com finalidade, base legal, autorização, minimização, acesso e retenção documentados.

## Produção planejada

Objetivo: uso real aprovado. Produção nunca é primeira superfície de teste. Exige aprovação explícita, release checklist, backup, rollback, incident response, auditoria e smoke pós-deploy.

## Variáveis e secrets

O shell web local recebe somente URL pública e chave publicável adequada. Secret/service key, connection string privilegiada, provider key e credencial de storage ficam em backend/secret store. Logs, bundles e Context Pack não contêm valores.

## Promoção

```text
local -> QA -> evidência -> aprovação -> produção -> smoke -> sincronização documental
```

Migration aplicada não prova aplicação publicada; aplicação publicada não prova capability ativa. Evidência por ambiente atualiza `PRISMA_CURRENT_STATE.md`.

## Rollback

Código: ref/artefato anterior. Migration: preferir forward fix; rollback destrutivo exige plano e aprovação. Prompt/modelo: reativar versão aprovada anterior. Capability: flag fail-closed somente quando existir infraestrutura de flags.
