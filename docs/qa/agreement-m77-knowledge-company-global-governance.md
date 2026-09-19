# Contrato de Acordos — M7.7 Governança Empresa → Global da Knowledge

## Objetivo

- Versão do contrato: 1.0.0.
- Fonte da decisão: conversa do Product Owner em 2026-09-19.
- Delta: M7.6 mantinha proposta de empresa pendente. M7.7 torna a gravação autorizada da empresa imediatamente utilizável e a converte, em paralelo, em contribuição revisável para a Base Global.

## DEVE — Inegociável

- D-01 — `owner` e `admin` podem criar ou associar Knowledge no escopo da própria empresa por transação server-side; a alteração fica aprovada e utilizável imediatamente na empresa.
- D-02 — Toda criação local de conceito/termo/associação gera uma contribuição global sanitizada e auditável, sem tornar a publicação global automática.
- D-03 — A resolução de termo na empresa prioriza a camada `organization` sobre a Global. Labels iguais não implicam equivalência: registros de empresa e Global continuam entidades distintas.
- D-04 — O Prisma compara a contribuição com conceitos e aliases globais e apresenta os candidatos como subsídio para o Super Admin; similaridade não cria associação, promoção ou alteração automática.
- D-05 — Somente o Super Admin revisa contribuições globais e pode, dentro deste fluxo, visualizar, pesquisar externamente por IA, editar a decisão, aprovar na Global, rejeitar, adiar ou manter a contribuição somente local.
- D-06 — A IA de Super Admin pode usar pesquisa externa sob demanda, com termo sanitizado, fontes permitidas, orçamento e trilha de auditoria. A resposta é recomendação, não autoridade de publicação.
- D-07 — Aprovar, rejeitar ou adiar a contribuição global não altera, apaga ou desativa o conhecimento local que a originou.
- D-08 — Toda mutação preserva ator, escopo, origem, versão e decisão auditáveis; Super Admin tem autoridade sobre as ações entregues neste fluxo entre empresas.

## PROIBIDO

- P-01 — Não publicar, associar, reprocessar Perfil ou alterar Knowledge local/global automaticamente por similaridade ou IA.
- P-02 — Não enviar PII, texto de currículo, identificadores de Pessoa, dados confidenciais ou segredos à pesquisa externa.
- P-03 — Não permitir que `owner` ou `admin` de uma empresa leiam ou modifiquem Knowledge de outra empresa, nem publiquem diretamente na Global.
- P-04 — Não apagar trilha de auditoria ou histórico para efetivar uma correção administrativa.

## FORA DE ESCOPO

- F-01 — Não criar CRUD genérico, migração em massa ou reinterpretação retroativa de Knowledge histórico fora das ações deste fluxo.
- F-02 — Não criar um novo provedor de IA, embeddings, pontuação opaca ou pesquisa automática por contribuição.
- F-03 — Não alterar taxonomias M7.1/M7.2, Matching, extração ou contratos de Perfil além da curadoria diretamente afetada.

## AUTONOMIA DE ENGENHARIA

- A-01 — Reutilizar `knowledge-agent`, orçamento, fontes permitidas e o modelo de proposta/auditoria existentes; adaptar o contrato persistido somente onde a origem organizacional da contribuição exigir rastreabilidade explícita.
- A-02 — Usar funções `SECURITY DEFINER` apenas com autorização interna explícita, `search_path` fixo, revogação de `PUBLIC` e grants mínimos.
- A-03 — Definir os textos e a composição da interface com os componentes Prisma existentes, preservando a navegação e o painel lateral de curadoria.

## PENDÊNCIAS

- Nenhuma.

## CRITÉRIOS DE ACEITE

- CA-D01 — Dado um `owner` ou `admin` da empresa, quando cria conceito local pela curadoria, então o conceito/termo fica aprovado e resolve somente observações da própria empresa na mesma transação.
- CA-D02 — Dado esse salvamento, então existe uma contribuição global sanitizada, vinculada à origem e visível somente ao Super Admin.
- CA-D03 — Dado termo normalizado idêntico nas duas camadas, quando a resolução ocorre para a empresa, então o conceito da empresa vence; outra empresa continua usando o Global.
- CA-D04 — Dado candidato semelhante, então ele é apresentado sem pré-seleção e nenhuma escrita ocorre até decisão humana.
- CA-D05 — Dado um Super Admin, quando revisa a contribuição, então pode pesquisar com IA, decidir a Global e registrar a decisão; admin/owner não acessam essa fila nem a ação global.
- CA-D06 — Dado pesquisa por IA, então só termo sanitizado e fontes permitidas saem da plataforma; falha, orçamento ou indisponibilidade não bloqueiam o conhecimento local.
- CA-D07 — Dado aprovação/rejeição/adiamento global, então o conceito local, sua versão e suas observações permanecem preservados.
- CA-D08 — Testes negativos negam escrita interempresa, publicação Global por `owner`/`admin`, promoção automática e chamada externa com dados proibidos.

## ESTADO

- agreed

## APROVAÇÃO

- Product Owner: Bruno Harita.
- Data: 2026-09-19.
- Evidência: decisões explícitas na conversa: gravação local imediata; contribuição global revisável; Empresa → Global; IA externa disponível para Super Admin; autoridade total do Super Admin dentro do fluxo.
- Referência imutável para o prompt: este contrato 1.0.0.
