# Tokens Prisma: três propostas visuais

14/10/2026. Material de decisão, com dados e pessoas fictícios. Nenhum desenvolvimento, alteração de produto, cadastro, migração, publicação ou chamada paga de IA do Prisma realizada. Imagens geradas com a ferramenta integrada image_gen; prompts completos em `prompts.json`. A composição escolhida ainda depende da decisão do Product Owner. Estes mockups não são telas do sistema em produção.

## Regras comuns às alternativas

- Franquia de1.000.000 por mês calendário no horário de Brasília. Início no dia1 às00h e término na virada para o mês seguinte, sem acumulação. Ativação durante o mês recebe franquia integral até essa virada.
- Cada adicional dura30dias a partir do pagamento confirmado e efetiva liberação. Solicitar não cobra, concede ou inicia a validade. Nenhuma exceção de12meses para pacotes antigos: Bruno esclareceu que ainda não há clientes utilizando. Na implementação, validade é calculada a partir da aquisição/liberação real, sem inventar novo prazo de30dias a partir da migração.
- Consumo primeiro na franquia; depois nos adicionais pelo vencimento mais próximo. Pode dividir uma operação entre origens. Pacote pode expirar enquanto há franquia: informação e aviso visíveis.
- Disponível exclui reservas e créditos vencidos; operações em andamento aparecem separadas quando existirem. Débito só com entrega válida; falha sem entrega libera; reexecução idempotente, histórico e autoridade humana preservados.
- Empresa vê apenas seus dados. Owner/admin veem composição, consumo, planejamento, pacotes e solicitações. Super seleciona a empresa e vê as mesmas informações, além da gestão. Operadores continuam com indicação discreta por ação, sem catálogo financeiro.
- Previsão determinística, sem LLM, baseada nos últimos7dias completos incluindo dias sem uso; alternativa de30dias. Considera vencimentos, prioridade e renovação. Sem histórico suficiente, mostrar indisponibilidade; sem consumo recente, informar essa condição. Não garantir uma data futura.
- Referência diária da franquia = saldo disponível da franquia / tempo restante até renovar. É orientação para o saldo durar, não incentivo a gastar, limite ou bloqueio diário. Vencimentos dos adicionais ficam explícitos separadamente.
- Histórico por data/período/função/usuário/operação, quantidade, consumo e origem; link contextual autorizado. Em falta de saldo, bloquear apenas nova IA paga, preservando rascunhos, consultas e ações manuais.
- Preço somente no contexto de pacote para gestores. Sem compra ou liberação automática. Fluxo: solicitar → aguardar pagamento → super verificar comprovante/referência → liberar uma única vez. Recusa/cancelamento motivados.
- Gestão do super mantém cadastro de pacotes/preços e versões de tarifas em seções próprias. Não oferecer dia de renovação por aniversário nem validade de12meses.

## Dados de comparação

Mesmo estado nas três opções:14/10/2026 às00h de Brasília. Disponível800.461 = franquia615.032 + adicionais185.429. Consumo no mês384.968 = currículos206.990 + questões140.820 + sínteses37.158. Reservas atuais inexistentes no exemplo; não são omitidas por regra.

A média ilustrativa41.425/dia vem de289.972 em7dias completos, arredondada somente para apresentação. Referência34.168/dia = piso(615.032/18). Próxima renovação01/11. O adicional adquirido20/09 às09h vence20/10 às09h, exatos30dias depois. Como a franquia é consumida primeiro e dura mais que esse pacote, o adicional pode expirar sem ser utilizado. Nesse ritmo, a franquia acaba por volta de28/10. Não usar saldo total/média ignorando essa expiração.

## 1. Visão geral compacta

Imagem `01-visao-geral.png`. Empresa: cabeçalho, faixa com saldo e composição, previsão e referência diária; uso por função, próximos vencimentos e últimas utilizações. Super: lista de empresas, detalhe selecionado e solicitação com confirmação de pagamento. Mobile empilha esses grupos e mantém vencimentos acessíveis.

Menu empresa: Administração → Tokens Prisma. Menu super: Administração → Gestão de Tokens. Processo: conferir resumo → abrir histórico/pacotes → solicitar se necessário → acompanhar status. Super localiza empresa → confere composição/solicitação → confirma pagamento → libera. Pacotes e tarifas em aba própria.

Ponto forte: leitura rápida, familiaridade com os cards existentes. Custo de UX: concentra mais indicadores no início; exige conter a ênfase no consumo e evitar CTAs repetidos na implementação.

## 2. Planejamento do mês

Imagem `02-planejamento.png`. Empresa: linha do tempo como área principal; saldo/composição em coluna lateral. Eventos de vencimento, possível esgotamento e renovação explicitam o futuro. Uso por função, histórico e pacotes ficam em abas abaixo. Super acompanha a mesma linha do tempo da empresa selecionada e os pedidos. Mobile converte a linha horizontal em agenda vertical.

Mesmos menus e processo comercial. Entrada prioriza entender se o saldo dura até a renovação; detalhes e solicitação vêm depois. Pagamento confirmado continua obrigatório para liberar, sem simples aprovação comercial equivalente a crédito.

Ponto forte: compreensão dos prazos e do efeito das expirações. Custo de UX: planejamento ocupa mais espaço e o histórico fica um nível abaixo. Linha do tempo deve comunicar estimativa e não induzir certeza.

## 3. Saldo por origem — recomendada

Imagem `03-saldo-por-origem.png`. Empresa: saldo total discreto, duas origens ordenadas e numeradas, com franquia primeiro e cada pacote abaixo; prioridade e validade junto dos valores. Movimentações por origem/função logo abaixo; planejamento lateral compacto. Super usa a mesma organização dentro do detalhe da empresa e tem ações administrativas/solicitações separadas. Mobile transforma origens em blocos expansíveis, mantendo total e vencimentos visíveis.

Mesmos menus. Processo: compreender de onde vem o saldo → conferir uso/histórico → consultar referência/previsão → solicitar pacote quando necessário. Super seleciona empresa → revisa origens/pedidos → registra pagamento verificado → libera. Cadastro de preços/tarifas e configuração da franquia em abas próprias.

Ponto forte: traduz diretamente a regra de consumo e funciona com múltiplos pacotes sem dar destaque financeiro. Custo de UX: precisa de filtro/expansão quando há muitos lotes. A previsão permanece visível, mas secundária à composição.

## Recomendação

Escolher a3: saldo e origem explicados antes da projeção, preços restritos ao contexto comercial, histórico próximo e prioridade inequívoca. Conservar a previsão e referência na lateral; oferecer a linha do tempo da2 como detalhe opcional somente se aprovada, sem incorporar escopo automaticamente.

As imagens são referências de composição e hierarquia, não contratos de texto nem dados reais. Rótulos periféricos de menu, nomes, datas de exemplo e detalhes decorativos são ilustrativos; regras acima e a decisão explícita do Product Owner prevalecem. Nenhuma alternativa ainda foi escolhida para implementação.
