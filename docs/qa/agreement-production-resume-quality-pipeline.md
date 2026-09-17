# Contrato de Acordos — Qualidade da importação de currículos em produção

## Objetivo

- Versão do contrato: `1.1.0`
- Fonte da decisão / tarefa: decisão explícita do Product Owner em 2026-09-17 para desativar temporariamente o PaddleOCR no fluxo de importação e testar o percurso real PDF.js -> Parser IA -> revisão.
- Contratos anteriores e delta: esta versão supersede D-03, D-05, P-02 e os critérios correspondentes da versão 1.0.0. A integração Paddle permanece instalada e reversível, mas não pode ser chamada durante este teste. Os guardrails de evidência, revisão humana, orçamento, autenticação e privacidade permanecem.

## DEVE — Inegociável

- D-01 — Toda importação de currículo PDF deve começar pela leitura PDF.js e pela estruturação determinística existente.
- D-02 — A saída inicial deve passar por uma verificação semântica explicável; um currículo multipágina sem trajetória profissional identificada não pode ser considerado suficiente apenas por possuir muitos caracteres.
- D-03 — Enquanto este teste estiver ativo, toda importação deve permanecer no modo `baseline`: PDF.js e a estruturação determinística executam, mas nenhum endpoint Paddle pode ser chamado.
- D-04 — Depois da etapa documental, toda importação normal deve passar pelo Parser IA, ligado ao PDF, à organização, às linhas-fonte e à versão de prompt/modelo, antes de persistir o rascunho para revisão.
- D-05 — A importação normal deve executar PDF.js e depois Parser IA. Falha ou indisponibilidade da IA deve ser explícita e preservar a opção consciente de continuar somente com a leitura local.
- D-06 — O transporte remoto deve validar sessão, operador, papel e organização no servidor, aceitar somente contratos e rotas fixos, remover credenciais antes da máquina de inferência e não registrar currículo, prompt integral, token ou dado pessoal.
- D-07 — O resultado continua sendo rascunho rastreável para revisão humana. Nenhuma importação aprova, publica, rejeita ou decide contratação automaticamente.
- D-08 — A operação em produção deve manter limite de arquivo, timeout, serialização, cache privado, orçamento fechado e ausência de repetição automática de inferência não idempotente.
- D-09 — A telemetria documental deve poder ser persistida na base de produção sem bloquear a importação quando for apenas observabilidade opcional.

## PROIBIDO

- P-01 — Tratar quantidade de caracteres como prova suficiente de qualidade sem verificar o resultado estruturado.
- P-02 — Chamar PaddleOCR, PP-Structure ou a recuperação visual Paddle a partir da importação enquanto o teste temporário estiver ativo.
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
- F-05 — Remover código, containers, modelos, volumes ou contratos Paddle; a mudança é somente de ativação reversível.

## AUTONOMIA DE ENGENHARIA

- A-01 — Definir a forma interna do verificador semântico, desde que os motivos sejam nomeados, determinísticos e testados.
- A-02 — Estender a ponte hospedada existente com uma rota fixa para o Parser IA e ajustar seus timeouts, limites e cabeçalhos dentro dos guardrails deste contrato.
- A-03 — Versionar contratos, prompt, proveniência, migração de observabilidade e mensagens operacionais sem alterar o comportamento acordado.
- A-04 — Escolher testes direcionados, smoke tests e evidências proporcionais ao risco, sem executar validação integral do repositório sem autorização específica.
- A-05 — Usar a flag existente `VITE_DOCUMENT_INTELLIGENCE_MODE=baseline` e manter o gateway/containers disponíveis para rollback, sem tráfego de importação para Paddle.

## PENDÊNCIAS

- Nenhuma pendência material aberta para esta execução.

## CRITÉRIOS DE ACEITE

- CA-D01 — Dado um PDF válido, quando a importação iniciar, então PDF.js e a estruturação determinística executam antes das etapas externas; teste unitário e rastreio do fluxo.
- CA-D02 — Dado um currículo de múltiplas páginas cuja estruturação não encontre experiências, quando a qualidade for avaliada, então o motivo semântico força a rota estrutural; teste negativo com fixture equivalente ao caso observado.
- CA-D03 — Dado um currículo que antes escolheria rota estrutural, quando importado com o teste ativo, então nenhuma requisição Paddle ocorre, a telemetria registra modo `baseline` e o fluxo segue para Parser IA; inspeção de rede e importação autenticada.
- CA-D04 — Dada uma importação normal com transporte disponível, quando a etapa documental terminar, então o Parser IA é chamado e o rascunho persistido usa seu contrato e evidências; teste de cliente, contrato e smoke autenticado.
- CA-D05 — Dada indisponibilidade do Parser IA, quando a importação ocorrer, então a tentativa não apresenta sucesso falso e oferece continuação local consciente, sem recorrer ao Paddle; teste de falha.
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
- Referência imutável para o prompt: versão `1.1.0` deste contrato.
