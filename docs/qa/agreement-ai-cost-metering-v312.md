# Acordo — medição de IA por ação e requisição, v1.0.0

Autoridade: pedido explícito de Bruno em 18/10/2026 para implementar, validar sem novas chamadas de IA, integrar em main e publicar nova versão. Entrega 3.1.2, complementar ao movimento 3.1. Baseline e120387846bc6ed317cd401e59f1b9c0d09d0e07; risco D. Reutilizar ADR-080, ADR-083 e os ledgers existentes, sem novo fornecedor/dependência.

## DEVE

- D-01: registrar consumo por tentativa e consolidar por ação lógica, incluindo funções internas, múltiplas leituras e tentativas que falham; ausência de usage permanece desconhecida.
- D-02: preservar metadados mínimos do provedor (modelo retornado, IDs técnicos, tier, entrada/saída, cache e raciocínio), calcular custo com preço versionado e contabilizar ferramentas suportadas. Distinguir cálculo completo, parcial/desconhecido e custo observado com evidência; não chamar estimativa de fatura.
- D-03: vincular a ação às reservas comerciais por empresa/função/operação, somando cada reserva apenas uma vez e detalhando franquia/pacote/bonificação/restituição. Funções internas sem tarifa têm zero débito comercial, preservando custo API; função tarifada sem vínculo permanece explicitamente não vinculada.
- D-04: agrupar síntese por job, mantendo a referência comercial de cada tentativa mesmo após retry. Preservar as transações de entrega/liquidação existentes.
- D-05: disponibilizar consulta interna paginada por ação e requisição na Gestão de Tokens Prisma, somente para Super Admin ativo, com funções internas e detalhes progressivos de tentativas/cobrança. Metadados técnicos não alteram o extrato comercial do cliente.
- D-06: manter compatibilidade com leitores/escritores anteriores, sem inventar backfill; histórico anterior sem detalhes é identificado. Publicar migração aditiva antes dos consumidores, com rollback dos consumidores que preserve os registros.
- D-07: validar offline com mocks e PostgreSQL local descartável, incluindo permissões negativas, replay, falha, cache, retries e ausência de nova cobrança; integrar/publicar o SHA validado, versão 3.1.2 e smoke sem inferência.

## PROIBIDO

- P-01: disparar inferências durante desenvolvimento, testes ou smoke; executar classificadores/benchmarks live para preencher histórico.
- P-02: mudar tarifas, franquias, planos, regras de liquidação, prompts, modelos, dados humanos, autoridade ou decisões de contratação; duplicar débito por tentativa; atribuir custo global a empresa arbitrária.
- P-03: gravar prompts, currículos, respostas pessoais ou segredos na medição; permitir escrita de custos pelo navegador ou consulta cruzada por usuário sem autoridade.
- P-04: apresentar null como zero, cálculo como cobrança confirmada ou rateio como confirmação individual da fatura.

## FORA DE ESCOPO

- F-01: importação retroativa dos artefatos da auditoria; novas vendas, preços ou margem líquida.
- F-02: integração automática à conta financeira OpenAI, nova credencial administrativa ou importador de faturas. Mantém-se a distinção de custo observado existente; a conciliação financeira depende de dados/autorização de conta que não foram fornecidos. Nenhum custo novo será declarado conciliado.
- F-03: scripts offline de curadoria/benchmark não são runtime do produto e não serão executados/modificados para criar consumo.

## AUTONOMIA

- A-01: engenharia escolhe campos aditivos, índices, RPCs, calculadora pura, filtros/paginação e testes mínimos suficientes, reutilizando componentes e tokens visuais.
- A-02: detalhes não fornecidos pelo provedor produzem custo parcial/desconhecido com limites explícitos quando calculáveis; modelos/tier/ferramentas sem preço validado não recebem tarifa inventada.

## CRITÉRIOS DE ACEITE

CA-01/D-01: duas tentativas aparecem na mesma ação; falha mantém custo conhecido e timeout sem usage é desconhecido. CA-02/D-02: fixtures de cache, contexto longo, raciocínio, ferramentas, modelo/tier desconhecido, metadados privados e replay. CA-03/D-03: reservas distintas somadas uma vez com origem correta, vínculo de outro tenant rejeitado, interno zero versus falta de vínculo tarifado. CA-04/D-04: duas leases do mesmo job mantêm ação e snapshots de referência comercial. CA-05/D-05: tabela, detalhe e paginação testados; anon/member/recruiter/owner recusados no relatório global. CA-06/D-06: migração preserva linhas anteriores e writers v1, sem reescrita de custos; rollout/rollback registrados. CA-07/D-07: checks proporcionais, CI, publicação e smoke documentados no AoT.
