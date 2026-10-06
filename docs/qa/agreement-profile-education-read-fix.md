# Acordo e execução — Correção da leitura acadêmica v2.0.12

Versão1.0.0 agreed/frozen, 2026-10-06. Bruno autorizou corrigir o diagnóstico do card: banco v5 conserva MBA concluído, fontes humanas e revisão, mas readEducation do prismaRepository descartava metadados. Escopo de correção/main/produção sob autorização permanente; sem nova entrega pública, produto permanece2.0.12. Baseline2ad6afa85418d76d2f77c8c43d50cde970b45511; web7db478f/image793e7465. Branchcodex/profile-education-read-fix, riscoC/B. Screenshot do usuário é contraexemplo; topologia quatro cards e conteúdos/fontes do acordo profile-summary-cards-v2012 v1.0.0 preservados.

## DEVE / PROIBIDO / FORA / AUTONOMIA / PENDENTE

- D-01: transportar classificação/revisão/fontes/método/motivos/snapshot válidos já publicados, via resolvedor existente, do carregamento real loadPersonProfile à view canônica e ao card. Nenhuma confirmação nova fabricada; metadado desconhecido continua desconhecido.
- D-02: título de formação explicita qualificação conhecida/sustentada (MBA, Especialização, Mestrado etc.); qualificação ausente mantém nível genérico. Empates preservados, MBA/especialização coexistem, andamento/inferência não confirmada não vira conclusão.
- D-03: preservar layout, demais cards, oito respostas completas, fontes sob demanda, status de revisão e histórico. Corrigir leitura beneficia consumidores da mesma projeção, sem editar perfis/snapshots persistidos.
- D-04: produto2.0.12 continua, método de projeção1.0.1 identifica a correção de apresentação. Tests dirigidos/tipos/build/contextos/CI/main/web seletiva/smoke/rollback/sync/AoT.
- P-01: inventar conclusão/confirmação, aceitar string true como booleano revisado, reclassificar ao ler, apagar histórico, alterar perfil/tenant/grants/schema/IA/matching/Parser/worker.
- F-01: backfill, nova taxonomia/contrato persistido/IA, dados reais como fixture, outras melhorias, suíte integral local.
- A-01: reusar resolveEducationClassification e rótulos oficiais existentes, sem nova biblioteca. Teste integrado chama método e decodificadores reais contra transporte Supabase sintético sem rede. UI usa essa projeção, não objeto final preenchido à mão.
- Q-01: nenhuma decisão material pendente; autorização explícita à correção discutida.

## Mapa de impacto / baseline / aceite

| Capacidade | Relação | Baseline / regressão |
| --- | --- | --- |
| loadPersonProfile/readEducation e card | direct | MBA sintético revisado sumia; teste integração antes falha/depois preserva, curso/instituição/período/revisão/snapshot, título e empates |
| Perfil completo/consumidores compartilhados | plausible_indirect | View canônica recebia metadados perdidos; assert identidade/contato/experiência/dados e metadados acadêmicos |
| Leitura tenant-scoped | critical_transversal | Queries existentes eq organization_id/person_id e RPCread; mock valida escopo, nenhuma mutation/API nova; diff/tipos/build |
| Outros cards/síntese/fontes | plausible_indirect |v2.0.12 ativo; UI desktop/mobile, fonte sem chamada adicional, oito respostas/4cards, origem da formação |
| SQL/IA/matching/Parser/worker | no_impact_identified | Nenhuma mudança nestas superfícies; plano+diff+imagens/saúde VPS preservadas |
| Registry/web/main | direct |2.0.12/793e7465; registry inalterado, CI/SHA/assets atuais e anteriores/rollback/HTTP200 |

CA-01: integração usa código real repository.loadPersonProfile → decodeProfile/readEducation → buildPrismaProfileView → profileHighlights; transporte sintetizado, nenhuma chave/provider/banco real. Negativos metadata inválida/legado/andamento/inferido e empates. CA-02: screenshot1448/390 de fixture fictícia MBA+especialização chega ao card por este fluxo, ambos inicialmente visíveis; origem correta com fontes. CA-03: tipos/build/checks/context/CI/publicação/smoke evidenciados, nenhuma mutação real. CA-04: diff somente escopo e capacidades compartilhadas preservadas.

## Prompt congelado

Executar D-01..04, P-01 e F-01 com A-01 e CA-01..04, preservando todos os acordos2.0.12 salvo explicitação autorizada das qualificações e correção dos metadados descartados. Não marcar declaração antiga desconhecida como confirmada. Registro de versão pública não recebe entrega fictícia. Não reabrir produto/taxonomia/infra; fechamento no AoT do movimento.
