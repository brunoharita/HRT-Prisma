# Ambientes

## Estado atual

Existe ambiente local de desenvolvimento e um único ambiente remoto de produção, formado pelo projeto Supabase `ioldpnqqvobprjiontre` e pelo frontend público hospedado em VPS Hostinger. O nome `Prisma-QA` ainda pode aparecer como rótulo legado no painel do Supabase, mas não representa um segundo ambiente. O frontend está disponível em `https://prisma.hrtsolutions.com.br` e usa esse backend único. Parser IA M5.7 e serviços de Document Intelligence ainda dependentes de loopback permanecem fora do runtime hospedado.

## Local

Raiz oficial: `C:\Users\Bruno\Documents\Prisma`. Objetivo: desenvolvimento determinístico, testes, migrations, Context Pack e validação local do shell web. Dados permitidos: fixtures sintéticas. Secrets: o fluxo CLI não exige secrets; o shell web exige apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env*`, fora do Git. O shell possui uma única origem local em `http://127.0.0.1:5555`; o ambiente conectado é definido pelas variáveis `VITE_SUPABASE_*`, sem criar uma segunda porta para QA.

## Produção atual

Objetivo: operar o Prisma implantado e validar Auth, RLS, Storage, migrations, parser, provider, observabilidade e fluxos negativos com risco proporcional. O projeto remoto único é `ioldpnqqvobprjiontre` e contém foundation, M2-A, M2-B, M2-C, intake currículo-first, M4, M5, M5.1A/B/C e M5.2. O M5.2 publicou a versão oficial CBO `CBO 2002-2025-06-06`; o snapshot ESCO v1.2.1 continua bloqueado pelo download oficial com etapa humana. O monitor mensal de CBO, ESCO e O*NET está ativo com Supabase Cron, Vault e Edge Function; a próxima checagem vence em 2026-10-01 às 01:00 em `America/Sao_Paulo`. O M5.1C mantém a Edge Function `assessment-item-generator` com JWT obrigatório e geração externa desativada. Dados reais somente com finalidade, base legal, autorização, minimização, acesso e retenção documentados.

## Limite atual

Não existe hoje um ambiente remoto separado para homologação. Mudanças continuam sendo preparadas e testadas localmente, recebem validação proporcional e só então são implantadas no ambiente único de produção com aprovação explícita, rollback, observabilidade e smoke não destrutivo. Uma futura separação entre homologação e produção exige decisão e provisionamento próprios.

## Variáveis e secrets

O shell web local recebe somente URL pública e chave publicável adequada. Secret/service key, connection string privilegiada, provider key e credencial de storage ficam em backend/secret store. Logs, bundles e Context Pack não contêm valores.

## Promoção

```text
local -> validação proporcional -> aprovação de produção -> ambiente remoto único -> smoke -> sincronização documental
```

Migration aplicada não prova aplicação publicada; aplicação publicada não prova capability ativa. Evidência por ambiente atualiza `PRISMA_CURRENT_STATE.md`.

## Rollback

Código: ref/artefato anterior. Migration: preferir forward fix; rollback destrutivo exige plano e aprovação. Prompt/modelo: reativar versão aprovada anterior. Capability: flag fail-closed somente quando existir infraestrutura de flags.
