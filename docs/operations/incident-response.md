# Resposta a incidentes

## Estado

Processo inicial documentado; equipe, contatos, SLAs e canais ainda não foram designados.

## Severidade

- SEV-1: vazamento de PII/tenant, secret exposto, acesso privilegiado indevido, decisão automatizada danosa.
- SEV-2: perda ou corrupção relevante, provider vazando dados, indisponibilidade crítica, regressão ampla.
- SEV-3: falha limitada com workaround seguro, atraso ou degradação sem exposição.

## Fluxo

1. detectar e criar correlation ID;
2. conter sem apagar evidência;
3. revogar sessão/key e desativar capability quando necessário;
4. preservar logs sanitizados, versões, commit, migration e ambiente;
5. avaliar dados, tenants e titulares afetados;
6. corrigir e validar em QA;
7. aprovar produção e executar smoke;
8. comunicar conforme obrigação legal e contrato;
9. registrar causa, impacto, timeline, ações e prevenção;
10. atualizar threat model, testes, ADRs e Context Pack.

## Proibições

Não resolver incidente apagando logs, reescrevendo histórico, copiando PII para tickets, testando diretamente em produção ou usando secret privilegiado como bypass permanente.

## Exercícios antes do piloto

Simular vazamento cross-tenant, secret exposto, currículo malicioso, provider indisponível, migration incompatível e exclusão de titular.
