# Deployment

## Estado

O projeto Supabase Prisma-QA continua sendo o único backend remoto atual e recebe migrations e Edge Functions. Desde 2026-09-15, o frontend também possui rollout hospedado em VPS Hostinger e está disponível em `https://prisma.hrtsolutions.com.br`, usando o mesmo Prisma-QA. Não existe projeto Supabase separado de produção. O deploy web usa Docker, Nginx e Traefik com HTTPS via Let's Encrypt; o runbook reproduzível está em `deploy/README.md`.

## Pré-requisitos

- branch e commit identificados;
- checks locais e CI aprovados;
- scripts de instalação de dependências revisados e decididos explicitamente em `pnpm-workspace.yaml`; o `postinstall` não funcional do `tesseract.js` permanece bloqueado;
- Context Pack gerado com finais de linha normalizados para produzir o mesmo hash em Windows e Linux;
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

Para fontes Knowledge, executar `pnpm run knowledge:prepare -- <cbo|esco> <diretorio> <versao> <data> <saida>`. Aplicar os lotes `stage-NNNN.sql`, executar `finalize-and-diff.sql`, revisar o diff e somente então executar repetidamente a instrução de `publish.sql` com o Super Admin que aprovou até `done = true`. Cada chamada processa um lote confirmado em transação própria; replays com o mesmo hash são idempotentes, a retomada preserva o cursor e divergência ou tentativa de sobrescrever versão publicada falham fechadas.

Evidência atual em 2026-09-13: o schema funcional acumulado e `20260914015642_m61_requirement_classification_invariant` estão alinhados no repositório e ativos no Prisma-QA. As dez Edge Functions presentes no repositório permanecem `ACTIVE` e não foram alteradas neste movimento. A prova M6.1 confirmou rejeição de requisito `unclassified`, contrato `vacancy-definition-1.2.0`, grant apenas para `authenticated` e wrapper legado sem execução; a Posição afetada foi corrigida por nova versão. O histórico remoto de migrations anterior a setembro contém timestamps diferentes dos arquivos locais equivalentes; a simulação oficial falha fechada sem executar SQL. Não reparar o ledger nem reaplicar migrations antigas sem um movimento específico de reconciliação com prova de equivalência. O frontend adaptativo permanece local porque não existe hosting remoto; o smoke visual autenticado depende de uma sessão reutilizável antes de rollout futuro.

## Produção futura

Não existe ambiente separado no estágio interno atual. Antes do primeiro cliente ou dado real, provisionar QA e produção isolados, definir hosting, backup, janela, compatibilidade, retenção, comunicação e rollback. Após o futuro deploy, executar smoke sem PII desnecessária, confirmar métricas e sincronizar o estado documental.

## Git

Branches de trabalho usam `codex/`. Commits são coerentes e não misturam mudanças pessoais. Push e ref remota só podem ser confirmados quando remoto existir. Merge não substitui evidência de ambiente.
