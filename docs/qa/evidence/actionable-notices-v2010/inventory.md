# Inventário dos avisos com ação v2.0.10

Revisão proporcional de `web/src` em 06/10/2026. O contrato é `docs/qa/agreement-actionable-notices-v2010.md` v1.0.0. Não alterar regras de contratação, matching, confirmação humana, exclusão ou acesso.

| Superfície | Problema exposto | Destino da ação |
| --- | --- | --- |
| Perfil / Competências | Grupo indefinido, mesmo com evidências | Definir grupo da competência correta; sem autoridade, orientação sobre responsável |
| Classificação | Opções indisponíveis ou gravação não confirmada | Consultar grupos/lista sem apagar escolha; manter vínculos |
| Vínculo de evidências | Fontes ou gravação não confirmadas | Revisar fontes ou consultar vínculos atuais |
| Curadoria do Perfil | Termo sem associação, falha na decisão/consulta | Escolhas do termo em revisão ou atualizar pendências |
| Revisão do documento | Campo inválido, seleção ambígua, registro sem sugestão segura | Campo selecionado/primeiro inválido, texto da seleção ou registro específico; abrir painel no celular |
| Visualizador de documento | Página não exibida/original indisponível | Tentar abrir o PDF ou consultar campos da revisão |
| Importação | Arquivo, identificação ou leitura parcial | Seletor de arquivo, identificação ou revisão pronta; antes disso explica disponibilidade futura |
| Central da Pessoa / Documento / Versões | Estado da operação não confirmado, campos não identificados | Consultar estado atual ou abrir documento/revisão existente |
| Busca e comparação de Pessoas | Seleção/consulta inválida | Seleção na página correta, critérios ou consulta de resultados |
| Cadastro de Pessoas / Usuários / senha | Formulário não concluído | Primeiro campo inválido ou controle editável, preservando rascunho |
| Mesclagem / movimento de documento | Escolhas conflitantes | Escolhas ou pessoa de destino; sem executar decisão automaticamente |
| Início / Usuários / processos | Falha de consulta | Repetir leitura mantendo filtros |
| Knowledge | Falha em operação, candidatos ambíguos, proposta de credencial legada | Retornar à operação preservada, candidatos ou termo de origem |
| Posições / taxonomia | Formulário, requisitos ou associação incompletos | Campos, classificação de requisitos ou associação; histórico permite nova consulta |
| Matching / comparação | Consulta/análise incompleta | Atualizar consulta, requisitos da Posição ou resultados com evidências |
| Revisão de trajetórias | Falha na consulta/gravação | Rever decisões sem substituí-las; consulta somente quando ainda não carregada |
| Banco de itens / preparação | Consulta/preparação não concluída | Consultar banco ou rever preparação |
| Convites / verificação | Estado não confirmado, cópia não realizada, respostas pendentes | Consultar convites, selecionar link ou questão pendente; nenhuma resposta automática |
| Autoatendimento de dados | Acesso/estado indisponível | Verificar acesso/estado; não repetir exclusão nem dispensar confirmação |

O teste AST verifica 63 ocorrências explícitas de erro/indisponibilidade com atributo de ação e ausência de `message.error` sem o componente persistente. Ele não prova todos os estados condicionais, permissões e destinos em runtime. A revisão do diff e os fluxos sintéticos complementam essa verificação. Não se afirma que todo cenário autenticado foi executado.

Informações puramente explicativas não pedem ação: limites do autorrelato e Assessment, preservação de histórico, disponibilidade de processamento futuro, ausência de conclusão de incapacidade, condições de privacidade e consequências de publicação com botão já adjacente. Ações destrutivas e decisões humanas continuam explícitas; falhas não as repetem automaticamente.

Evidência sintética: `ui-results.json`, quatro arquivos `evidence-*.json`, `classification-checks.json` (10 checks, ROLLBACK), renders `classification-desktop.png` e `classification-mobile.png`. Nenhuma Pessoa real modificada, nenhuma chamada de IA para QA, nenhuma suíte completa local. O pipeline remoto obrigatório continua independente.
