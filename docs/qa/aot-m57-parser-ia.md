# AoT - M5.7 Parser IA

Contrato: `agreement-m57-parser-ia.md` 1.1.0; execução 1.1.0. Data: 2026-09-12. Estado geral: PARTIAL.

| ID | Implementação e evidência | Status | Limite |
| --- | --- | --- | --- |
| D-01 | Backend/probe sem cliente Supabase; execução local e testes sintéticos | PASS | Nenhum deploy/mutação remota executado |
| D-02 | Schema estrito, spans PDF.js, suporte textual, validação e adaptação para StructuredDraft | PASS | Suporte textual não prova associação semântica |
| D-03 | Testes de e-mail partido, cargos, múltiplas páginas, formação incompleta, listas e duplicata | PASS | Generalização e PDF somente imagem não demonstrados |
| D-04 | Preparação antes da identidade nas telas existentes; rascunho reutilizado, org/hash e versão modelo/prompt | PARTIAL | Build e contratos locais passam; persistência e navegação ponta a ponta não executadas |
| D-05 | Erros sanitizados, parcial explícito, ausência de fatos rejeitada e opção de leitura local após falha | PASS | Smoke interativo ainda não executado |
| D-06 | Testes negativos de segredo, origem/host, cache por organização, limite de resposta, timeout, concorrência e orçamento persistido | PASS | Serviço experimental não é backend online |
| D-07 | Resposta real de evaluation-03, replay e testes negativos | PASS | PO dispensou novos envios de Diego/Ivan; regressão conhecida, sem generalização |
| D-08 | ADR-049, contrato, prompt, documentação, estado atual e export regenerado/verificado | PASS | Estado geral permanece PARTIAL pelos itens anteriores |

## Proibições

| ID | Prova | Status |
| --- | --- | --- |
| P-01 | Testes de campos inexistentes, país como estado, fonte ausente, paths de autoridade/prototype e zero fatos; nenhuma publicação chamada pelo backend | PASS |
| P-02 | Chave carregada somente no backend, origem/host local, resposta com limite, endpoint fixo, timeout sem retry e ledger; segredo não versionado | PASS |
| P-03 | Prompt sem referência humana, cache guarda proposta original e validação; parcial/falha explícitos e fallback por ação humana | PASS |
| P-04 | Nenhuma chamada ao Supabase/Hostinger, nenhuma mudança de Auth/RLS/migração | PASS |

## Resultado real e limitações

Uma chamada concluída ao candidato gpt-5.6-luna para o PDF evaluation-03. Latência 20.736 ms; entrada 21.630, saída 2.705 tokens; custo superior estimado US$ 0,0086535. Tentativa anterior bloqueada por EACCES no sandbox deixou reserva conservadora de US$ 0,60 no ledger; não foi assumida gratuita. Total contábil reservado/medido até aqui: US$ 0,6086535, dentro do teto de US$ 2.

Após correção local do validador/comparador, replay sem rede: 49/50 campos com igualdade normalizada, zero grupos ambíguos/sem associação e uma diferença de grafia de cargo; uma proposta indevida de país como estado foi descartada. Preservados a referência aprovada, a resposta bruta e o resultado anterior. Não é 98% de acerto geral, nem resultado cego, nem aprovação humana da nova saída.

O auto-review rejeitou duas vezes a execução com o conjunto completo: considerou faltar autorização inequívoca para enviar os dados pessoais de Diego/Ivan à OpenAI. A segunda solicitação trouxe trechos do histórico comprovando autorização de desenvolvimento e ciência da API externa; ainda assim foi rejeitada. Nenhuma rota alternativa foi usada para esse envio.

Artefatos completos somente em `tmp/m57-parser-ia/`; relatório final local em `runs/final-local-v1/report.json`. Referências privadas anteriores em `tmp/linkedin-evaluation/human-review/` permanecem intactas.

## Validação

68 testes direcionados aprovados: domínio M5.7, transporte e benchmark, regressões de extração adaptativa, identidade e Delta. Build TypeScript, typecheck web e build web aprovados. Context Pack regenerado/verificado, lint 439 arquivos e diff check aprovados. Verificação dos 11 assets JavaScript do build encontrou zero ocorrências do segredo local. Aviso preexistente de chunk >900 KB. Validação total do repositório não executada, conforme regra de testes proporcionais.

## Git e ambiente

Branch local `codex/m5-7-parser-ia`, derivada de `43c36e0`. Na primeira entrega a implementação não estava integrada. Na ativação autorizada, a raiz oficial recebeu fast-forward, .env.local passou a habilitar IA e o backend foi iniciado em loopback, preservando o Vite existente e o material alheio .tmp.driveupload/. Somente .env.local privado contém a credencial configurada anteriormente. Commit/sincronização do movimento são registrados na resposta de entrega; não representam rollout.

## Desvios e conclusão

D-07 revisado explicitamente pelo PO: outras duas amostras dispensadas. Validação ponta a ponta com persistência permanece não demonstrada; portanto M5.7 não está concluído nem autorizado para publicar o backend local. Atualizar Supabase existente e Hostinger permanece etapa posterior. Git contém somente código/testes/documentação, nunca currículos, chaves ou referência humana privada.

## Ativação para uso direto, autorizada em 2026-09-12

O PO pediu preparar o Prisma para usar diretamente. Comando único `pnpm run dev:ia`, flag DEV, aviso visível e leitura nativa anterior à IA implementados. Integração na raiz oficial conserva configuração Supabase e ledger privado existente. O operador continua usando as mesmas etapas de identificação, revisão e publicação. O smoke do agente não grava currículo no Supabase nem envia outras amostras ao fornecedor. Ativação concluída: Vite da raiz oficial entrega parserIaClient com flag true e a tela com aviso de IA; parser escuta 127.0.0.1:8787. O proxy real retornou 200 usando exclusivamente cache autorizado de João: quatro páginas, 50 fatos, status partial, ledger byte a byte inalterado. Origem externa negada com 403. Zero reenvios externos e zero gravações Supabase neste smoke. Navegador exibiu login com o build integrado; não houve sessão autenticada nem prova interativa de importação/persistência. Acesso direto: http://localhost:5555/profiles/import. Reinício: pnpm run dev:ia.

Gate de ativação: `pnpm run validate` aprovado conforme gate solicitado nas instruções fornecidas nesta rodada: lint 440 arquivos, foundation, contexto, typechecks, build web, 385 testes, 19 golden e demo local. Também passaram os 30 testes específicos M5.7. Varredura dos 11 assets JavaScript e diff: segredo ausente. Aviso preexistente de chunk grande permanece.
