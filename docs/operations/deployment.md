# Deployment

## Estado

O projeto Supabase Prisma-QA é o único backend remoto atual e recebe migrations e Edge Functions. O frontend roda somente localmente contra esse projeto. Por decisão explícita de produto, não será criado agora outro projeto Supabase nem hosting de frontend, pois o Prisma é usado apenas pela equipe interna e ainda não possui clientes.

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

Evidência atual em 2026-08-26: migrations foundation/M2-A/M2-B/M2-C, `curriculum_first_resume_intake` e `curriculum_first_idempotent_completion`, RPCs transacionais idempotentes, bucket privado, Edge Functions `operator-sign-in`, `operator-password-reset` e `platform-users`, login `harita.super`, Pessoas/Usuários, ingestão PDF/OCR, central documental, retry vinculado, revisão humana, aprovação atômica e resolução currículo-first com testes negativos de papel e DML direto.

## Produção futura

Não existe ambiente separado no estágio interno atual. Antes do primeiro cliente ou dado real, provisionar QA e produção isolados, definir hosting, backup, janela, compatibilidade, retenção, comunicação e rollback. Após o futuro deploy, executar smoke sem PII desnecessária, confirmar métricas e sincronizar o estado documental.

## Git

Branches de trabalho usam `codex/`. Commits são coerentes e não misturam mudanças pessoais. Push e ref remota só podem ser confirmados quando remoto existir. Merge não substitui evidência de ambiente.
