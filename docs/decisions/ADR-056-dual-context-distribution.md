# ADR-056 — Fonte compacta para prompts e contexto portátil completo

- Status: aceito
- Data: 2026-09-14

## Contexto

As cinco fontes canônicas em `docs/ai-context`, junto de `AGENTS.md` e `README.md`, sustentavam uma única exportação por concatenação. Esse arquivo eliminava o envio manual de muitas fontes, mas misturava estado vigente, histórico e detalhe operacional em cerca de 146 mil caracteres. O GPT usado para preparar prompts recebia ruído desnecessário, enquanto a exportação completa continuava útil para portabilidade a outra IA.

## Decisão

Preservar as cinco fontes canônicas e os owners especializados como fonte de verdade. A mesma rotina gera dois artefatos derivados com manifesto comum:

- `FONTE_GPT_PRISMA.md`: seleção compacta, limitada a 60 mil caracteres, com contexto vigente, invariantes, linguagem, protocolo de acordos e mapa de aprofundamento que o prompt repassa ao Codex;
- `TUDO_SOBRE_PRISMA.md`: exportação completa e portátil de `AGENTS.md`, `README.md` e todos os documentos especializados em `docs/**/*.md`.

Os artefatos declaram papel, versão e manifesto e nunca recebem edição manual. O verificador compara conteúdo com finais de linha normalizados, preservando detecção semântica de defasagem em Windows e Linux. Um arquivo compacto não prova implementação: o prompt deve exigir leitura do código, contrato, ADR e evidência aplicáveis.

## Consequências

O Product Owner substitui somente um arquivo nas fontes permanentes do GPT e mantém uma exportação completa para outra IA. A documentação continua atualizada em seus owners, sem nova fonte concorrente. O manifesto das duas saídas cobre toda a documentação especializada, mesmo quando a fonte compacta projeta somente a parte necessária. A sincronização automática com serviços externos permanece fora desta decisão.
