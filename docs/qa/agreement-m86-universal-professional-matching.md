# Contrato de Acordo — M8.6 Matching profissional universal

Versão: 1.0.0
Estado: `agreed`
Escopo: interpretar a relação entre o trabalho descrito na Posição e a trajetória publicada da Pessoa, com Knowledge-first e IA somente como último recurso.

## DEVE

- **D-01 — Knowledge-first.** Buscar primeiro relações, aliases e referências aprovados na Knowledge global e da empresa, preservando origem, versão e tenant. Uma relação interna suficiente é reutilizada sem chamada de IA.
- **D-02 — IA como último recurso.** Se não houver resposta interna segura, ou houver somente relação relacionada que exija esclarecimento, a IA interpreta o par Posição/Perfil usando contexto mínimo, missão, responsabilidades e evidências atribuíveis. A IA não grava regra global automaticamente.
- **D-03 — Cobertura universal.** A ausência de correspondência lexical entre títulos não exclui o Perfil antes da interpretação. Só não consomem IA e são desconsiderados para aquela Posição os Perfis publicados/autorizados sem conteúdo profissional utilizável.
- **D-04 — Contrato comum.** A interpretação usa categorias fechadas: `direct_function`, `equivalent_function`, `related_function`, `entry_potential`, `context`, `other` e `unclear`. A categoria descreve a relação com a Posição; a natureza e a fonte da evidência permanecem separadas.
- **D-05 — Grupos e cálculo.** Relação direta ou equivalência funcional sustentada pertence ao Grupo A; relação transferível/adjacente ou potencial de entrada ao Grupo B; somente contexto ao Grupo C sem score comparável; indeterminado, erro e ausência de dados permanecem pendentes. O cálculo é determinístico e a equivalência semântica preserva grupo e score da relação equivalente.
- **D-06 — Limites semânticos.** Família, setor, ferramenta ou palavra parecida não bastam. Especialização, habilitação, requisito específico, simultaneidade e atividade atribuível exigem evidência própria. Título não prova todas as tarefas nem senioridade.
- **D-07 — Híbridos.** Quando dois componentes forem centrais, relação integral exige evidência direta ou funcionalmente equivalente nos dois. Evidência de um só componente é parcial/relacionada; experiências separadas não provam simultaneidade; o sistema não escolhe silenciosamente o componente principal.
- **D-08 — Tempo.** Duração e recência são propriedades da versão da Posição e aplicam-se igualmente a todas as Pessoas comparadas. Posição que não exige experiência não usa essas dimensões, mas continua valorizando experiência relevante nas dimensões de área e função. Datas insuficientes permanecem não determinadas.
- **D-09 — Senioridade.** Quando Posição e evidência sustentarem explicitamente os níveis, a diferença de um nível recebe ajuste `-1` e diferença material `-4`, tanto acima quanto abaixo; alinhamento recebe `0`. Título isolado, idade, prestígio e anos de carreira não bastam.
- **D-10 — Aprendizado governado.** Usuário autorizado pode corrigir/confirmar uma relação reutilizável e propor sua entrada na Knowledge da empresa pelo Inbox/proposta/aprovação existente. Associação específica Pessoa/Posição permanece separada. Preservar termo original, justificativa, autor, evidências e histórico.
- **D-11 — Autoridade e proveniência.** Persistem tenant, versões, snapshots, cache compatível, citações literais válidas, estados de ausência/ambiguidade/erro e autoridade server-side. A IA não decide contratação, rejeição, acesso ou habilitação.

## PROIBIDO

- **P-01.** Equivalência automática por palavra, família, setor, ferramenta, prestígio ou cargo; inferência de especialização, credencial, simultaneidade ou capacidade pessoal.
- **P-02.** Usar ausência de evidência como incapacidade, converter erro/pendência em zero, omitir dimensão aplicável para compensar lacuna ou criar nota livre.
- **P-03.** Criar base paralela, publicar relação global automaticamente, sobrescrever Knowledge aprovada, reescrever fontes/snapshots ou misturar tenants/versões/cache.
- **P-04.** Enviar currículo integral, pesquisar externamente Pessoas, registrar PII/segredos desnecessários ou aceitar instruções contidas nas fontes.
- **P-05.** Decidir contratação/rejeição automaticamente ou apresentar score como probabilidade de sucesso.
- **P-06.** Declarar qualidade universal, economia ou cobertura sem corpus e evidência correspondentes.

## FORA DE ESCOPO

- **F-01.** Nova taxonomia paralela, novo fornecedor/infraestrutura, embeddings, pesquisa externa de Pessoas e reprocessamento retroativo fora da jornada.
- **F-02.** Alteração dos requisitos como se fossem trajetória, novas faixas de pontuação não aprovadas, parecer jurídico e decisão automática de contratação.
- **F-03.** Publicação global automática de aprendizado; somente a Knowledge da empresa pelo fluxo humano existente.

## AUTONOMIA

- **A-01.** Engenharia pode adaptar módulos, prompt/schema versionado, cache, concorrência, lotes, feature flag, compatibilidade aditiva, migration forward-only, runtime gerado e release seletivo.
- **A-02.** Engenharia pode escolher corpus sintético e holdout sem PII, desde que fixe expectativas antes da avaliação e registre limitações.
- **A-03.** Limiar operacional de custo/latência pode ser protegido por configuração existente ou nova configuração versionada, sem transformar falha opcional em evidência negativa.

## CRITÉRIOS DE ACEITE

- **CA-01.** Knowledge aprovada suficiente evita chamada de IA; relação apenas relacionada pode chamar IA; ausência segura preserva origem e estado.
- **CA-02.** Desenvolvedor/programador no mesmo domínio e descrições parafraseadas preservam relação, grupo e score sem alias pré-cadastrado; negativos de domínio, especialização e autoria distinguem-se.
- **CA-03.** Perfis sem conteúdo profissional utilizável não chamam IA e são desconsiderados para a Posição; a interface não os apresenta como incapazes.
- **CA-04.** Funções híbridas, entrada, trabalho não formal, histórico, datas ausentes, sobreposição e senioridade acima/abaixo exercitam regras separadamente.
- **CA-05.** Cálculo frontend/backend compartilhado permanece determinístico; snapshots, cache, autorização, RLS/SQL e fonte literal falham fechados em negativos.
- **CA-06.** Correção reutilizável gera proposta tenant-scoped auditável, sem publicação automática e sem alteração da associação específica.
- **CA-07.** Corpus de avaliação é separado da calibração e mede relações reconhecidas/perdidas, falsas equivalências, abstenções, citações, cobertura, chamadas, cache e latência. Nenhum caso crítico positivo pode falhar e ser mascarado por média global.
- **CA-08.** Validação inclui testes dirigidos, typecheck/build/lint, runtime gerado, release plan, Context Pack, CI, smoke autenticado proporcional, SHA coerente e rollback. Produção não é ambiente de teste.

## Mapa de impacto

| Área | Relação | Preservação/prova |
| --- | --- | --- |
| Interpretação e prompt | `direct` | categorias, citações, invariância e negativos |
| Descoberta | `direct` | sem veto lexical; sem IA para Perfil vazio; custo/retomada |
| Score/tempo/senioridade | `direct` | cálculo determinístico, versão e ajuste explícito |
| Híbridos/grupos | `direct` | componentes centrais e A/B/C |
| Knowledge | `direct` | leitura primeiro; proposta humana tenant-scoped |
| Auth/RLS/PII/cache/snapshot | `critical_transversal` | negativos de tenant, versão, autoridade e fonte |
| UI | `plausible_indirect` | explicação de relação, pendência e origem |
| Parser/publicação | `no_impact_identified` | somente leitura de Perfil publicado |
| Release | `direct` | web, Edge Function e migration conforme diff |

Baseline: `98bb6cc919d1c90dac04a0bf7e2cf1d6cc1674d2`. Nenhuma aceitação presume que todas as profissões já tenham qualidade empiricamente comprovada.
