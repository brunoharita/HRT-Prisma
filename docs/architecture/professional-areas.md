# Macroáreas profissionais

Contrato `professional-area-1.0.0`, entrega2.7.4. Extensão do Knowledge/ADR-069, não biblioteca paralela de competências. Tipo `professional_area` nas tabelas existentes de conceitos/termos/propostas/approvals/changesets. Acordo e evidência: `docs/qa/professional-areas-v274.md`.

## Cadastro e governança

Conhecimento > Áreas profissionais lista nome, descrição, termos associados, camada, status e versão; busca textual, cadastro, edição e desativação sem exclusão. Super Admin mantém Global; owner/admin mantêm apenas a própria empresa. Outros papéis consultam. RPCs validam sessão e autoridade backend, inputs sanitizados, concorrência por versão e lock do changeset. IDs estáveis; versões e snapshot anterior ficam auditados. A referência inicial contém16 macroáreas editoriais Prisma, autorizadas no lançamento, sem atribuir Pessoas nem alegar autoridade externa.

Criação/edição local ativa é imediatamente utilizável e gera contribuição global separada. Cada revisão conserva proposta e decisão anteriores; a primeira usa origin_concept_id e todas registram conceito/versão/empresa em original_proposal.origin. A fila é exclusiva do Super Admin. Curadoria pode editar e criar uma área global, associar a uma global existente, rejeitar ou manter somente local. Associação não mescla IDs nem modifica automaticamente aliases. Todas as decisões preservam o conceito local. Editar/desativar Global exige autoridade Global e não altera dados locais.

## Perfil e Pessoas

`areasOfExpertise` permanece texto declarado/extraído. `professionalAreaIds?: string[]` e labels canônicas de snapshot são seleção humana opcional, distinta de fatos extraídos e de evidências. Presença, inclusive `[]`, impede inferência de substituir a escolha; ausência preserva escolha vigente nas próximas revisões. Labels são preenchidas novamente pelo backend, não confiadas ao cliente. Até10 áreas selecionadas; cadastro ativo para novas escolhas, áreas inativas já selecionadas continuam históricas e identificadas. Editor oferece busca por nome/termo, base global/local, origem da classificação e link para o cadastro, mantendo rascunho/comparação/publicação explícita. A comparação exibe essa escolha; alteração ocorre no editor, não como decisão de bloco extraído.

Pessoas consulta `get_people_professional_areas`, juntando por Pessoa E Perfil vigente. Coluna e filtro usam área humana publicada ou projeção derivada. Área pertence ao Perfil, independentemente de experiências/datas. Na lista2.7.5, cargo original, empresa e período vêm de uma única última experiência identificável; agrupamento de função não condiciona sua exibição. Filtro de cargo usa esse texto original e não a taxonomia. Área continua pertencendo ao Perfil; não prova que o último emprego pertence àquela macroárea. Desativar área não elimina escolhas humanas históricas; inferência só referencia áreas ativas.

## Classificação e preservação

Reutiliza fila privada/cron/worker `people_directory`, opt-in, modelo `gpt-5.6-luna`, histórico, `store:false`, ausência de web/ferramentas e o MESMO orçamento da normalização20/dia e200/mês. Contexto macroarea tem kind/método próprios e prioridade sobre backlog de funções. Importação/revisão documental pode enfileirar. Digitar, salvar e publicar Perfil manual não enfileiram esta IA. Consulta da lista/editor não escreve nem chama provedor; editor atualiza sugestão por leitura a cada30s quando visível. Sem opt-in/limite/disponibilidade, a seleção manual permanece livre.

Payload limitado: título240, áreas declaradas até20x160, cargo/responsabilidades agregados até1400, sem nome/ID/contato/empregador/datas/currículo integral. Candidatos são no máximo60 macroáreas disponíveis, priorizando locais, com descrições600 e até10 termos; homônima local precede global. Catálogo maior continua integralmente selecionável manualmente; classificação automática é conservadora dentro desse limite. Proteção contra contato/CPF/telefone/URL também nos candidatos. IA retorna até3 IDs candidatos, sem criar Knowledge nem publicar Perfil. Alias exato é restrito ao tipo macroárea; ambiguidades não viram equivalência. Completion revalida fonte, lease, fingerprint, versões e tipos; escolha humana não pode ser sobrescrita.

Resolvers genéricos e normalização de competência excluem macroáreas. Triggers proíbem classificar/vincular macroárea como evidência de competência. Score, matching, decisões de seleção e tarifas não passam a usar esse campo. Histórico e texto original permanecem intactos.

Rollback: voltar web/Edge para2.7.3 e desativar somente cron people-directory caso necessário; manter migrações aditivas e registros/histórico, sem excluir enum/dados. Funções legadas do worker ficam privadas, sem grant cliente. Não executar downgrade destrutivo. Seleção opcional no JSON continua preservada mesmo com web anterior.
