# Ambientes

## Estado atual

Existe ambiente local e um único projeto Supabase remoto (`Prisma-QA`, ref `ioldpnqqvobprjiontre`) usado para desenvolvimento conectado e validação interna. Bruno decidiu não criar outro projeto enquanto somente a equipe interna usa o Prisma e não há clientes. Produção isolada, domínio público, frontend hospedado, CI remoto e secret store ainda não estão configurados.

## Local

Raiz oficial: `C:\Users\Bruno\Documents\Prisma`. Objetivo: desenvolvimento determinístico, testes, migrations, Context Pack e validação local do shell web. Dados permitidos: fixtures sintéticas. Secrets: o fluxo CLI não exige secrets; o shell web exige apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env*`, fora do Git. O shell possui uma única origem local em `http://127.0.0.1:5555`; o ambiente conectado é definido pelas variáveis `VITE_SUPABASE_*`, sem criar uma segunda porta para QA.

## QA

Objetivo: validar Auth, RLS, storage, migrations, parser, provider, observabilidade e fluxos negativos. O projeto remoto atual é `Prisma-QA` (`ioldpnqqvobprjiontre`) e contém foundation, M2-A, M2-B, M2-C, intake currículo-first, M4, M5, M5.1A/B/C e M5.2. O M5.2 publicou a versão oficial CBO `CBO 2002-2025-06-06`; o snapshot ESCO v1.2.1 continua bloqueado pelo download oficial com etapa humana. O monitor mensal de CBO, ESCO e O*NET está ativo com Supabase Cron, Vault e Edge Function; a próxima checagem vence em 2026-10-01 às 01:00 em `America/Sao_Paulo`. O M5.1C mantém a Edge Function `assessment-item-generator` com JWT obrigatório e geração externa desativada. Dados reais somente com finalidade, base legal, autorização, minimização, acesso e retenção documentados.

## Produção planejada

Objetivo: uso real aprovado quando houver cliente ou necessidade de exposição externa. Produção nunca será a primeira superfície de teste e exigirá projeto isolado, aprovação explícita, release checklist, backup, rollback, incident response, auditoria e smoke pós-deploy.

## Variáveis e secrets

O shell web local recebe somente URL pública e chave publicável adequada. Secret/service key, connection string privilegiada, provider key e credencial de storage ficam em backend/secret store. Logs, bundles e Context Pack não contêm valores.

## Promoção

```text
local -> remoto interno -> evidência -> futura separação QA/produção -> smoke -> sincronização documental
```

Migration aplicada não prova aplicação publicada; aplicação publicada não prova capability ativa. Evidência por ambiente atualiza `PRISMA_CURRENT_STATE.md`.

## Rollback

Código: ref/artefato anterior. Migration: preferir forward fix; rollback destrutivo exige plano e aprovação. Prompt/modelo: reativar versão aprovada anterior. Capability: flag fail-closed somente quando existir infraestrutura de flags.
