# Execução da persistência de curadoria

Contrato integral: `docs/qa/agreement-competency-curation-persistence.md`, versão 1.0.0. Ler integralmente; todos D/P/F/A/CA são vinculantes. Implementar D-01 a D-05 e impedir P-01/P-02. F-01 permanece excluído; A-01 delega a persistência e os testes, sem mudar a decisão humana.

Usar baseline 07b79f6 e branch `codex/competency-curation-persistence`. Migração forward-only, teste em PostgreSQL local descartável com rollback, documentação do proprietário e Context Pack. Recuperação remota somente por evidência exata de aprovações existentes. Publicar destinos derivados pelo dispatcher e fechar AoT distinguindo testes sintéticos, recuperação operacional real e jornada humana não executada.
