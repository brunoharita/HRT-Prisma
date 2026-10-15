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

## Validação local e preservação

18 testes Node dirigidos (diretório, cronologia e destaques existentes, versão), 4 testes Deno (worker novo e normalização anterior), 22 testes de tooling/contexto, checagem Deno do entrypoint completo, tipos root/web, build web, lint/contexto/ledger PASS. SQL isolado executa resolver, papéis/RLS reais do schema local; tabelas novas de classificação vêm do DDL existente, fila antiga é fixture mínima para testar orçamento, cron.schedule é stub sem rede. Cobre 27 verificações, incluindo alias, nível, áreas gerais, candidatos/lease inválidos, caps ausentes/zero, orçamento compartilhado, recruiter/member/anon/tenant, despublicação, supersessão, contexto sem fonte, cache e exclusão compartilhada. Não prova execução real do cron/provider, que depende do smoke de publicação.

Browser sintético usa componentes de produção e transportes locais, sem banco/provedor remoto: desktop1448 e celular390; colunas, cargo original, combinação na mesma experiência, trajetória, limpeza, ausência do agrupamento e navegação PASS, zero erros e zero chamadas externas. Evidências `evidence/people-taxonomy-v272/browser`. Referência inicial é contraprova; mantém tabela clara, hierarquia/ações existentes e agrupamento próximo dos filtros, sem redesenho adicional. Celular usa rolagem interna da tabela, sem overflow da página.

Descoberta de preservação: cache sem FK de pessoa poderia sobreviver à exclusão. Mapa revisado: exclusão é `critical_transversal`; trigger remove contexto sem outra fonte, teste real SQL cobre retenção compartilhada e remoção da última fonte. Esta correção pertence ao mesmo contrato; foi concluída antes do deploy. Os três módulos publicados de normalização/histórico anteriores foram comparados integralmente com knowledge-agent20 e permanecem idênticos; entrada nova tem o mesmo gateway JWT e segredo do monitor.

Dispatcher: somente nova migração, knowledge-agent e web; Parser/Paddle/synthesis/mail não são destinos. A recomendação genérica `pnpm run test` foi reduzida à cobertura dirigida acima conforme AGENTS8/10; CI obrigatório executa a foundation completa. Primeiro CI funcional38765060578 SUCCESS; correção de preservação exige novo CI no SHA final. Publicação ainda não comprovada nesta etapa.
