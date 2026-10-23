# Acordo — reconhecimento da trajetória pelas atividades

Versão1.0.0, congelada pela autorização explícita de Bruno em23/10/2026 após a proposta neste chat. Baseline `b00f03f5c5337772694e779a97b1c40fa41cdad3`. Classe D: matching, runtime compartilhado e persistência versionada.

## DEVE

- D-01: considerar atividades, responsabilidades e entregas das experiências publicadas, em conjunto, mesmo com cargo diferente; reconhecer trajetória relacionada ao núcleo da Posição sem exigir cargo idêntico. Não tornar área ampla equivalente à função específica.
- D-02: separar relação profissional, senioridade e requisitos; pendência de gestão de pessoas não apaga experiência relacionada. Atividade reconhecida sem equivalência integral permanece relacionada e explicada, com pontos a verificar.
- D-03: reservar classificação contextual conclusiva para conexões isoladas; quando existe evidência profissional ainda insuficiente para determinar a relação, sinalizar a necessidade de análise e não esconder essa dúvida no grupo recolhido.
- D-04: reutilizar Knowledge, decisões humanas e interpretação seletiva existentes; ampliar a triagem para atividades profissionais plausíveis não resolvidas, mantendo limites, cache, fallback e proveniência. Considerar todas as experiências pertinentes, não apenas o primeiro trecho.
- D-05: preservar fórmula, pesos, contrato `matching-score-1.4.0`, requisitos, histórico, decisões humanas e isolamento. Versionar reconhecimento/triagem e aceitar a nova versão nos consumidores protegidos.
- D-06: resultados anteriores permanecem imutáveis; nova dependência de método permite atualização auditada sob demanda nas consultas autorizadas, com lease e preservação do anterior na falha. Sem varredura ou IA em massa na publicação.
- D-07: validar positivos semelhantes a coordenação de estoques para gerência, nomes distintos e experiência histórica; negativos de ferramenta isolada, venda de software, área ampla, negação e texto insuficiente. Publicar apenas superfícies derivadas do diff.

## PROIBIDO

- P-01: inventar experiência, equivalência integral, gestão de pessoas, contratação, rejeição ou bônus por palavras/ferramentas.
- P-02: alterar pesos, Perfil, Knowledge, decisões humanas ou sobrescrever histórico; usar produção como fixture de teste ou disparar IA paga para demonstração.
- P-03: aceitar versão, tenant, fonte, lease ou autoridade desconhecidos; transformar falha da interpretação em ausência de experiência.

## FORA DE ESCOPO / AUTONOMIA

- F-01: redesenho das telas, taxonomia externa nova, novo modelo/prompt, nova biblioteca, alteração de avaliação de candidatos ou decisão de contratação.
- A-01: engenharia escolhe recuperação conservadora de atividades e apresentação mínima da incerteza, reutilizando contratos/componentes e sem novo ranking.
- Q: nenhuma decisão material pendente.

## Aceite e validação mínima

CA-01/D-01..04: fixtures sintéticas contrastantes demonstram reconhecimento, fontes completas, triagem seletiva e dúvidas legíveis; par análogo ao Willian sai de contextual quando há coordenação efetiva de estoque, sem presumir equipe.
CA-02/D-05..06/P-01..03: testes dirigidos de score, matching, semântica/fallback, runtime idêntico web/Edge, estabilidade/histórico, SQL local descartável com rollback, autorização negativa e leases. Pesos e decisões preservados.
CA-03/D-07: tipos/build, checks afetados, Context Pack, CI obrigatório, migration/Edge/web conforme plano, smoke e sincronização; limites de evidência explícitos no AoT.

## Mapa de impacto inicial

| Capacidade | Relação | Baseline / preservação e prova |
| --- | --- | --- |
| Descoberta, fontes e triagem | direct |5.1.0/triage2.0.0 restringem descrição; regressão positiva/negativa e runtime compartilhado |
| Score/requisitos/senioridade | plausible_indirect | pesos10/25/35/10/10/10 e contrato1.4.0; testes dirigidos e comparação de pesos |
| Estabilidade e histórico | direct | resultado salvo só muda por fontes/recálculo; dependência causal de reconhecimento versionada, anterior íntegro e leases testados |
| Tenant, decisões humanas, M6.2 | critical_transversal | guards/grants existentes; nova versão aceita sem relaxar desconhecidas, SQL negativo e Edge |
| Busca/comparação | direct | grupos e explicações existentes; dúvida identificada sem novo ranking, render sintético e ações preservadas |
| Parser/Synthesis/Auth/processos | no_impact_identified | fontes publicadas só de leitura e diff sem regras dessas jornadas; smoke de serviços preservados |

Decisão de versão: matching determinístico5.2.0; reconhecimento1.0.0; triagem2.1.0. Semântica7.0.0, prompt/modelo e score1.4.0 preservados. Atualização de método em dependências autoriza uma avaliação por par sob demanda; não é invalidação por relógio/visita nem lote global.

## Emenda1.0.1 — versão pública aprovada

Bruno determinou explicitamente em23/10/2026: “versão deve ser3.1.4”. Acrescenta D-08: identificar esta entrega como Prisma3.1.4 no registro central e nas superfícies que o consomem. CA-04: teste de registry confirma3.1.4 e história3.1.3 preservada; build e publicação web conferem3.1.4 em produção. Esta decisão substitui a identificação pública3.1.3 da entrega, sem modificar D-01..07/P-01..03/F-01. A-01 abrange o ajuste mecânico.
