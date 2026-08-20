# Checklist de release

## Baseline e escopo

- [ ] pedido, risco e critério de aceite definidos;
- [ ] branch e baseline conhecidas;
- [ ] status Git revisado e mudanças do usuário preservadas;
- [ ] contratos, ADRs e owners identificados;
- [ ] diff limitado ao objetivo.

## Código e contratos

- [ ] lint, typecheck e build aprovados;
- [ ] unit, integration e negative tests proporcionais aprovados;
- [ ] golden extraction/matching aprovados;
- [ ] contract, migration, security e Context Pack checks aprovados;
- [ ] versão classificada e catálogo atualizado;
- [ ] nenhum mock acidental, TODO crítico ou fallback inseguro.

## Segurança e LGPD

- [ ] Auth, papel, tenant e RLS testados quando afetados;
- [ ] PII minimizada e ausente de logs/evidências desnecessárias;
- [ ] documento malicioso e formato inválido testados;
- [ ] secret scan e dependency audit aprovados;
- [ ] retenção, exclusão, exportação e auditoria consideradas;
- [ ] provider/subprocessador aprovado quando aplicável.

## IA

- [ ] prompt, modelo, schema e parâmetros versionados;
- [ ] evidência, inferência, gap e insuficiência preservados;
- [ ] custo, média, p95, timeout, retry e fallback avaliados;
- [ ] comparação com versão anterior sem regressão injustificada;
- [ ] nenhuma decisão autônoma ou score arbitrário.

## Documentação e contexto

- [ ] owner docs atualizados;
- [ ] `PRISMA_CURRENT_STATE.md` factual;
- [ ] `pnpm run generate:prisma-context` executado;
- [ ] `pnpm run check:prisma-context` aprovado;
- [ ] documentação não declara rollout inexistente.

## QA

- [ ] ambiente e commit identificados;
- [ ] migration e configuração aplicadas;
- [ ] matriz afetada executada com evidência;
- [ ] smoke aprovado;
- [ ] rollback testável;
- [ ] riscos residuais aceitos.

## Produção

- [ ] aprovação explícita recebida;
- [ ] backup, janela e owner confirmados;
- [ ] deploy executado pelo fluxo aprovado;
- [ ] smoke pós-produção aprovado;
- [ ] métricas e incidentes monitorados;
- [ ] estado, commit e ref remota sincronizados.

Itens de produção permanecem não aplicáveis enquanto o ambiente não existir; nunca marcá-los como aprovados por inferência.
