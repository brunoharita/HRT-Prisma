# ADR-069 — Governança Company → Global da Knowledge

Status: accepted. Data: 2026-09-19. Acordo `docs/qa/agreement-m77-knowledge-company-global-governance.md` v1.0.0.

## Decisão

`owner` e `admin` gravam Knowledge aprovada no escopo da própria organização, com resolução imediata das observações correspondentes. Cada criação local produz uma contribuição Global separada, sanitizada e rastreável. A resolução mantém a precedência Organization → Global; mesma label não une nem modifica conceitos distintos.

Somente Super Admin lê e decide a fila de propostas. Pode usar o `knowledge-agent` existente para pesquisa externa sob demanda; a IA usa termo sanitizado, fontes permitidas, orçamento e auditoria, e jamais publica automaticamente. A decisão Global cria ou altera apenas a camada Global e preserva o conceito local de origem.

## Consequências

Não há nova Knowledge, provider, embedding ou pesquisa automática. A extensão acrescenta a origem estruturada da contribuição à proposta e restringe a fila global por RLS. Histórico e decisões continuam auditáveis; reinterpretação permanece manual e baseada em impacto.

## Extensão aprovada em15/10/2026 — Macroáreas

O Product Owner aprovou aplicar a mesma governança às macroáreas profissionais: tipo próprio nas entidades existentes de Knowledge, cadastro global/local com versões, contribuição separada a cada revisão e decisão exclusiva do Super Admin. A classificação automática é projeção de navegação, com seleção humana prioritária no Perfil; não reinterpreta competência ou Score. Especificação `docs/architecture/professional-areas.md`, acordo `docs/qa/professional-areas-v274.md`1.0.0. Substitui o uso de H1 como macroárea do diretório2.7.2, preservando a taxonomia de competências.
