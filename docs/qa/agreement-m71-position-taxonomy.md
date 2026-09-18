# Contrato de Acordos — M7.1 Taxonomia Profissional e Inteligência de Posições

Versão: 1.0.0. Estado: agreed. Product Owner: Bruno. Aprovação: pedido explícito de implementação e texto integral em `execution-m71-position-taxonomy.md`, nesta tarefa, 2026-09-18. As imagens de Posições enviadas na retomada substituem as imagens iniciais. Este índice classifica o contrato aprovado; o texto integral integra cada requisito e prevalece sobre qualquer resumo.

## DEVE — Inegociável

- D-01 — Estender Knowledge/Professional Concept existentes, sem arquitetura paralela.
- D-02 — Usar somente CBO, ESCO e O*NET publicados para normalização/relações oficiais.
- D-03 — Construir/reutilizar sob demanda, sem ontologia massiva nova.
- D-04 — Preservar o nome informado pela empresa.
- D-05 — Associar conceito Prisma com uma ou mais referências sustentadas; suportar resolvido, ambíguo e insuficiente.
- D-06 — Associação automática determinística, visível, explicável e corrigível, sem confirmação redundante.
- D-07 — Ambiguidade material exige seleção humana; nunca escolha silenciosa.
- D-08 — Insuficiência preserva título, fluxo manual e Inbox aplicáveis; não inventa referência.
- D-09 — Cada ligação conserva fonte, identificador, rótulo, snapshot, método e instante/versão.
- D-10 — Agrupar somente semânticas sustentadas, sem falsa ontologia comum nem equivalência superficial.
- D-11 — Exibir conhecimentos/habilidades/atributos como sugestões, sem exigir tudo.
- D-12 — Inclusão explícita no modelo atual de requisitos required/desired.
- D-13 — Preservar medidas de fonte sem convertê-las em nível, senioridade, score ou peso.
- D-14 — Complemento tenant-owned, reutilizável e distinguível, sem editar Global/fontes.
- D-15 — Criar Knowledge não basta para tornar item requisito; seleção/classificação são separadas.
- D-16 — Corrigir, substituir, resolver ou desfazer associação com auditoria.
- D-17 — Correção local não promove Global; feedback reutilizável segue governança vigente.
- D-18 — Reuso respeita tenant, escopo, publicação, versão, proveniência e ambiguidade.
- D-19 — Acesso explícito ao porquê de toda interpretação material.
- D-20 — Explicar nome, conceito, referências/versões, método, suporte, decisão humana/automática, histórico e correção; sem raciocínio privado.
- D-21 — Origem recuperável por sugestão, usando divulgação progressiva.
- D-22 — UX compartilhada, pt-BR, desktop/mobile, teclado/foco e estados recuperáveis.
- D-23 — Referências da Posição nunca são competência/evidência da Pessoa.
- D-24 — Preparar comparação posterior sem fundir Pessoa e Posição.
- D-25 — Preservar matching A/B/C, fórmula, pesos e compatibilidade de snapshots históricos.
- D-26 — Evoluir owner real da tela sem fundir Posição, Vaga e papel.
- D-27 — Associações materiais reconstituíveis por versão, escopo, decisão e auditoria.
- D-28 — Tenant em associações/feedback/complementos, RLS e autorização server-side sem novos privilégios.
- D-29 — Linguagem neutra para ausência/insuficiência.
- D-30 — Mudanças de interpretação rastreáveis, sem apagar histórico.
- D-31 — Dados reais publicados, sem códigos/equivalências hardcoded dos exemplos.
- D-32 — Conceitos/agrupadores reutilizáveis pelo futuro M7.2; não implementar Pessoa agora.

## PROIBIDO

- P-01 — Lominger.
- P-02 — Web research para completar taxonomia.
- P-03 — Nova fonte ocupacional externa.
- P-04 — Nova LLM/provider/embedding/dependência externa de IA.
- P-05 — Pré-publicação massiva de ontologia.
- P-06 — Substituir título da empresa pelo oficial.
- P-07 — Tratar uma fonte como exclusiva quando há múltiplos vínculos sustentados.
- P-08 — Apagar proveniência na consolidação.
- P-09 — Inferir exigência de todos os itens oficiais.
- P-10 — Classificar requisitos automaticamente.
- P-11 — Novo score/ranking/proficiência/senioridade/confiança probabilística.
- P-12 — Alterar fórmula/pesos/ordenação do matching/Prisma Score.
- P-13 — Converter taxonomia em evidência de Pessoa.
- P-14 — Implementar M7.2.
- P-15 — Sucessão/mobilidade/workforce planning/carreira.
- P-16 — 360, novas avaliações/testes/feedback de Pessoa.
- P-17 — Promoção Global automática de correção de cliente.
- P-18 — Modificar snapshot oficial por necessidade da empresa.
- P-19 — Duplicar required/desired.
- P-20 — Ocultar normalização relevante.
- P-21 — Bloquear silenciosamente Posição por falha de normalização.
- P-22 — Relaxar RLS/autorização.
- P-23 — Inventar categorias comuns não sustentadas.
- P-24 — Usar códigos/textos ilustrativos como verdade.

## FORA DE ESCOPO

- F-01 — Pessoa/M7.2, parser/OCR/publicação de Perfil, verificação nova, sucessão/mobilidade/carreira, metodologia comportamental, nova fórmula ou proficiência.
- F-02 — Pesquisa externa e reestruturação ampla de Knowledge.
- F-03 — Deploy, merge ou alteração remota sem autorização específica; commit/push seguem AGENTS.md.

## AUTONOMIA DE ENGENHARIA

- A-01 — Nomes internos, extensão ou contrato versionado aditivo, sem arquitetura paralela.
- A-02 — Layout, microcopy, agrupadores após inspeção real, reuso de componentes/RPCs.
- A-03 — Algoritmos determinísticos, índices/funções e refatoração mecânica necessária; sem nova semântica de negócio.

## PENDÊNCIAS

Autorização operacional posterior, 2026-09-18: Bruno solicitou "atualizar tudo. Deixar tudo em main, atualizado, localment, no git, no supabase e onde mais precisar". Isso satisfaz a autorização específica prevista em F-03 para integrar main, aplicar a migration e publicar o frontend no ambiente único existente. Não altera D-*, P-*, contratos funcionais, fontes, dados históricos ou autoriza limpeza de material alheio. Evidências de ativação estão no AoT.

Nenhuma decisão funcional pendente identificada. Limites operacionais de validação são registrados no AoT, sem autorização implícita de rollout.

## CRITÉRIOS DE ACEITE

CA-D01 a CA-D32: aplicar a cada D-* as provas detalhadas no texto integral de execução (cenários positivos, negativos, UI e regressão). Testes devem cobrir título preservado, alias, uma/múltiplas fontes, ausência de fonte, ambiguidade, insuficiência, deduplicação/proveniência, correção/nova versão, requisito explícito, complemento isolado, ausência de Global automático, autorização, compatibilidade de matching/M6.2, desktop/mobile/foco e Context Pack. Cada D-* e P-* recebe linha própria no AoT e permanece NOT TESTED até prova efetiva.

## Inspeção factual inicial

Baseline `1215c6e1cdd603a741e14def6724525b4fded2cb`; branch `codex/m71-position-taxonomy`. Material alheio preservado: `.tmp.driveupload/`, `services/paddle/Dockerfile.gpu`.

Consulta somente leitura ao backend `ioldpnqqvobprjiontre` confirmou CBO `CBO 2002-2025-06-06`, ESCO `1.2.1`, O*NET `31.0` publicados/correntes. A lista de projetos retorna nome atual `Prisma`, embora documentos o chamem Prisma-QA. Zero reconciliações ocupacionais aprovadas. CBO publicada tem `is_a` ocupação-família; ESCO tem `requires` com relevance essential/optional e conceitos classificados como knowledge no snapshot; O*NET tem requires/skill e uses/technology, com medidas originais. Não inventar relações ausentes ou reclassificar fontes.

Owners antigos contradizem publicação corrente e versões de matching; estado verificado e contratos vigentes prevalecem. M7.1 usa resolução determinística publicada no fluxo novo e preserva RPCs históricas. O gate de referência da UI M5.4.4 será substituído pelo estado explícito permitido pelo contrato M7.1; a RPC vigente já aceita referência nula. Nenhuma alteração de fórmula/matching.
