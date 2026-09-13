# Execução — Base transversal de UX

Versão 1.0.0. Autorizada por Bruno em 2026-09-13. Ler integralmente `docs/qa/agreement-ux-foundation.md` versão 1.0.0 e `docs/product/ux-foundation.md` contrato `prisma-ux-foundation-1.0.0`. Ambos incorporam a aprovação expressa nesta tarefa. Não reinterpretar D-*, P-*, F-*, A-* nem critérios CA-*.

Sequência: formalizar padrões aprovados → implementar base compartilhada → integrar navegação/estados/componentes necessários → validar amostra e fronteiras afetadas → documentar AoT e Context Pack → commit/push. Nenhum Q material permanece. Reutilizar React/Ant Design e contratos existentes, sem nova biblioteca. Aplicar Posições na interface sem renomear contratos internos.

Entrega exige todos os D-* e P-* aplicáveis PASS com evidência proporcional e limites reais. Criar `docs/qa/aot-ux-foundation.md` usando o template do repositório. Testar especialmente navegação normal/cancelada, histórico, indisponibilidade, isolamento do estado temporário, nomes dos módulos, papéis e ausência versus zero. Validar build/typecheck, testes dirigidos e visual de lista/detalhe/formulário/área pública nas larguras aplicáveis. Não rodar `pnpm run validate` sem autorização específica; reutilizar checkers de Context Pack após atualizar owners.

Preservar `.tmp.driveupload/` e qualquer material não relacionado. Não modificar regras de domínio, enviar mensagens, publicar perfis, gerar convites reais ou alterar produção. A aprovação anterior é suficiente para todas as etapas administrativas deste escopo.
