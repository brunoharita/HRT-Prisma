# Prompt de Execução — M7.6 Descrição de conceito e alcance seguro na curadoria

Implemente integralmente `docs/qa/agreement-m76-curation-description-scope.md` versão 1.0.0, aprovado sobre o baseline `15a82a463ee713487f5af38265130a63b566cbfb`.

## Entendimento obrigatório

- Implementar D-01 a D-06 e provar CA-01 a CA-05.
- Impedir P-01 a P-04 com testes negativos.
- Preservar F-01 e F-02.
- Aplicar A-01 a A-03 apenas ao como; nenhuma autonomia altera a autoridade ou o escopo.

## Sequência

1. Localizar o contrato atual M7.4/M7.5, os adapters, a RPC e os campos de proposta/alias.
2. Adicionar migration versionada com RPC de curadoria sem justificativa, descrição opcional, guarda server-side de Super Admin e remoção delimitada de dados de justificativa da curadoria.
3. Atualizar UI, domínio, adapter, tipos e testes sem mudar a topologia normativa do painel.
4. Validar PostgreSQL descartável, negativos de tenant/papel/payload, typecheck, lint, Context Pack e build afetado.
5. Publicar migration/frontend conforme fluxo autorizado, executar smoke read-only e registrar imagem/rollback.
6. Atualizar ADR, owners, Context Pack, deployment e AoT; sincronizar branch, main, GitHub e VPS.

## Fidelidade visual

A imagem fornecida continua normativa para a topologia: painel lateral, fonte/termo no topo, proposta no meio e ações fixas no rodapé. O novo campo opcional entra abaixo do tipo de conceito. O alcance permanece abaixo da proposta; a justificativa desaparece sem deslocar a ação para outra superfície. Desktop e móvel devem manter a mesma ordem e acessibilidade.
