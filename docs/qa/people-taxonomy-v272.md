# Acordo, execução e AoT: Pessoas 2.7.2

Acordo 1.0.0 aprovado por Bruno nesta conversa em 15/10/2026. Pedido autoriza implementação, integração em main e publicação. Baseline 12ef517 (runtime 2.7.1). Branch codex/people-taxonomy-v272.

## Acordo congelado e execução

- D-01: acrescentar Área(s) profissional(is), Função/cargo e Atuação recente na tabela clara de Pessoas; conservar identificação, ações, estados de Perfil/importação e filtros atuais. Área e função usam identidades aprovadas do Knowledge, sem outra biblioteca.
- D-02: filtros por área e função usam as mesmas associações das colunas. Escopo atual/mais recente ou trajetória completa. Combinação área/função deve corresponder à mesma experiência. Cronologia desconhecida permanece explícita.
- D-03: partir exclusivamente do Perfil aprovado vigente. Manter texto original do cargo, organização, período, experiência/Perfil de origem, método e versões. Não promover nível hierárquico por alias ocupacional.
- D-04: priorizar aliases exatos aprovados com precedência da empresa. IA fechada pode associar aos candidatos existentes, identificada como agrupamento inferido para navegação. Não publica conceitos/aliases globais. Declarações gerais de áreas não comprovam sua aplicação a cada experiência.
- D-05: processamento automático em segundo plano, cache por empresa/contexto/taxonomia/método/modelo; limites e opt-in existentes de Knowledge. Não consultar IA na abertura da lista/filtros. Falha/ambiguidade mantém consulta textual e exibe ausência de agrupamento, sem fila obrigatória para gestor. Correção pode usar edição/republicação existente do Perfil ou curadoria existente dos aliases do Knowledge.
- P-01: não criar biblioteca paralela, alterar fatos/versões do Perfil, Score, matching, decisões de seleção ou publicar curadoria humana automaticamente.
- P-02: não cruzar empresas, expor currículo integral/identidade à IA, aceitar IDs não candidatos ou classificações despublicadas, nem ampliar orçamento/etapas obrigatórias.
- F-01: redesenho integral da página, limpeza geral da biblioteca, novos modelos/fontes externas e novas tarifas comerciais.
- A-01: nomes internos, armazenamento de projeção/cache, paginação e adaptação responsiva dentro dos componentes atuais são delegados à engenharia.
- CA-01: testes determinísticos cobrem temporalidade, combinação na mesma experiência, origem, fallback e hierarquia; integração SQL isolada cobre alias/escopo/candidatos/lease/budget/RLS; tipos/build e testes da IA não dependem de provedor real. Evidência visual desktop/mobile e smoke publicado. CI obrigatório, release seletivo e sincronização.

Execução: implementar integralmente D-01..05/P-01..02, preservar F-01, usar A-01. Referência visual fornecida é contraprova da pobreza informacional; manter tabela clara e ações do diretório, acrescentando colunas e filtros sem adotar redesign não escolhido.

## GOV-01 inicial e fechamento mínimo

| Capacidade | Relação | Preservação / validação mínima |
| --- | --- | --- |
| Lista, filtros e busca de Pessoas | direct | testes de seleção conjunta/temporalidade/fallback, UI real em desktop/mobile |
| Knowledge e normalização | direct | resolver existente, candidatos aprovados, cache, limites compartilhados; testes negativos e regressão da normalização atual |
| Perfil manual/PDF publicado | plausible_indirect | trigger somente projeção, originais imutáveis; testes SQL de publicação/supersessão e regressão dirigida |
| Autorização e privacidade | critical_transversal | tenant/RLS/anon/member, IA minimizada, sem contato ou currículo integral |
| Score, matching, seleção e Tokens | no_impact_identified | rastrear leitores/escritores; projeção exclusiva da lista e orçamento operacional existente, sem tarifa/débito |
| Publicação web/banco/knowledge-agent | direct | dispatcher, rollback, CI, health/versão e smoke autenticado |

Fechamento exige CA-01, owner docs/contexto/ledger, evidências e publicação dos destinos derivados do diff. Sem QA remoto separado, integração sensível usa PostgreSQL local isolado antes de produção. Estado inicial dos acordos: NOT TESTED. AoT final será completado com resultados, sem presumir sucesso.
