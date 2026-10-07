# Acordo — carregamento visível v2.1.6

Versão 1.0.0, aprovado pela solicitação de Bruno em 07/10/2026 para revisar todas as páginas, implementar em main, publicar 2.1.6 e memorizar a diretriz. A solicitação aprova o comportamento proposto na conversa; não há nova decisão material pendente.

- D-01: toda operação pendente que possa alterar a visualização atual deve ter sinalização visual contínua, inclusive páginas públicas, blocos, consultas parciais, modais, atualização e cálculo.
- D-02: primeiro carregamento essencial usa estado de página; operações independentes usam área/controle e aviso não bloqueante visível. Conteúdo disponível permanece utilizável, salvo bloqueio obrigatório já existente.
- D-03: operações simultâneas permanecem sinalizadas até a última terminar; conclusão, erro, cancelamento e desmontagem encerram sua sinalização. Erros e recuperação existentes permanecem.
- D-04: comunicar a operação em português, acessível e responsivo; percentual apenas mensurável. Não mostrar vazio/zero como resultado de algo ainda carregando.
- D-05: registrar diretriz permanente no owner de UX e memória; publicar somente destinos requeridos pelo diff, integrar main e versão 2.1.6. Número 2.1.5 omitido por escolha explícita de versão do PO, sem entrega fictícia.
- P-01: sinalização nunca dispara consulta, recálculo de score, IA, gravação ou decisão humana. Preservar contratos v2.1.4, permissões, tenant, originais, evidências e rascunhos.
- P-02: não interceptar toda rede indiscriminadamente, inventar progresso ou bloquear a página inteira por uma operação independente.
- F-01: mudar fórmulas, backend, schema, política de atualização, parser, síntese ou aparência estrutural aprovada.
- A-01: engenharia escolhe redação, indicador local versus página e acabamento, reutilizando React/Ant Design e estados existentes, sem biblioteca nova.
- Q: nenhum.

Aceite CA-01–05: inventário de todas as páginas/componentes assíncronos; regressão dirigida de estados e operações concorrentes, limpeza/erro e preservação; renders desktop/mobile; tipos/build e checks documentais; recibo e smoke da publicação, com limites de evidência explícitos. Cada D e P deve ser rastreado no AoT.
