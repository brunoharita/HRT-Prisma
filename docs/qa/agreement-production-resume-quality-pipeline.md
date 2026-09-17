# Contrato de Acordos — Qualidade da importação de currículos em produção

## Objetivo

- Versão do contrato: `1.2.0`
- Fonte da decisão / tarefa: decisões explícitas do Product Owner em 2026-09-17 para desativar primeiro o PaddleOCR e, após observar o travamento do Tesseract antes da IA, retirar todo OCR do fluxo automático. O percurso aprovado é PDF.js nativo -> Parser IA -> revisão.
- Contratos anteriores e delta: esta versão supersede D-01, D-02, D-03, D-05, P-02 e os critérios correspondentes da versão 1.1.0. Paddle e Tesseract permanecem instalados e reversíveis, mas não podem ser chamados pela importação automática durante este teste. O OCR manual por região na revisão não faz parte desta mudança. Os guardrails de evidência, revisão humana, orçamento, autenticação e privacidade permanecem.

## DEVE — Inegociável

- D-01 — Toda importação de currículo PDF deve validar o arquivo e executar somente a leitura nativa PDF.js antes do Parser IA, preservando todas as páginas, linhas e coordenadas disponíveis.
- D-02 — Texto nativo ausente ou insuficiente não autoriza perfil vazio nem aciona OCR local; o PDF completo segue ao Parser IA, que deve produzir resultado validado ou falha explícita.
- D-03 — Enquanto este teste estiver ativo, nenhuma importação automática pode chamar PaddleOCR, PP-Structure, recuperação visual Paddle ou Tesseract.
- D-04 — Depois da etapa documental, toda importação normal deve passar pelo Parser IA, ligado ao PDF, à organização, às linhas-fonte e à versão de prompt/modelo, antes de persistir o rascunho para revisão.
- D-05 — A importação normal deve executar PDF.js e depois Parser IA. Falha ou indisponibilidade da IA deve ser explícita, não pode apresentar sucesso falso e não oferece continuação pela leitura local.
- D-06 — O transporte remoto deve validar sessão, operador, papel e organização no servidor, aceitar somente contratos e rotas fixos, remover credenciais antes da máquina de inferência e não registrar currículo, prompt integral, token ou dado pessoal.
- D-07 — O resultado continua sendo rascunho rastreável para revisão humana. Nenhuma importação aprova, publica, rejeita ou decide contratação automaticamente.
- D-08 — A operação em produção deve manter limite de arquivo, timeout, serialização, cache privado, orçamento fechado e ausência de repetição automática de inferência não idempotente.
- D-09 — A telemetria documental deve poder ser persistida na base de produção sem bloquear a importação quando for apenas observabilidade opcional.

## PROIBIDO

- P-01 — Tratar a leitura nativa ou a quantidade de caracteres como perfil estruturado ou prova suficiente de qualidade sem o resultado validado do Parser IA.
- P-02 — Chamar PaddleOCR, PP-Structure, recuperação visual Paddle ou Tesseract a partir da importação automática enquanto o teste temporário estiver ativo.
- P-03 — Expor `OPENAI_API_KEY`, chave de serviço do Supabase ou credencial do usuário no bundle, nos logs ou no worker Paddle.
- P-04 — Aceitar organização informada pelo cliente sem validar sessão, operador, papel, RLS e vínculo ativo.
- P-05 — Persistir fatos sem referência verificável ao documento ou transformar falha parcial em perfil completo.
- P-06 — Publicar perfil ou conhecimento profissional sem decisão humana explícita.
- P-07 — Repetir automaticamente uma chamada de IA cujo custo ou execução anterior seja incerto.

## FORA DE ESCOPO

- F-01 — Redesenho da tela de revisão ou das regras de publicação.
- F-02 — Troca de Paddle, OpenAI, modelo ou taxonomia por novo fornecedor.
- F-03 — Reprocessamento em massa de documentos já importados.
- F-04 — Tornar a ponte temporária independente da máquina local.
- F-05 — Remover código, dependências, containers, modelos, volumes ou contratos de Paddle/Tesseract, ou alterar o OCR manual por região na revisão; a mudança é somente do roteamento automático e permanece reversível.

## AUTONOMIA DE ENGENHARIA

- A-01 — Definir a forma interna do verificador semântico, desde que os motivos sejam nomeados, determinísticos e testados.
- A-02 — Estender a ponte hospedada existente com uma rota fixa para o Parser IA e ajustar seus timeouts, limites e cabeçalhos dentro dos guardrails deste contrato.
- A-03 — Versionar contratos, prompt, proveniência, migração de observabilidade e mensagens operacionais sem alterar o comportamento acordado.
- A-04 — Escolher testes direcionados, smoke tests e evidências proporcionais ao risco, sem executar validação integral do repositório sem autorização específica.
- A-05 — Usar a flag existente `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e manter o gateway/containers disponíveis para rollback, sem tráfego de importação para Paddle.

## PENDÊNCIAS

- Nenhuma pendência material aberta para esta execução.

## CRITÉRIOS DE ACEITE

- CA-D01 — Dado um PDF válido, quando a importação iniciar, então PDF.js preserva todas as páginas e segue diretamente ao Parser IA sem estruturação determinística intermediária; teste dirigido e rastreio do fluxo.
- CA-D02 — Dado um PDF com página sem texto nativo suficiente, quando importado, então essa página permanece vinculada ao PDF enviado à IA, sem perfil vazio e sem OCR local; teste negativo.
- CA-D03 — Dado um currículo que antes acionaria Paddle ou Tesseract, quando importado com o teste ativo, então nenhuma dessas ferramentas é carregada ou chamada e o fluxo segue para Parser IA; inspeção de rede e importação autenticada.
- CA-D04 — Dada uma importação normal com transporte disponível, quando a etapa documental terminar, então o Parser IA é chamado e o rascunho persistido usa seu contrato e evidências; teste de cliente, contrato e smoke autenticado.
- CA-D05 — Dada indisponibilidade do Parser IA, quando a importação ocorrer, então a tentativa falha explicitamente, não persiste perfil incompleto e oferece somente nova tentativa; teste de falha.
- CA-D06 — Dada sessão ausente, origem incorreta, organização inválida, rota ou contrato desconhecido, quando a ponte receber a chamada, então rejeita antes de encaminhar dados; testes negativos do gateway.
- CA-D07 — Dado resultado estruturado, quando persistido, então permanece aguardando revisão e não cria publicação automática; testes de persistência existentes afetados.
- CA-D08 — Dadas chamadas simultâneas, payload excessivo, timeout ou orçamento esgotado, quando ocorrerem, então o serviço falha fechado, sem retry automático; testes de serviço e gateway.
- CA-D09 — Dada a base de produção sem a tabela de observabilidade, quando a migração for aplicada, então a tabela, RLS e contratos ficam disponíveis; verificação de migração e advisors.

## ESTADO

- `agreed`

## APROVAÇÃO

- Product Owner: Bruno
- Data: 2026-09-17
- Evidência de aprovação: após receber a comparação real com timeout de 240 segundos e resultado equivalente sem Paddle, determinou: “desative a ida para o PaddleOCR do fluxo de importação de currículo” para testar sem essa etapa.
- Evidência de aprovação do delta 1.2.0: “vamos fazer pular toda a parte que é local [...] desativar o Tesseract [...] direto da extração mais simples do PDF direto pro Parser IA”.
- Referência imutável para o prompt: versão `1.2.0` deste contrato.
