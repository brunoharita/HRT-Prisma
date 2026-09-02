# Contrato de documentos, operações e revisão humana

## Contratos vigentes

| Contrato | Versão | Regra material |
| --- | --- | --- |
| `document-processing-state` | 2.3.0 | estados operacionais distinguem falha técnica de reconhecimento parcial e alimentam o estado canônico de produto |
| `document-presentation` | 2.0.0 | as seis etapas compartilham tentativa revisável, estado e próximo passo sem ocultar páginas preservadas |
| `resume-product-state` | 1.0.0 | sete estados de produto são derivados e nunca persistidos na Pessoa |
| `profile-publication-delta` | 1.0.0 | comparação preserva omissões e exige remoção humana explícita e auditada |
| `person-ingestion` | 8.0.0 | cadastro, retry, revisão e publicação Delta são idempotentes |
| `resume-intake` | 1.0.0 | arquivo, identificação mínima e decisão criar/vincular formam uma intenção única, auditável e idempotente |
| `human-profile-review` | 5.0.0 | revisão aceita extração parcial e termina em Delta antes da publicação atômica |
| `spatial-evidence` | 1.2.0 | região explícita referencia tenant, documento, versão, página, campo e coordenadas; preserva texto bruto, texto efetivo e decisões de subtração entre campos irmãos |
| `document-operation-idempotency` | 1.1.0 | mesma chave e fingerprint retornam o mesmo resultado; invalidação também preserva histórico e perfil atual |
| `professional-profile` | 4.0.0 | perfil aprovado preserva proveniência, IDs estáveis e fatos omitidos, sem contato privado |
| `custom-profile-section` | 1.0.0 | extensão limitada do perfil; item possui caminho estável de evidência e não cria chave JSON arbitrária |
| `structured-resume-summary` | 1.0.0 | identificação, contato, posicionamento, objetivo, resumo e resultados são campos explícitos; PII nunca é promovida ao perfil profissional |
| `review-field-lifecycle` | 1.0.0 | vazios opcionais são normalizados; nome, contato e conteúdo profissional mínimo bloqueiam salvamento inválido; caminhos antigos continuam legíveis |

## Estados

Documento: `pending`, `received`, `processing`, `processed`, `ready_for_review`, `in_review`, `approved`, `failed`, `extraction_failed`, `needs_manual_review`, `unsupported_format`.

Revisão: `not_started`, `draft`, `in_review`, `approved`, `rejected`. Operação: `started`, `completed`, `failed`.

Estado desconhecido, versão incompatível, sessão ausente, tenant não autorizado ou papel insuficiente bloqueiam a mutação.

## Operações críticas

| RPC | Resultado |
| --- | --- |
| `start_resume_intake` | registra a intenção e reserva o caminho privado do arquivo sem criar Pessoa |
| `identify_resume_intake` | persiste somente identidade mínima e devolve candidatos do mesmo tenant |
| `resolve_resume_intake` | cria ou vincula Pessoa e registra o documento na mesma transação |
| `complete_resume_intake` | conclui o intake somente quando o documento está pronto para revisão |
| `fail_resume_intake` | preserva falha sanitizada e o estágio alcançado sem fabricar perfil válido |
| `register_person_document` | cria uma versão documental e tentativa inicial idempotentes |
| `record_document_failure` | registra falha sanitizada sem promover perfil |
| `persist_person_extraction` | persiste páginas, draft, evidência e estado de revisão de forma atômica |
| `start_profile_review` | abre ou devolve o rascunho existente para a tentativa |
| `save_profile_review` | cria revisão imutável e mudanças por campo com lock otimista |
| `apply_profile_review_adaptive_suggestions` | salva sugestões selecionadas, revisão, evento e casos de aprendizado na mesma transação |
| `record_profile_review_sibling_scan` | registra detecção ou descarte metadata-only de candidatos irmãos |
| `apply_profile_review_adaptive_suggestions_v3` | cria ou corrige experiências sugeridas, revisão, evidência espacial por campo, evento e casos na mesma transação |
| `record_profile_review_evidence` | registra região, vínculo, revisão e evento humano na mesma transação |
| `record_profile_review_evidence_refined` | registra a mesma operação com texto bruto, texto efetivo e decisões imutáveis de subtração ou reinclusão |
| `retire_profile_review_evidence` | encerra vínculo humano ativo, preserva histórico e rejeita evidência original |
| `approve_profile_review` | primitiva interna sem grant ao cliente; separa PII e cria a versão profissional na transação de publicação |
| `publish_profile_review` | autoridade cliente final; mescla perfil-base e proposta, preserva omissões e registra remoções explícitas |
| `invalidate_document_review` | encerra uma pendência revisável ou tecnicamente falha sem apagar documento, tentativa, revisão, evento ou perfil atual |

O cliente deve gerar uma chave por intenção do usuário e reutilizá-la somente em retry da mesma intenção. Reuso com fingerprint diferente retorna conflito. Números de versão nunca são calculados no frontend.

A transição final de revisão deve permanecer executável com todas as estruturas opcionais válidas, inclusive áreas personalizadas. Funções PL/pgSQL participantes usam variáveis locais prefixadas com `v_` e `#variable_conflict error`; identificadores de coluna em `ON CONFLICT` não podem colidir com variáveis locais. A regressão obrigatória executa `approve_profile_review` com ao menos uma área personalizada e comprova, na mesma transação, revisão aprovada, perfil criado e confirmação estrutural antes do rollback.

Falhas esperadas de aprovação são apresentadas ao operador por categoria acionável: concorrência/versão, estado da revisão, autorização/tenant, evidência material, nome, contato, shape/versão e idempotência. Mensagens SQL, nomes de tabela, função ou coluna e códigos internos não são exibidos. Falha inesperada recebe mensagem sanitizada e preserva o rascunho; o backend continua como autoridade de todos os gates.

Depois de salvar a revisão, o cliente navega para o Delta. Somente quando `publish_profile_review` retorna sucesso a revisão encerra seu fluxo e a interface navega para a Central da Pessoa. A navegação nunca ocorre antes da confirmação transacional nem no caminho de erro.

Pessoa, perfil vigente e importação possuem leitura independente. O perfil atual é a versão com `superseded_at is null`; uma nova importação nunca o substitui antes de `approve_profile_review`. A apresentação documental 1.2.0 combina a tentativa operacional mais recente com a última tentativa revisável: `failed_structuring` com `insufficient_structured_facts`, caracteres úteis e páginas persistidas significa `Requer revisão`, enquanto tentativas sem fonte recuperável permanecem `Falha técnica`. O clique no nome ou em `Abrir` leva à Central da Pessoa, não à edição. Na Central da Pessoa, `Ver documento` resolve a revisão tenant-scoped associada ao documento e abre o workspace M5 com PDF original e campos estruturados em modo somente leitura. A carga falha fechada quando o review ID não pertence exatamente à Pessoa e ao documento da rota. Esse modo não exibe salvamento, aprovação, inclusão, remoção, seleção ou alteração de evidência; `Detalhes técnicos` mantém acesso separado a metadados, tentativas e auditoria. Extração parcial não bloqueia `start_profile_review` quando existe draft `valid` ou `insufficient` associado a páginas preservadas; o workspace M5 oferece seleção espacial ou inclusão manual do bloco ausente. Retry procura a tentativa mais recente que possua páginas, sem deixar uma tentativa vazia ocultar a fonte recuperável.

`invalidate_document_review` usa autorização interna de revisor, `search_path` vazio e ledger M2-C. Documento aprovado é imutável quando `status` ou `review_state` indica aprovação, e documento ainda sem Pessoa vinculada falha fechado. Documento revisável precisa possuir revisão draft, criada ou reutilizada antes da invalidação; documento sem revisão só pode ser invalidado quando a tentativa mais recente terminou em falha técnica. A operação atualiza `documents.review_state` e, quando aplicável, `profile_reviews.state/invalidated_at`, registra evento metadata-only e nunca executa `DELETE` nem altera `professional_profiles`.

## Proveniência e auditoria

Cada mudança identifica campo, valor extraído, valor revisado, decisão e evidência aplicável. Evidência espacial nova contém página e retângulo normalizado, preserva o método local e limita o trecho selecionado ao mínimo necessário. Em `pdfjs-character-region-v2`, o `TextLayer` recebe a escala total do viewport e cada caractere é convertido imediatamente para `normalized-page-v1`. O arraste inicial, o texto, o refinamento e o destaque pendente operam sobre o mesmo conjunto ordenado de unidades canônicas; zoom, ajuste à largura, densidade do monitor e proporção da tela alteram somente a projeção. Esquerda, topo e base permanecem orientados pelo centro visual e a direita inclui somente unidades cuja caixa canônica começa dentro do contorno, sem tolerância fixa nem resgate externo. A região final se ajusta às caixas resolvidas. A área ocupada pelas mensagens de seleção permanece reservada durante todo o gesto para que o documento não se desloque entre o pressionamento e a liberação do ponteiro. A simples interseção com um `span` ou linha não inclui seu texto integral. Unidades de OCR passam pelo mesmo mapa canônico, mantendo origem e confiança distintas. Destaques persistidos são filtrados pelo escopo semântico visível: Experiência e Formação mostram somente os campos do registro aberto; as demais abas mostram apenas os campos renderizados conjuntamente naquela tela. Trocar de campo dentro do mesmo registro não oculta suas evidências irmãs, e mudar de registro ou aba remove imediatamente as regiões fora do contexto. Esse filtro é somente de apresentação e não altera vínculos, regiões, histórico nem a versão persistida do contrato. A superfície extraída prioriza a região original; a revisada prioriza a região humana. Retirada de evidência é um evento append-only e nunca apaga a região. Aceite adaptativo registra somente caminhos de campo, página, método, versão e padrão estrutural; valores e trechos não são duplicados no ledger. A aprovação referencia documento, tentativa, review e revisão. Eventos registram IDs, estado, ator, método e versão; texto integral do documento e payload integral do perfil são proibidos.

No refinamento 1.2.0, o retângulo bruto permanece em `raw_selected_text` e o resultado após a máscara fica em `selected_text`. Cada sobreposição elegível registra `excluded` ou `included` em ledger imutável. A subtração ocorre por caracteres ou símbolos posicionados, somente entre campos irmãos da mesma experiência ou formação e nunca com base apenas em igualdade textual. O banco exige vínculo ativo, mesma revisão, documento, versão, página, escopo semântico e interseção geométrica. Regiões humanas são excluídas por padrão na interface; regiões automáticas exigem decisão explícita do revisor.

Operações espaciais e aprovação permanecem indisponíveis enquanto uma edição manual material existir somente no estado local. A interface deve explicar essa dependência no contexto da ação, permitir que o operador registre a intenção mesmo com o bloqueio visível e retomar adicionar evidência ou criar área personalizada somente depois de salvar ou descartar explicitamente as mudanças. Um formulário repetível recém-aberto e ainda vazio é transitório, não constitui alteração material, não habilita salvamento e pode receber sua primeira evidência sem persistência prévia: campo e evidência são então validados e persistidos atomicamente. Repetir a ação Adicionar deve focalizar o formulário transitório existente, nunca criar duplicatas vazias. Cancelar uma inclusão transitória restaura o estado sincronizado sem criar remoção, histórico ou justificativa. Salvamento manual continua exigindo justificativa somente quando há mudança semântica; ausência de justificativa direciona o foco ao campo correspondente. O bloqueio nunca pode depender apenas de cor, opacidade ou conhecimento prévio do fluxo.

Uma área personalizada usa o caminho `customSections.<sectionId>.items.<itemId>.value`. Sua criação começa por seleção explícita no documento. A aprovação pode promover somente título normalizado, formato, versão e contagem de confirmação ao catálogo estrutural da organização; um ledger append-only referencia a revisão confirmadora. O valor do item e o trecho de evidência não são copiados para nenhum dos dois. `uncertainties` e `notIdentified` são pendências diagnósticas da extração, não fatos do perfil.

Experiências e formações novas usam caminhos `experiences.<experienceId>.<campo>` e `education.<educationId>.<campo>`. Caminhos numéricos históricos permanecem aceitos. O salvamento converte escalares opcionais vazios em `null`, remove itens repetíveis inteiramente vazios e mantém listas como arrays, sem fabricar “Não identificado”. Nome completo, telefone ou e-mail e ao menos uma informação profissional material são gates explícitos. Experiência exige Empresa ou Cargo; formação exige Curso ou Instituição. Inclusão e remoção são decisões humanas reversíveis antes do salvamento.

O estado de edição é comparado semanticamente após a mesma normalização usada na persistência. Diferença apenas transitória não cria revisão vazia nem solicita justificativa. Ao remover ou cancelar o item atualmente selecionado, a interface escolhe um campo irmão válido ou a raiz da mesma aba; ações de evidência falham fechadas para caminhos inexistentes. Sair da revisão com qualquer diferença local, inclusive transitória, exige confirmação explícita para evitar perda acidental.

No modal de seleção, aplicar o texto reconhecido sem edição é uma operação autoexplicativa e não exige justificativa. Uma justificativa continua obrigatória quando o revisor altera semanticamente o texto recuperado ou informa manualmente conteúdo que a região não reconheceu. Validações e falhas da operação permanecem dentro do modal; nenhum erro pode ficar oculto atrás de sua camada de bloqueio.

## Compatibilidade

Consumidores M2-B que não conhecem revisão não podem gravar diretamente nas tabelas críticas. Leitura histórica permanece válida; novas mutações devem usar as RPCs M2-C/M5. Evidência original anterior ao M5 permanece válida sem coordenadas e nunca recebe região inventada. Importação de currículo sem Pessoa prévia deve começar pelo contrato `resume-intake`; os fluxos manuais existentes continuam compatíveis.
