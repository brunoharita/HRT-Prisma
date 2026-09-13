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

## Correção do erro de proveniência relatado pelo PO

Causa comprovada: regex de modelo aceitava o fixture synthetic, mas rejeitava o ponto no candidato contratado gpt-5.6-luna. A primeira prova de proxy não alcançava o gate preparedParserIa anterior ao intake. Correção compatível do identificador e validação antecipada dentro do tratamento amigável do cliente. Sem alteração de modelo/prompt, banco, permissões, cache ou orçamento.

28 testes direcionados aprovados, incluindo regressão sintética fornecedor -> transporte JSON -> revalidação -> proveniência de intake, em primeira resposta e cache, com negativos de identificador vazio, separador, espaço, tamanho e quebra de linha. Typecheck web aprovado. Smoke executou o cliente real via Vite e o proxy local com o cache da tentativa do PO: nove experiências, duas formações, gate aprovado e erro de proveniência sintético traduzido. Ledger inalterado, zero reenvios externos e zero escritas Supabase. O primeiro ensaio no sandbox não conseguiu adquirir lock no diretório canônico; a execução autorizada seguinte passou. A persistência autenticada não foi simulada como sucesso.

Gate final da correção: pnpm run validate aprovado (386 testes técnicos, 19 golden, lint, foundation, Context Pack, typechecks, build web e demo local). Diff e assets verificados sem segredo. A correção segue para a raiz oficial por fast-forward; não requer migração ou nova chamada ao modelo.

## Correção visual do cartão de documento

PO apontou desalinhamento do ícone, nome e ação Ver documento. Causa: seletores de span e anticon atingiam todos os descendentes, inclusive ícones e texto do botão. CSS agora limita essas regras aos filhos diretos, fixa o ícone, permite quebra do nome e mantém a ação compacta. Cartões compartilhados da jornada/Delta preservam comportamento. Conferência visual com componentes Ant Design e CSS reais, conteúdo sintético, larguras 445 e 342 px: ícones de 22 px, botões contidos e nenhum overflow, inclusive nome longo sem espaços. Prévia temporária removida. Sem alteração de extração, navegação, dados ou contratos persistidos.

Validação da correção visual: pnpm run validate aprovado; 386 testes, 19 golden, typechecks/build, foundation e Context Pack. Diff revisado; apenas CSS e documentação alterados.

## Correção da persistência de evidências de listas

Erro relatado pelo PO após identificar a Pessoa. A definição vigente de public.persist_person_extraction foi consultada por leitura no único projeto configurado: aceita competencies, rejeita competencies.0. A integração usava índices nos descritores de competências, idiomas, certificações e áreas de atuação. Correção local reutiliza a raiz canônica; os fatos continuam separados em arrays e cada span mantém seu descritor/coordenadas. preparedParserIa adapta também proposta anterior ainda em memória, sem mutar fatos ou exigir reenvio. Contrato parser-ia-1.0.0 preservado; não altera SQL, grants, RLS, modelo ou prompt.

Regressões cobrem as quatro listas, múltiplos itens e regiões, proveniência bruta e retomada sem mutação. Replay privado da tentativa de João: nove experiências, duas formações, três competências e 115 descritores distribuídos em 39/34/32/10 por página; nenhum caminho ou geometria inválido, inclusive na proposta anterior adaptada. Consulta SELECT com somente os 48 caminhos distintos, sem conteúdo do currículo, confirmou zero rejeições pela regex efetiva do banco. Nenhuma gravação, migração ou publicação remota executada. Isso valida a fronteira que falhou; não é prova de publicação autenticada do Perfil.

Gate final aprovado: pnpm run validate, 388 testes técnicos, 19 golden, typechecks/build, lint, foundation e Context Pack. Correção e compatibilidade de retomada seguem integradas localmente; a publicação real do Perfil continua sob revisão do operador.

## Recuperação após sair da importação interrompida

O relato mais recente mostra a Central da Pessoa, fora da jornada com arquivo em memória. Consulta remota somente de leitura confirmou intake failed, tentativa failed_structuring com zero caracteres, zero páginas persistidas e objeto original existente no Storage. O último registro não prova uma nova falha da versão corrigida. A lacuna reproduzida é a ausência de retomada quando a rota anterior exige páginas salvas.

Ação Retomar importação com IA recupera a fonte privada com a sessão atual, valida documento/intake no mesmo tenant e Pessoa, compara caminho e SHA-256 e usa a preparação/persistência/conclusão existentes. Guardas excluem versão desconhecida, legado, revisão existente e documento aprovado. Fonte divergente bloqueia antes de chamada IA ou gravação. Reprocessamento histórico geral, autorização, RLS, schema, publicação e modelo permanecem iguais.

Prova local privada executou o serviço real via Vite, PDF original e resposta salva da tentativa, com cliente Supabase simulado: nove experiências, duas formações, geometria e caminhos aceitos pelo contrato vigente, chamadas apenas persist_person_extraction e complete_resume_intake, mesmos IDs e idempotência. Regressão permanente equivalente usa PDF sintético sem dados reais, LLM ou banco; inclui fonte, vínculo e versão divergentes e filtros de organização/Pessoa. Nenhuma mutação remota ou publicação autenticada foi executada pelo agente.

Gate final: pnpm run validate aprovado, com 390 testes técnicos, 19 golden, lint, foundation, Context Pack, tipos, build web e demo. A primeira execução identificou uma asserção textual antiga que excluía a nova recuperação; ela foi atualizada mantendo os guardas de falha e acrescentando a rota de retomada. Segunda execução integral aprovada. Diff e assets sem chave; aviso preexistente de chunk grande permanece.

## Nova importação: contrato completo do contato

PO excluiu a Pessoa anterior, realizou nova importação e pediu teste completo. A retomada anterior não corrigia o contrato do rascunho; os testes simulavam a gravação e verificavam somente geometria/caminhos. O rascunho do caso real tinha LinkedIn sem HTTPS e com acento no caminho, rejeitado por private.is_valid_structured_resume_summary e pela validação local de revisão. SELECTs com URLs sintéticas reproduziram as duas rejeições no validador efetivo e aceitaram HTTPS com Unicode codificado. Normalização compatível adicionada somente ao rascunho, inclusive resultados antigos preparados; fatos/citações originais permanecem iguais.

Regressões cobrem protocolo ausente, HTTP/HTTPS, barra final, acento, valor previamente codificado e ausência de mutação. Teste do serviço agora inclui contato e valida todo o rascunho com validateReviewDraftForSave antes da resposta simulada de persistência. Replay privado do caso real: antes contact.linkedin inválido; depois zero pendências de contrato, nove experiências e duas formações. Isso não substitui o teste autenticado solicitado.

Gate local aprovado: pnpm run validate, 392 testes técnicos, 19 golden, lint, foundation, contexto, tipos, build e demo. Varredura de diff/assets sem chave. Teste de navegador autenticado chegou à seleção do PDF; o clique Importar foi rejeitado pelo auto-review por exigir reconhecimento explícito do arquivo e destinos. Confirmação específica solicitada ao PO; nenhuma mutação de importação realizada pelo agente até este ponto.
