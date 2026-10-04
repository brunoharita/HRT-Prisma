# Prisma v2.0.3 — orientação para erros corrigíveis

Versão 1.0.0, agreed, 2026-10-04. Autoridade: Bruno pediu mensagens em português claro, indicando o que alterar sempre que o usuário puder resolver sozinho, e publicação como v2.0.3. Baseline `6401d72d34b1133a9d9d328c68ae3ffeb5dd2eb6`. Risco C: tradutor compartilhado e validação de revisão; não altera persistência, permissões ou regras de publicação do banco.

- D-01: traduzir recusas conhecidas e corrigíveis em orientação concreta, com campo/ação quando identificável. Cobrir telefone, contatos mínimos, justificativas, comparação/publicação, evidências, mesclagem e estados recuperáveis, preservando os demais tradutores existentes. CA: catálogo dirigido, respostas legadas e `operation-feedback-2.0.0`, categorias e recuperação corretas.
- D-02: antecipar na revisão a validação de telefone já imposta pelo servidor e indicar como corrigir antes de publicar. Campo atual aceita um número; vários números não são concatenados, selecionados ou modificados automaticamente. Operador escolhe o contato no campo ou deixa vazio se há e-mail. Original/evidências permanecem. CA: dois números, incompleto, internacional, nacional, vazio com e-mail/contato existente, sem mutação do draft.
- D-03: reusar navegação/foco do campo e listas de pendências existentes. Mensagens de limites devem nomear o campo; nenhuma orientação técnica ou detalhe bruto de SQL/dados privados. Falha interna desconhecida não é transformada em erro humano. Auth/tenant têm precedência. CA: negativos de autorização, detalhe malformado/injetado, erro desconhecido e preservação do fluxo.
- D-04: registro único v2.0.3, documentação/Context Pack, validação proporcional, main/origin/VPS e implantação somente web. CA: tipos/build, testes afetados, CI, SHA/versão/HTTPS/assets e rollback; separar limite de smoke autenticado.
- P-01: sem relaxar gates, inventar motivo/decisão humana, escolher/remover contatos automaticamente, expor respostas técnicas/PII ou transformar falha do sistema em obrigação de corrigir campo.
- F-01: suporte a múltiplos telefones no modelo/cadastro, migrações, Parser/OCR/IA, matching/Knowledge, mudança de composição visual, saneamento histórico e publicação real para testar.
- A-01: catálogo determinístico, reutilização dos validadores e navegação, fixtures sintéticas, detalhes de execução e entrega delegados à engenharia. Sem nova biblioteca.
- Q-01: nenhuma decisão pendente neste escopo. A escolha sobre modelo com vários telefones da discussão anterior não é implementada; o pedido atual autoriza orientação para o campo existente.

## Mapa de impacto inicial

| Capacidade | Relação | Baseline / regressão proporcional |
| --- | --- | --- |
| Tradução compartilhada de erros | direct | alguns motivos legados caem em genérico; catálogo e regressão reviewOperationErrors, serviços e verificações |
| Revisão/comparação/publicação | direct | PDF 3 draft/lock 2, zero Perfil; SQL 22023 reviewed_phone_invalid, dois telefones; validação e person-flow |
| Auth/tenant/privacidade | critical_transversal | tradutor não autoriza operação; negativos e fronteiras de serviços, sem mudança de grants/RLS |
| Navegação/foco e pendências | plausible_indirect | botão/foco já existem; regressão e inspeção consumidores, sem redesenho |
| Versão/login/sidebar e web | direct | v2.0.2/build 96e3ecb; registro único, build e smoke publicação v2.0.3 |
| Banco/Parser/cache/Unicode/Knowledge/matching | no_impact_identified | nenhum produtor persistido ou cálculo alterado; diff/plano e person-flow, Parser preservado no rollout |

## Execução congelada

Implementar D-01 a D-04 sob P-01 e F-01, com A-01. Este acordo incorpora o prompt de execução autorizado. Capturas do incidente são contraexemplos de mensagem, não referência de redesenho; manter estrutura e ações existentes. AoT registra novidade, preservação e limites de prova.
