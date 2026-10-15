# Acordo aprovado — Prisma 2.7.0

Contrato 1.0.0, `agreed`, congelado em 15/10/2026. Product Owner: Bruno. Fonte: autorização expressa transportada do chat `01a1283d-53e1-7f30-9439-391840e48d56` para esta execução: implementar as concordâncias, em main e produção, versão 2.7.0, de forma segura e ágil. Nenhum Q material pendente. Este documento registra o acordo já aprovado, sem nova decisão de produto.

## DEVE

- D-T01: Gestão de Tokens Prisma > Pacotes e tarifas separa Tarifas atuais, aberta por padrão, e Histórico de tarifas.
- D-T02: atuais: uma linha por operação, consumo e início da vigência; somente a tarifa válida agora segundo o backend. Versão futura não substitui a vigente.
- D-T03: histórico: versões anteriores agrupadas pela data de vigência, decrescentes, operação e consumo daquele período. Futuras identificadas como Programada.
- D-M01: oferecer Preencher manualmente como alternativa a Importar currículo, preservando acesso e funcionamento do PDF.
- D-M02: reutilizar/adaptar o editor estruturado da revisão anterior à publicação, vazio e sem PDF. Texto livre pode ser secundário e nunca substitui o editor estruturado.
- D-M03: cobrir identificação/contato, resumo, experiências, formação, competências, idiomas e todas as demais seções já suportadas, sem reduzir informações ou contratos.
- D-M04: listas permitem adicionar/editar/remover registros estruturados, com orientação breve; vazias discretas e expansíveis. Desktop/mobile com componentes acessíveis. Inspecionar e reutilizar a organização, agrupamento e interação da revisão existente.
- D-M05: salvar rascunho parcial e retomar sem obrigar todas as seções; preservar mínimos de identidade/autorização/integridade e validar campos preenchidos. Rascunho não é publicação nem perfil completo.
- D-M06: publicação por ação explícita autorizada, validando campos e pendências relevantes. Reutilizar revisão/publicação e separar Pessoa/Perfil/Documento/Tentativa quando aplicável. Cadastro básico não cria perfil profissional completo.
- D-M07: origem manual por informação/registro, autoria e data; nunca apresentar como extração PDF ou verificação Prisma. Não fabricar documento, citação, geometria ou evidência. Informação declarada separada de inferência.
- D-M08: digitar/salvar/revisar/publicar manualmente não consome Tokens nem aciona parser/LLM automaticamente. IA existente continua opcional, com acionamento/consumo próprios; nenhum recurso de IA novo.
- D-M09: identificar duplicidades possíveis antes da criação manual usando regras existentes; mostrar correspondências e acesso ao cadastro existente. Confirmação humana, sem merge/vínculo automático ou exposição entre empresas.
- D-M10: atualizar perfil existente com prefill fiel do vigente, sem novo PDF/redigitação, comparação antes da nova versão; preservar vigente durante rascunho/falha/cancelamento, histórico, autoria, omissões e remoção explícita. Dados privados separados.
- D-V01: Funcionário ativo da empresa? somente Sim/Não, sem terceiro estado. Decisão final: sem informação suficiente, Não.
- D-V02: padrão Não; existentes sem informação ficam Não. Não significa ex-funcionário ou que nunca trabalhou na empresa. Substitui proposta rejeitada Não informado.
- D-V03: atributo da Pessoa na empresa/tenant, separado do currículo/perfil, alterável por autorizado com responsável/data no histórico. Sem inferência por currículo/IA.
- D-V04: exibir em identificação/cadastro, indicação discreta no perfil quando Sim e filtro Funcionário ativo: Sim/Não em Pessoas.
- D-V05: alteração preserva perfil/avaliações/histórico, não exclui de processos nem concede sucessão automática.

## PROIBIDO

- P-T01: não apagar histórico, alterar preços/valores, recalcular cobranças antigas/cotações congeladas ou política comercial; preservar catálogo/cadastro de tarifas/pacotes e controles.
- P-M01: não exigir PDF/IA/texto livre para cadastro estruturado, inventar fatos/contatos/CPF/datas/competências ou converter ausência em negativo.
- P-M02: não sobrescrever silenciosamente publicado, descartar dados/listas, aprovar automaticamente rascunho ou cobrar preenchimento manual.
- P-V01: não criar estado desconhecido/null na experiência, classificação IA ou usar Não administrativo como prova de nunca ter sido funcionário.
- P-G01: preservar tenant fora do frontend, RLS/ACL/papéis, privados/proveniência/revisão humana/histórico/PDF/vigente/avaliações/processos/matching e política comercial: franquia calendário/1M padrão, pacotes30dias, franquia primeiro, cotação/reserva/liquidação.

## FORA DE ESCOPO E AUTONOMIA

- F-01: sucessão, matrícula, gestor, organograma, cargo interno e novos modelos IA. Vínculo apenas prepara evolução futura.
- F-02: melhorias adjacentes, tarifas/preços, extração, Score/matching e contratação.
- A-01: reutilizar componentes/formulários/duplicidade/comparador/serviços/validações/fluxos; detalhes técnicos menores delegados, sem reduzir regras ou substituir editor por texto livre.
- A-02: versionar acordo, execução integral e AoT sem nova aprovação; interromper somente por conflito/decisão material nova ou segurança sem resolução.

## Modelo UX após inspeção

Referência: `StructuredReviewPanel.tsx` e `ProfileReviewPage.tsx` no baseline abaixo. Alvo normativo para organização e interação; nenhuma imagem nova de resultado aprovada. Screenshot de tarifas de origem era exemplo do problema, não layout normativo.

- D-UX-01: manter header/contexto, ações de salvar/continuar, abas Resumo/Experiência/Formação/Competências/Idiomas/Outros, identificação/contato no Resumo, edição de um registro de lista por vez com navegação e adicionar/remover; seções vazias sob demanda. Sem documento manual não há painel de PDF fictício; usar área de edição ampla. Histórico e comparação permanecem acessíveis. No celular, abas com rolagem e campos/ações empilhados, sem overflow global.
- P-UX-01: não converter em formulário obrigatório monolítico, texto livre único ou esconder seções suportadas por estarem vazias.
- A-UX-01: tokens existentes, componentes acessíveis e detalhes de acabamento/posicionamento responsivo.
- CA-UX-01: render real do editor existente e adaptado com dados/estado equivalentes em desktop e mobile; registrar diferenças necessárias pela ausência de PDF e estados vazio/parcial/loading/erro no AoT.

## Critérios de aceite / menor validação suficiente

| IDs | Aceite e evidência exigida |
| --- | --- |
| CA-T01/02/03 | Teste determinístico atual/antiga/futura, empate e ordem/grupos; UI renderizada com atuais aberta; nenhum writer financeiro alterado |
| CA-M01/02/03/04 | Navegação manual/PDF, editor completo e listas múltiplas, vazio/partial e desktop/mobile renderizados |
| CA-M05/06/07/08 | SQL local transacional: rascunho parcial/retomada, validações, origem/autoria/data por alteração, publicação humana, nenhum documento/evidência/IA/débito criado; tipos/build e testes de ciclo |
| CA-M09 | Duplicidade nome/email/telefone segundo regras existentes, escolha humana/abrir existente, tenant negativo, replay/concorrência sem duplicação |
| CA-M10 | Prefill vigente, Delta, nova versão, histórico e vigente preservados em cancelamento/falha/conflito; omissão preservada e remoção explícita; privados fora do Perfil |
| CA-V01/02/03/04/05 | Boolean default e existentes Não; edição autorizada/auditada, filtro/identificação/indicação; perfil e processos intactos |
| CA-G01 | SQL negativo anon/papéis/inativo/tenant/replay/concorrência, ACL/RLS e fronteira publicação; regressão PDF/publicação/privados/contratos afetados, sem PII em logs |
| CA-RELEASE | Versão2.7.0; owner docs/current-state/contexto árvore exata; tipos/build/lint/contexto/ledger e plano dispatcher sem suíte integral local; CI obrigatório, publicação seletiva SHA explícito, baseline/rollback/smoke/sincronização local/GitHub/VPS |

## Mapa inicial GOV-01

Baseline: local/origin/main `519423b648416f5765995b59282a7d1b1d1e733b`, v2.6.2. Estado publicado é declaração do current-state até verificação operacional específica. Worktree isolado limpo, rascunhos alheios preservados. Classe D (schema/PII/writers/autorização); tarifas isoladamente B. Nenhuma nova biblioteca/tecnologia, reutilização Prisma suficiente.

| Capacidade / área | Relação | Dependência e proteção | Regressão/evidência |
| --- | --- | --- | --- |
| Tarifas atuais/históricas | direct | Seleção backend effective_at<=now, desempate created_at/id | Determinístico + render sem mutação financeira |
| Pessoa/rascunho manual/vínculo | direct | Novo writer usa autorização existente, tenant, lock/replay e auditoria; boolean separado | SQL positivo/negativo/disputas; UI create/update/filter |
| Revisão/editor/Delta/publicação | direct | Contrato estruturado, versões, omissões e remoção explícita | Regressão dirigida e publicação local sintética |
| Importação PDF/documento/tentativas | plausible_indirect | Editor/writers compartilhados, guardas PDF preservadas | Testes de revisão/publicação/documentos, baseline sem mudança de extração |
| Auth/RLS/ACL/privados/proveniência | critical_transversal | Autorização backend e dados privados fora do profissional | SQL negativo + inspeção grants/RLS; logs sem PII |
| Score/matching/avaliações/processos | plausible_indirect | Consumidores de perfil publicado/people | Contratos compartilhados dirigidos e snapshots SQL; vínculo não altera elegibilidade/processos |
| Franquia/pacotes/cotações/reserva/débito | no_impact_identified | Apresentação temporal somente, caminho manual não chama executores | Snapshot/corpos financeiros e spy de rede manual |
| Shell/navegação/versão | plausible_indirect | Novas entradas, registry | Tipos/build e smoke responsivo |
| IA/Parser/gateway/Paddle/síntese/mail | no_impact_identified | Nenhum runtime ou modelo novo; manual não usa IA | Plano seletivo e containers adjacentes preservados |

Conclusão exige todos D e P aplicáveis PASS com prova; limitações reais não podem virar PASS. Publicação autorizada expressamente e por AGENTS§7. Não reabrir escopo no fechamento.
