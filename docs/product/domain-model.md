# Modelo de domínio

## Entidades

- Grupo: camada acima das empresas para delimitar Owners, Admins, Recruiters e Members.
- Organização: tenant cliente e limite de isolamento.
- Usuário: operador autenticável do Prisma, ligado a identidade, autenticação, autorização, grupo, empresas permitidas, status e trilha de auditoria.
- Unidade: componente hierárquico da organização.
- Papel: definição reutilizável da função esperada.
- Posição: cadeira concreta do organograma, ocupada, vaga, planejada ou inativa.
- Vaga: necessidade profissional estruturada e contextual de uma posição, ocupada ou não ocupada; não é campanha de recrutamento.
- Pessoa: identidade profissional única no tenant, com lifecycle de candidata, colaboradora, ex-colaboradora, ex-candidata ou talent pool.
- Documento: fonte associada a uma pessoa, inicialmente currículo.
- Intake de currículo: operação temporária e tenant-scoped que preserva o PDF antes de resolver a Pessoa.
- Perfil profissional: consolidação estruturada e versionada de fontes.
- Evidência: fato encontrado explicitamente em uma fonte.
- Inferência: conhecimento derivado de evidências, com regra e versão.
- Recomendação: orientação contextual que não altera fatos ou inferências.
- Decisão humana: ação registrada separadamente da recomendação.
- Resultado observado: consequência posterior preservada sem reescrever a decisão.
- Competência: conceito normalizado sustentado por sinais explícitos ou inferidos.
- Avaliação: comparação contextual entre pessoa e vaga ou, futuramente, papel.
- Necessidade de Verificação: lacuna explicável de evidência sobre uma competência, criada em contexto profissional e resolvida, quando apropriado, por assessment.
- Evidência demonstrada: evidência produzida por avaliação prática estruturada, independente de evidências declaradas, contextuais e confirmadas.

## Papel, posição e vaga

Papel define missão, responsabilidades e expectativas reutilizáveis pela empresa. Posição representa uma cadeira real em uma unidade. Vaga representa a necessidade profissional contextual dessa posição, inclusive quando já ocupada. Cada versão preserva missão, responsabilidades, resultados, requisitos e contexto usados em descoberta ou comparação. Uma referência ocupacional global pode apoiar a definição, mas não substitui a função privada da organização nem publica automaticamente novo conhecimento.

Contextos futuros de papel podem incluir equipe, budget, autonomia, escopo, complexidade, stakeholders, setor, localização, regime, senioridade e criticidade. Esses campos estão planejados e não participam do matching atual.

## Invariantes

1. Evidência preserva documento, trecho e localizador.
2. Inferência referencia evidências e não substitui o fato.
3. Recomendação e decisão humana não viram atributos permanentes da pessoa.
4. Campo não identificado não é convertido em negação.
5. Entidades do tenant carregam organização.
6. Relações e avaliações entre organizações diferentes falham de forma segura.
7. Falha ou extração parcial não produz perfil completo.
8. Uma nova versão não reescreve silenciosamente o significado histórico.
9. Usuário opera o Prisma; Pessoa é representada pelo Prisma.
10. Criar, editar ou desativar um Usuário não cria nem altera uma Pessoa automaticamente.
11. Pessoa não recebe username, senha, perfil de acesso ou permissão de sistema.
12. Intake sem nome e contato válidos não cria Pessoa.
13. Possível correspondência nunca produz merge ou vínculo automático silencioso.
14. Pessoa é a entidade estável de navegação; falha ou pendência de documento não se torna estado principal da Pessoa.
15. O perfil aprovado com `superseded_at is null` permanece vigente até outra revisão ser aprovada.
16. Versão documental e versão de perfil são sequências independentes; Documento v2 não implica Perfil v2.
17. Descartar uma pendência documental preserva fonte, tentativas, revisão e eventos; não apaga o perfil atual.
18. Consultar um documento com revisão registrada mostra a fonte original e os campos estruturados juntos, sem habilitar mutações; detalhes operacionais permanecem uma consulta separada.
19. Nova importação é proposta e não substitui o perfil vigente antes da publicação atômica.
20. Omissão no documento novo significa `não citado`; somente decisão humana explícita e justificada remove fato aprovado.
21. Estado de produto é derivado de documento, tentativa, draft, revisão e perfil, sem ser persistido como atributo da Pessoa.
22. Uma experiência humana completa e espacialmente evidenciada pode ensinar a estrutura apenas dentro do currículo atual; experiências irmãs permanecem propostas até aceite e nunca publicam diretamente o perfil.
22. Verificação de competência nasce prioritariamente de uma necessidade profissional, não do Perfil individual.
23. Evidência demonstrada não sobrescreve evidência documental, contextual ou confirmada.
24. Assessment não determina nível absoluto da Pessoa nem senioridade consolidada.
25. O mesmo título pode representar Vagas com requisitos diferentes; matching usa a versão da definição, não apenas o título.
26. Sinal relacionado confirmado para uma Vaga não comprova o requisito e não vira equivalência Knowledge.
27. Comparação de Pessoas não produz score, ranking, vencedor ou decisão automática.

## Pipeline atual

```text
resume intake -> minimum identity -> tenant deduplication -> Person resolution
  -> document -> processing attempt -> extraction -> evidence -> human review
  -> publication Delta -> approved professional profile version
```

`ExtractionProvider` não conhece o repositório. O domínio não conhece fornecedor de IA. `processResume` orquestra estados, validação, persistência e telemetria.

## Pipeline futuro M5.1

```text
necessidade profissional -> requisito -> competencia -> Pessoa encontrada
  -> evidencias existentes -> analise de suficiencia
  -> necessidade de verificacao -> assessment
  -> evidencia demonstrada -> reavaliacao da necessidade
```

Esse pipeline está planejado e não existe no runtime atual.
