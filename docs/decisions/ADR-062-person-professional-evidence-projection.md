# ADR-062 — Projeção versionada de competências e evidências da Pessoa

Status: accepted. Data: 2026-09-18. Movimento: M7.2.

## Contexto

O Prisma já possui Perfil publicado, observações normalizadas pela Knowledge, conceitos profissionais do M7.1 e Evidência Demonstrada do M5.1. A tela de Pessoa precisava reuni-los sem duplicar taxonomia, gravar inferências derivadas, importar requisitos de Posição ou transformar revisão documental em verificação.

## Decisão

Adotar `person-professional-evidence-1.0.0`, projeção JSON somente leitura produzida no servidor para a organização e Pessoa autorizadas. Ela usa apenas o Perfil aprovado vigente, conceitos publicados compatíveis com `knowledge-normalization-2.0.0` e resultados M5.1 existentes. Declaração, contexto e demonstração são associações independentes com origem, método e versões. Apenas demonstração `active`, não expirada e com nível `basic`, `intermediate` ou `advanced` qualifica como verificada.

Ambiguidade, ausência de conceito, fonte indisponível ou versão incompatível viram issues explícitas e não associação inventada. Requisitos de Posição não participam da projeção. A UI agrupa por identidade/tipo do conceito publicado e falha fechado para contrato desconhecido.

## Consequências

- Não surge nova tabela canônica nem backfill; o estado continua nos owners existentes.
- O mesmo conceito pode conservar várias evidências e naturezas simultâneas.
- Certificado, documento, aprovação humana e inferência continuam evidência declarada/contextual, nunca verificação direta por si.
- A consulta SECURITY DEFINER mantém `search_path` vazio, guarda server-side e grant somente a authenticated; RLS dos owners permanece ativa.
- Mudança futura de semântica exige nova versão do contrato, compatibilidade explícita e nova decisão.

## Alternativas rejeitadas

- Persistir um segundo mapa de competências: duplicaria estado e poderia divergir do Perfil/Knowledge.
- Reaproveitar requisitos de Posição: violaria a separação Pessoa × Posição.
- Considerar qualquer documento revisado como verificado: apagaria a fronteira do M5.1.
- Classificar por regex da UI: criaria taxonomia paralela sem proveniência.
