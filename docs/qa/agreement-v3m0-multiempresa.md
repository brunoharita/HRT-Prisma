# Acordo V3M0 — administração multiempresa

Versão 1.0.0, agreed, Bruno17/10/2026. Fonte: decisões deste chat sobre paridade funcional com Horus, quatro perfis e autorização final «faça tudo e determine esses parâmetros sozinho». A autonomia inclui os parâmetros abaixo; não exige ratificação de detalhes mecânicos. V3M0 identifica o movimento, não autoriza3.0.0; entrega escolhida2.9.0.

## DEVE

- D-01 — Somente Super Admin, Owner, Recruiter e Usuário comum na interface. Admin legado converge para Recruiter; histórico preservado. Super vê todos; Owner governa seu grupo e todas as empresas dele; Recruiter administra somente vínculos explícitos em empresas do mesmo grupo.
- D-02 — Administração de grupos/empresas inspirada nas telas Accounts/Empresas do Horus: listagem, busca, identificação, situação, Owner, empresa principal, plano e capacidade. Cadastro de grupo pelo Super; criação de empresa por Super/Owner/Recruiter ativo, no próprio grupo, com Owner válido e capacidade contratada. Criador autorizado recebe vínculo administrativo na empresa criada; criação pelo Super usa o Owner como administrador inicial.
- D-03 — Plano da conta/grupo e autoridade independentes. Essential/Essential Plus1empresa; Professional1incluída, capacidade contratada configurável até5; Enterprise capacidade explicitamente configurada. Configuração exclusiva Super. Capacidade conta todas as empresas cadastradas, inclusive inativas/em preparação; inativar não libera slot. Default de novos grupos Professional/1; grupos existentes preservam empresas e recebem capacidade pelo menos igual à quantidade atual, sem concessão fictícia/pagamento. Preços de assinatura provisoriamente não definidos, sem cobrança/checkout; todos os recursos atuais preservados, sem gates comerciais inventados. Tokens continuam por empresa e com contratos atuais.
- D-04 — Um Owner ativo por grupo. Novos grupos começam em preparação; Super cadastra a primeira empresa e designa/ativa Owner pelo fluxo de Usuários existente. Ativação exige Owner ativo e empresa principal do próprio grupo. Sem escolher pessoas ou transferir dados automaticamente. Alteração de nome/situação/configuração auditada; operações rejeitam versão/revisão obsoleta. Inativação não apaga dados, vínculos ou saldos; empresas inativas ficam fora da operação, mas visíveis na administração autorizada.
- D-05 — Recruiter administra Recruiters e usuários comuns no próprio escopo; concessão/revogação por empresa não amplia outras empresas. Usuário existente do mesmo grupo pode ser vinculado explicitamente sem criar nova identidade. Conta e histórico são preservados; escopo de terceiros fora da autoridade não é exposto. Ativação de nova identidade e recuperação reutilizam Supabase Auth/Edge existentes.
- D-06 — Usuário comum opera na empresa padrão sem seletor. Múltiplos vínculos comuns permitidos no grupo; preferência padrão única, validada no servidor. Sem acesso a administração, currículos privados, Posições ou Processos. Contexto da empresa separado em navegação/estado e respostas atrasadas descartadas.
- D-07 — Tenant/RLS/grants/servidor são autoridade. Grupo não compartilha dados entre empresas. Limite verificado com lock, sem ultrapassagem concorrente; auditoria obrigatória na mesma transação das novas mutações. Documentação, contratos, Context Pack, CI, publicação seletiva, smoke e sincronização fazem parte da entrega.

## PROIBIDO

- P-01 — Vínculo cross-group, autoelevação, Recruiter alterar Owner/Super ou conceder empresas fora do escopo; permissões por metadata editável; retorno de dados empresariais alheios.
- P-02 — Apagar histórico/dados/saldos, mesclar Pessoas, inferir decisões humanas, publicar Perfil/Knowledge global, chamar IA/cobrar/confirmar pagamentos automaticamente. Compartilhar carteira ou migrar faturamento para grupo.
- P-03 — Reproduzir bugs/limitações técnicas do Horus como regra de produto, reescrever migrations históricas ou forçar3.0.0.

## FORA DE ESCOPO

- F-01 — Precificação definitiva e segmentação nova das funções por plano; transferência de Owner/grupo com mudança de controlador; compartilhamento de Pessoas/Knowledge, consolidados de negócio, escrita multiempresa, checkout e cobrança de assinatura. São extensões, não requisitos aprovados deste movimento. Gestão existente de Tokens preservada.

## AUTONOMIA

- A-01 — Bruno delegou parâmetros não fechados. Configuração e limites provisórios acima escolhidos com preservação dos contratos e sem custo externo; UI usa AntD/Prisma e a estrutura funcional Horus, sem nova dependência. Estado de preparação resolve onboarding sem inventar Owner. Funções operacionais existentes permanecem disponíveis conforme autoridade.

## Aceite

- CA-01 — D-01/05/06: testes de perfis, apresentação sem Admin, operações positivas e negativas por ator, grupos distintos, empresa padrão comum e manutenção dos vínculos externos ao escopo.
- CA-02 — D-02/03/04: SQL real descartável cobre cadastro, limites/concorrência, versão, Owner/situação inválidos, empresa principal, configurações e auditoria atômica; browser em1448/390/320 cobre estados, mutações explícitas, erros e navegação.
- CA-03 — D-07/P-*: regressão dos helpers/consumidores diretamente afetados, contratos de domínio preservados, nenhum dado real usado em testes; tipos/build/lint/foundation/contexto e CI. Rollout condicionado a todos D/P comprovados; registrar limites de baseline.

## Mapa de impacto anterior à implementação

Baseline7456e22/main2.8.1; único Supabase Prisma17ACTIVE_HEALTHY conferido somente leitura:1grupo,2empresas,1Owner ativo, sem conflito de Owner. Código local e contratos, não teste conectado por papel. Cópia Horus consultada somente leitura.

| Capacidade | Relação | Preservação e prova mínima |
| --- | --- | --- |
| Grupos/empresas/planos/Usuários | direct | Novas RPCs transacionais, escopo, concorrência, estados e browser funcional |
| Roles/RLS/tenant/PII | critical_transversal | Negativos dois grupos/três empresas, grants/helper real, status/revogação e Admin legado |
| Shell/contexto/empresa padrão | direct | Sem seletor comum; troca autorizada e invalidação de escopo, visão mobile |
| Knowledge/Banco/Tokens/exclusão de Pessoa | plausible_indirect | Recruiter assume Admin; conferir cada fronteira de autoridade, Global permanece Super, regras comerciais preservadas |
| Pessoas/Posições/Processos/importação | plausible_indirect | Helpers compartilhados; regressão dirigida de contratos e cenário local com org ativa/inativa, sem dados reais |
| Parser/Synthesis/matching/portais em curso | no_impact_identified | Algoritmos e serviços não mudam; autorização de nova operação usa helper atualizado, liquidação/portal já iniciado preservados |
| Deploy | direct | Diff define migration/Edge/web; CI e rollback, sem reconstruir outros serviços |

Mínimo suficiente: provas acima; não executar validate integral local sem autorização específica. Fechar após D/P PASS, evidência, docs/contexto e entrega autorizada. Sem mockup normativo fornecido; referência Horus funcional, layout adaptado aos componentes Prisma com conferência responsiva.

## Pendências

Nenhum Q material bloqueante: parâmetros foram delegados. Decisões comerciais futuras não bloqueiam a administração dentro dos limites explícitos.
