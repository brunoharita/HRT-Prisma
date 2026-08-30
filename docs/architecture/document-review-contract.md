# Contrato de documentos, operações e revisão humana

## Contratos vigentes

| Contrato | Versão | Regra material |
| --- | --- | --- |
| `document-processing-state` | 2.0.0 | estados operacionais e de revisão são explícitos e falham fechados |
| `person-ingestion` | 6.0.0 | cadastro, retry e persistência são idempotentes; aprovação separa perfil profissional de identificação e contato privados |
| `resume-intake` | 1.0.0 | arquivo, identificação mínima e decisão criar/vincular formam uma intenção única, auditável e idempotente |
| `human-profile-review` | 3.0.0 | revisão possui rascunho, resumo estruturado, resultado com evidência por item, releitura por bloco, refinamento reversível, mudanças por campo e aprovação atômica |
| `spatial-evidence` | 1.2.0 | região explícita referencia tenant, documento, versão, página, campo e coordenadas; preserva texto bruto, texto efetivo e decisões de subtração entre campos irmãos |
| `document-operation-idempotency` | 1.0.0 | mesma chave e fingerprint retornam o mesmo resultado; payload diferente conflita |
| `professional-profile` | 2.0.0 | perfil aprovado preserva proveniência, posicionamento, objetivo, resumo, resultados e áreas personalizadas, sem contato privado |
| `custom-profile-section` | 1.0.0 | extensão limitada do perfil; item possui caminho estável de evidência e não cria chave JSON arbitrária |
| `structured-resume-summary` | 1.0.0 | identificação, contato, posicionamento, objetivo, resumo e resultados são campos explícitos; PII nunca é promovida ao perfil profissional |

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
| `record_profile_review_evidence` | registra região, vínculo, revisão e evento humano na mesma transação |
| `record_profile_review_evidence_refined` | registra a mesma operação com texto bruto, texto efetivo e decisões imutáveis de subtração ou reinclusão |
| `retire_profile_review_evidence` | encerra vínculo humano ativo, preserva histórico e rejeita evidência original |
| `approve_profile_review` | atualiza nome/contato canônicos privados e cria a versão profissional sem PII na mesma transação |

O cliente deve gerar uma chave por intenção do usuário e reutilizá-la somente em retry da mesma intenção. Reuso com fingerprint diferente retorna conflito. Números de versão nunca são calculados no frontend.

## Proveniência e auditoria

Cada mudança identifica campo, valor extraído, valor revisado, decisão e evidência aplicável. Evidência espacial nova contém página e retângulo normalizado, preserva o método local e limita o trecho selecionado ao mínimo necessário. Em `pdfjs-character-region-v2`, o `TextLayer` recebe a escala total do viewport e cada caractere é convertido imediatamente para `normalized-page-v1`. O arraste inicial, o texto, o refinamento e o destaque pendente operam sobre o mesmo conjunto ordenado de unidades canônicas; zoom, ajuste à largura, densidade do monitor e proporção da tela alteram somente a projeção. Esquerda, topo e base permanecem orientados pelo centro visual e a direita inclui somente unidades cuja caixa canônica começa dentro do contorno, sem tolerância fixa nem resgate externo. A região final se ajusta às caixas resolvidas. A área ocupada pelas mensagens de seleção permanece reservada durante todo o gesto para que o documento não se desloque entre o pressionamento e a liberação do ponteiro. A simples interseção com um `span` ou linha não inclui seu texto integral. Unidades de OCR passam pelo mesmo mapa canônico, mantendo origem e confiança distintas. Destaques persistidos são filtrados pelo escopo semântico visível: Experiência e Formação mostram somente os campos do registro aberto; as demais abas mostram apenas os campos renderizados conjuntamente naquela tela. Trocar de campo dentro do mesmo registro não oculta suas evidências irmãs, e mudar de registro ou aba remove imediatamente as regiões fora do contexto. Esse filtro é somente de apresentação e não altera vínculos, regiões, histórico nem a versão persistida do contrato. A superfície extraída prioriza a região original; a revisada prioriza a região humana. Retirada de evidência é um evento append-only e nunca apaga a região. Aceite adaptativo registra somente caminhos de campo, página, método, versão e padrão estrutural; valores e trechos não são duplicados no ledger. A aprovação referencia documento, tentativa, review e revisão. Eventos registram IDs, estado, ator, método e versão; texto integral do documento e payload integral do perfil são proibidos.

No refinamento 1.2.0, o retângulo bruto permanece em `raw_selected_text` e o resultado após a máscara fica em `selected_text`. Cada sobreposição elegível registra `excluded` ou `included` em ledger imutável. A subtração ocorre por caracteres ou símbolos posicionados, somente entre campos irmãos da mesma experiência ou formação e nunca com base apenas em igualdade textual. O banco exige vínculo ativo, mesma revisão, documento, versão, página, escopo semântico e interseção geométrica. Regiões humanas são excluídas por padrão na interface; regiões automáticas exigem decisão explícita do revisor.

Operações espaciais e aprovação permanecem indisponíveis enquanto uma edição manual existir somente no estado local. A interface deve explicar essa dependência no contexto da ação, permitir que o operador registre a intenção mesmo com o bloqueio visível e retomar adicionar evidência ou criar área personalizada somente depois de salvar ou descartar explicitamente as mudanças. Salvamento manual continua exigindo justificativa; ausência de justificativa direciona o foco ao campo correspondente. O bloqueio nunca pode depender apenas de cor, opacidade ou conhecimento prévio do fluxo.

Uma área personalizada usa o caminho `customSections.<sectionId>.items.<itemId>.value`. Sua criação começa por seleção explícita no documento. A aprovação pode promover somente título normalizado, formato, versão e contagem de confirmação ao catálogo estrutural da organização; um ledger append-only referencia a revisão confirmadora. O valor do item e o trecho de evidência não são copiados para nenhum dos dois. `uncertainties` e `notIdentified` são pendências diagnósticas da extração, não fatos do perfil.

No modal de seleção, aplicar o texto reconhecido sem edição é uma operação autoexplicativa e não exige justificativa. Uma justificativa continua obrigatória quando o revisor altera semanticamente o texto recuperado ou informa manualmente conteúdo que a região não reconheceu. Validações e falhas da operação permanecem dentro do modal; nenhum erro pode ficar oculto atrás de sua camada de bloqueio.

## Compatibilidade

Consumidores M2-B que não conhecem revisão não podem gravar diretamente nas tabelas críticas. Leitura histórica permanece válida; novas mutações devem usar as RPCs M2-C/M5. Evidência original anterior ao M5 permanece válida sem coordenadas e nunca recebe região inventada. Importação de currículo sem Pessoa prévia deve começar pelo contrato `resume-intake`; os fluxos manuais existentes continuam compatíveis.
