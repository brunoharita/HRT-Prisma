# Base transversal de experiência do Prisma

Contrato de apresentação: `prisma-ux-foundation-1.0.0`. Acordo aprovado: `docs/qa/agreement-ux-foundation.md` 1.0.0. Fonte: decisão de Bruno nesta tarefa em 2026-09-13, incluindo a substituição de Vagas por **Posições** e autonomia para implementação sequencial sem novos checkpoints de produto.

## Organização e jornadas

O menu agrupa Operação (Início, Pessoas, Posições, Verificações), Curadoria (Conhecimento, Banco de Itens) e Administração (Usuários e capacidades administrativas entregues), conforme a autoridade já existente. Páginas sem capacidade utilizável não são anunciadas no menu. Rotas antigas continuam compatíveis: a mudança de linguagem não renomeia URLs, contratos, entidades, tabelas, payloads ou snapshots históricos.

A análise de aderência pertence ao contexto da posição/pessoa. Necessidades de verificação conectam esse contexto ao acompanhamento; Matching deixa de ser uma entrada isolada do menu. A Central da Pessoa reúne perfil vigente, próxima ação e manutenção. Consulta de histórico, documentos e diagnóstico não se torna etapa obrigatória.

Jornadas de referência:

- Informação nova: importar → identificar quando necessário → processar → revisar fonte e evidências → conferir alterações → publicar → consultar perfil.
- Pessoa existente: Central → consultar ou adicionar fonte → revisar → publicar nova versão. Contato, mesclagem e histórico são ramificações.
- Busca: critérios → resultados explicados → selecionar duas pessoas → comparar/consultar evidências → retornar aos mesmos critérios.
- Posição: criar/reutilizar definição → conferir requisitos → salvar → encontrar pessoas → comparar evidências → verificar quando necessário → preparar → emitir convite → acompanhar.
- Participante: convite → boas-vindas → instruções → confirmação → questões → revisão final → envio → conclusão/comprovante, com pausa e retomada conforme contrato.
- Curadoria: termo/lacuna → reutilização ou proposta → revisão humana → publicação → impactos/acompanhamento.
- Administração: cadastro → permissões → ativação → manutenção.

Etapas só interrompem a jornada quando exigem decisão, informação relevante ou condição necessária. As sequências são padrões para a base e movimentos específicos seguintes; não autorizam suprimir decisões ou evidências obrigatórias dos contratos de domínio.

## Apresentação

Preservar marca/ativos, azul e navegação lateral da ADR-007. Reduzir brilho, sombras e cartões aninhados. Um título principal, contexto breve e ação principal por área de trabalho. Pessoa, posição e empresa permanecem identificáveis. Detalhes técnicos ficam acessíveis por divulgação progressiva.

Azul significa ação/seleção; verde conclusão confirmada; amarelo atenção; vermelho falha ou destruição; neutro informação ausente. Texto/ícone complementam a cor. Arquivar e excluir têm significados distintos. Usar componentes compartilhados para página, cabeçalho, cartão, estado, painel e área pública.

Tabelas priorizam objeto, situação e próxima ação. Rolagem interna cabe a informação realmente bidimensional. Telas pequenas priorizam uma coluna, filtros progressivos, comparação por requisito e alternância fonte/campo quando a implementação específica requer. Controles, títulos e ações não podem se sobrepor com conteúdo longo. A amostra visual de lista, detalhe e formulário será implementada e conferida nesta entrega; o PO delegou a seleção dos detalhes visuais sem nova aprovação intermediária.

## Linguagem

Português do Brasil, profissional, direto e acolhedor. Glossário de interface: Início; Nome de usuário; Posições/Posição; Necessidades de verificação; Base global de conhecimento; Termos para revisar; Competências nos filtros de pessoas. Identificadores internos e termos originais de fontes não são traduzidos como dados.

Nomear ações pelo efeito: salvar rascunho, publicar perfil, arquivar, excluir, gerar link, enviar convite. Só anunciar envio, publicação ou salvamento após resultado confirmado. Ausência permanece “Não informado”, “Ainda sem dados” ou “Não identificado no documento”; não vira zero, insuficiência profissional ou primeira publicação. Erros comuns indicam situação e recuperação; diagnósticos técnicos não são transferidos ao operador.

## Estados e continuidade

Carregamento, vazio inicial, busca sem resultados, erro, sucesso e indisponibilidade têm apresentações distintas e acessíveis. Carregamento não apresenta zero provisório. Vazio inicial orienta a entrada permitida; resultado vazio oferece ajuste de filtros; erro oferece recuperação sem apagar informação vigente. URLs desconhecidas e entidades inexistentes não abrem outra entidade.

Navegação preserva filtros, seleção, paginação, aba e rolagem nos contextos integrados à base. Estado de navegação é temporário, separado por sessão autenticada, papel e empresa, sem persistir currículos, respostas, senhas ou tokens. Sair de edição com alterações não salvas exige confirmação; navegação sem alterações não exige confirmação. Retorno ao contexto de origem, menu, histórico do navegador, troca de empresa e saída da sessão usam o mesmo limite de proteção. Autorização permanece nos contratos existentes fora da UI.

## Acessibilidade e aceite

Toda alteração verifica critérios aplicáveis: operação por teclado, nomes acessíveis, foco visível e retorno após diálogo, hierarquia de títulos, erros associados a campos e anúncios de estado. Não depender somente de cor. Reutilizar comportamento acessível do Ant Design e sua localização pt-BR.

Conferir leitura, contraste e ampliação nas superfícies alteradas, com referências de 390 px, 768 px e desktop; considerar reflow em 320 CSS px. Avaliar conteúdo longo, vazio, erro e menu aberto/recolhido. Inspeção dirigida não equivale a certificação WCAG de todo o produto.

## Autonomia e evolução

Engenharia escolhe medidas, espaçamento, tipografia, distribuição dos componentes e redação coerente com este contrato. Esta aprovação não muda autorização, isolamento, obrigatoriedade de dados de domínio, matching, parser, fontes externas, custo ou produção. Os grupos específicos 4–14 ainda serão trabalhados nos próprios escopos; a base transversal vale imediatamente para novas alterações. Critérios de aceite e limitações ficam no AoT desta entrega.
