# Deployment

## Estado

Não existe deployment configurado. Este documento define o fluxo mínimo para quando QA for criado.

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

## Produção

Requer aprovação explícita. Confirmar backup, janela, compatibilidade, retenção, comunicação e rollback. Após deploy, executar smoke sem PII desnecessária, confirmar métricas e sincronizar estado documental.

## Git

Branches de trabalho usam `codex/`. Commits são coerentes e não misturam mudanças pessoais. Push e ref remota só podem ser confirmados quando remoto existir. Merge não substitui evidência de ambiente.
