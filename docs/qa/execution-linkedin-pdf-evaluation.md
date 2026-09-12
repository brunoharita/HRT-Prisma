# Instruções de execução parcial - PDF LinkedIn

Versão 1.0.0. Leia integralmente `docs/qa/agreement-linkedin-pdf-evaluation.md` versão 1.0.0 antes de executar. Este documento incorpora todos os D/P/F/A/CA daquele acordo sem reinterpretá-los. Não é o prompt final da avaliação externa enquanto as condições materiais dela estiverem abertas.

Executar o bloco local autorizado por Bruno em 2026-09-12: protótipo reutilizando contratos existentes, fixtures sintéticas, execução privada nas amostras fornecidas, comparação com baseline e pacote externo revisável. Preservar D-01 a D-09, provar as proibições aplicáveis, respeitar F-01 a F-03 e usar autonomia A-01 a A-04. Não implantar nem ligar o protótipo ao frontend.

1. Partir da raiz oficial em branch isolada; preservar material alheio. O worktree desta tarefa usa baseline `22b41f7`.
2. Ajustar somente com PDF do PO e fixtures sintéticas. Congelar hash da implementação antes de abrir os quatro documentos de avaliação. Qualquer ajuste após olhar seus resultados deve identificar contaminação e exigir nova avaliação independente para generalização.
3. Preservar PDF.js, páginas/links/geometria, StructuredDraft, IDs e classificador. Testar associações e ausência de invenção, não somente contagens.
4. Rodar baseline nativo e protótipo local nos mesmos documentos; resultados completos apenas em `tmp/linkedin-evaluation/`, ignorado pelo Git. Relatório versionado apenas com estatísticas e limitações sem PII.
5. Preparar um contrato de avaliação com comparação campo a campo e aprovação humana da referência, sem chamar resultados do agente de verdade humana. Nenhuma métrica sem denominador/referência.
6. Documentar alternativas GPT e preflight concreto, sem chamadas enquanto condições materiais/credencial estiverem abertas.
7. Validar código afetado e regressões pertinentes; atualizar owner e Context Pack, gerar export/check. Revisar diff, commit/push scoped conforme autorização atual. Fechar AoT sem marcar requisitos não demonstrados como concluídos.
