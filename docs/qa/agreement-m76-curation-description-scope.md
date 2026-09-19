# Acordo M7.6 — Descrição de conceito e alcance seguro na curadoria

Versão: 1.0.0. Estado: agreed. Product Owner: Bruno. Aprovação: 2026-09-18, “não precisa preservar esse histórico de justificativa... fazer estilo AoT”. Baseline: `15a82a463ee713487f5af38265130a63b566cbfb`.

## DEVE

- D-01 — No fluxo “Propor novo conceito”, exibir e persistir `Descrição do conceito` como campo opcional. O valor pertence ao conceito proposto e não é evidência pessoal.
- D-02 — Remover “Justificativa da associação” da interface, do payload da curadoria e da persistência específica de associações/propostas iniciadas pelo Perfil. Novas decisões não podem capturar esse campo.
- D-03 — O alcance padrão continua sendo `Knowledge da empresa`; somente `super_admin` pode escolher `Knowledge Global`. A regra deve ser aplicada na UI e no backend.
- D-04 — Associação existente continua resolvendo alias sem descrição; proposta continua pendente e não publica conceito nem encerra a declaração automaticamente.
- D-05 — Preservar tenant, autoridade humana, natureza declarada, snapshots, concorrência, proveniência e o fluxo de busca/debounce já entregue.
- D-06 — Atualizar contrato, ADR, migration, tipos/adapters, testes negativos, Context Pack, rollout, smoke e AoT no mesmo movimento.

## PROIBIDO

- P-01 — Não aceitar ou persistir justificativa de curadoria pelo novo RPC, inclusive por chamada manual ou payload adulterado.
- P-02 — Não permitir `global` para papel diferente de `super_admin`, mesmo que a opção seja enviada diretamente ao backend.
- P-03 — Não tornar descrição obrigatória, publicar proposta automaticamente, transformar associação em evidência demonstrada ou alterar Perfil/snapshot.
- P-04 — Não remover justificativas de fluxos administrativos distintos do Knowledge sem contrato próprio.

## FORA DE ESCOPO

- F-01 — Não alterar aprovação administrativa de propostas na página Knowledge nem outros campos de auditoria não pertencentes à curadoria do Perfil.
- F-02 — Não criar IA, fonte, taxonomia, dependência ou reprocessamento.

## AUTONOMIA

- A-01 — Versionar uma RPC de curadoria sem justificativa, mantendo compatibilidade controlada para clientes antigos sem voltar a gravar o campo.
- A-02 — Usar migration aditiva e limpeza delimitada dos dados de justificativa produzidos especificamente pela curadoria, sem apagar auditoria não relacionada.
- A-03 — Definir limite seguro para descrição opcional, tratamento de vazio, loading, mensagens e acessibilidade dentro da composição visual existente.

## CRITÉRIOS DE ACEITE

- CA-01 — Proposta pode ser gravada com nome, tipo e descrição vazia ou preenchida; a descrição aparece em `original_proposal.proposed_concept.description` e a pendência permanece aberta.
- CA-02 — O painel não renderiza nem envia justificativa; a migration/RPC não persiste `rationale` ou `reason` originado pela curadoria.
- CA-03 — `super_admin` pode escolher Global; owner/admin/member/anon e outro tenant são rejeitados server-side com falha fechada.
- CA-04 — Alias de empresa continua funcionando sem justificativa e sem alteração de snapshots; associação Global continua exigindo Super Admin.
- CA-05 — Typecheck, lint, testes de domínio, PostgreSQL descartável com negativos, Context Pack, build/CI, smoke autenticado e rollback passam; limitações ficam no AoT.
