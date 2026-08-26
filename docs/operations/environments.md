# Ambientes

## Estado atual

Existe ambiente local e um único projeto Supabase remoto (`Prisma-QA`, ref `ioldpnqqvobprjiontre`) usado para desenvolvimento conectado e validação interna. Bruno decidiu não criar outro projeto enquanto somente a equipe interna usa o Prisma e não há clientes. Produção isolada, domínio público, frontend hospedado, CI remoto e secret store ainda não estão configurados.

## Local

Raiz oficial: `C:\Users\Bruno\Documents\Prisma`. Objetivo: desenvolvimento determinístico, testes, migrations, Context Pack e validação local do shell web. Dados permitidos: fixtures sintéticas. Secrets: o fluxo CLI não exige secrets; o shell web exige apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env*`, fora do Git. Convenção local atual: app principal em `5555` e variante local QA em `5556`.

## QA

Objetivo: validar Auth, RLS, storage, migrations, parser, provider, observabilidade e fluxos negativos. O projeto remoto atual é `Prisma-QA` (`ioldpnqqvobprjiontre`) e contém foundation, M2-A, M2-B, M2-C, intake currículo-first, memberships controladas e somente dados sintéticos identificados por `[QA]`. Foram comprovados Home, Pessoas, Usuários, perfil, troca de tenant, papéis, texto manual, PDF/OCR, central documental, retry, revisão, aprovação e a transação currículo-first. O advisor de segurança registra as RPCs `security definer` controladas de M2-C/intake e proteção contra senhas vazadas desabilitada. Dados reais somente com finalidade, base legal, autorização, minimização, acesso e retenção documentados.

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
