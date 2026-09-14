---
owner: product
status: approved_for_implementation
version: 1.0.0
approved_at: 2026-09-14
---

# Agreement Contract — M6.2 Jornada contextual de verificação

## DEVE

- **D-001** A jornada nasce de ação humana sobre Pessoa, Posição, versão e requisito exatos; a central de Verificações funciona como caixa de acompanhamento.
- **D-002** O contexto imutável mostra Pessoa, Posição/versão, requisito/importância, competência, nível, criticidade, política, matching e fingerprint disponíveis.
- **D-003** A necessidade reutiliza evidências e proveniência do matching persistido; não cria interpretação paralela.
- **D-004** O detalhe explica motivo, evidências, estado do instrumento e linha do tempo.
- **D-005** Contexto fixo aparece como leitura; controles existem somente quando há escolha real.
- **D-006** Definições e instrumentos são filtrados pela competência e pelo nível exatos, com seleção acessível e estado vazio.
- **D-007** Blueprint, Rubric e Item Bank têm prévias reais sem revelar enunciados protegidos.
- **D-008** A revisão mostra contexto, versões, quantidade, duração, política e efeito esperado antes de preparar e gerar o convite.
- **D-009** O convite deixa explícito que compartilhamento é manual, mostra expiração exata e o resultado que a Pessoa verá.
- **D-010** O link oferece cópia com falha tratada, seleção manual, abertura da página e proteção contra saída antes de copiar ou abrir.
- **D-011** O acompanhamento permite localizar Pessoa, Posição, requisito, competência e estado; concluído e inconclusivo são estados separados.
- **D-012** O resultado mostra cobertura, método, integridade, nível demonstrado, limites e versões. Evidência Demonstrada fortalece somente o requisito exato.
- **D-013** Ler a caixa de necessidades não cria nem modifica registros.
- **D-014** RPCs permanecem tenant-scoped, exigem revisor autorizado, falham fechadas em contexto ou versão divergente e auditam criação/reuso.

## PROIBIDO

- **P-001** Criar necessidade silenciosamente, escolher Pessoa/requisito automaticamente ou usar fixture de demonstração em leitura.
- **P-002** Criar score, bônus genérico, cutoff, ranking ou decisão automática de contratação/rejeição.
- **P-003** Tratar falta de evidência ou resultado inconclusivo como falta de competência.
- **P-004** Inventar exigência de política, competência, nível ou criticidade sem origem visível.
- **P-005** Enviar e-mail/WhatsApp automaticamente, usar Pessoas reais ou revelar itens protegidos.
- **P-006** Cruzar organização, aceitar matching sem versão suportada ou requisito fora da versão avaliada.

## FORA DE ESCOPO

- **F-001** Produção.
- **F-002** Provider externo, delivery automático, assessment com Pessoas reais e novas modalidades.
- **F-003** Alteração dos pesos ou da fórmula do `matching-score-1.0.0`.
- **F-004** Reescrita de Perfil, Knowledge ou evidências históricas.

## AUTONOMIA

- **A-001** Composição visual, texto de apoio e decomposição técnica, preservando a fundação UX aprovada.
- **A-002** Migration forward-only, índices e DTOs estritamente necessários para identidade, leitura e auditoria.
- **A-003** Testes negativos, dados sintéticos e smoke autenticado no Prisma-QA.

## CRITÉRIOS DE ACEITE

- **CA-001** Ação no requisito cria/reutiliza necessidade e abre o detalhe com contexto idêntico ao matching.
- **CA-002** Requisito de outra versão/empresa, matching antigo e usuário sem autoridade são recusados.
- **CA-003** Abrir/recarregar a caixa geral não executa `ensure_m51a_demo_need` nem grava dados.
- **CA-004** Preparação não contém Select/Radio de opção única e todas as ações visíveis respondem.
- **CA-005** Sem Definition compatível, há estado indisponível explícito e a preparação não avança.
- **CA-006** Convite declara envio manual, mostra data/hora de expiração e trata falha de clipboard.
- **CA-007** Monitor separa inconclusivas, busca pelo contexto e apresenta linha do tempo/versões.
- **CA-008** Concluída fortalece só o requisito exato; inconclusiva não pontua nem prova ausência.
- **CA-009** Regressões de matching, Posições, Perfis e M5.1 continuam passando.

## Pendências

Nenhuma decisão funcional pendente. Produção e uso com Pessoas reais exigem autorização própria.
