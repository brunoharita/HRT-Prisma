# Deployment

## Estado

O Supabase Prisma-QA existe e recebe migrations e Edge Functions. O frontend ainda roda localmente contra QA; não existe hosting de frontend nem projeto Supabase de produção.

## Pré-requisitos

- branch e commit identificados;
- checks locais e CI aprovados;
- migration revisada e testada;
- secrets no ambiente correto;
- Context Pack atualizado;
- release checklist preenchido;
- rollback e owner definidos.

## QA

1. aplicar migrations em ordem;
2. executar advisors e testes RLS;
3. publicar backend/UI quando existirem;
4. executar smoke e matriz proporcional;
5. registrar commit, migration, configurações, versões de IA e evidências;
6. corrigir antes de solicitar produção.

Evidência atual do QA em 2026-08-24: migrations foundation/M2-A/M2-B, RPC transacional de extração, bucket privado, Edge Functions `operator-sign-in`, `operator-password-reset` e `platform-users`, login `harita.super`, lista de Pessoas/Usuários e ingestão sintética texto -> perfil versionado.

## Produção

Requer aprovação explícita. Confirmar backup, janela, compatibilidade, retenção, comunicação e rollback. Após deploy, executar smoke sem PII desnecessária, confirmar métricas e sincronizar estado documental.

## Git

Branches de trabalho usam `codex/`. Commits são coerentes e não misturam mudanças pessoais. Push e ref remota só podem ser confirmados quando remoto existir. Merge não substitui evidência de ambiente.
