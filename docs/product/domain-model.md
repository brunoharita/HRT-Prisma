# Modelo de domínio

## Entidades

- Grupo: camada acima das empresas para delimitar Owners, Admins, Recruiters e Members.
- Organização: tenant cliente e limite de isolamento.
- Usuário: operador autenticável do Prisma, ligado a identidade, autenticação, autorização, grupo, empresas permitidas, status e trilha de auditoria.
- Unidade: componente hierárquico da organização.
- Papel: definição reutilizável da função esperada.
- Posição: cadeira concreta do organograma, ocupada, vaga, planejada ou inativa.
- Vaga: necessidade atual de preencher uma posição ou papel.
- Pessoa: identidade profissional única no tenant, com lifecycle de candidata, colaboradora, ex-colaboradora, ex-candidata ou talent pool.
- Documento: fonte associada a uma pessoa, inicialmente currículo.
- Perfil profissional: consolidação estruturada e versionada de fontes.
- Evidência: fato encontrado explicitamente em uma fonte.
- Inferência: conhecimento derivado de evidências, com regra e versão.
- Recomendação: orientação contextual que não altera fatos ou inferências.
- Decisão humana: ação registrada separadamente da recomendação.
- Resultado observado: consequência posterior preservada sem reescrever a decisão.
- Competência: conceito normalizado sustentado por sinais explícitos ou inferidos.
- Avaliação: comparação contextual entre pessoa e vaga ou, futuramente, papel.

## Papel, posição e vaga

Papel define missão, responsabilidades e expectativas. Posição representa uma cadeira real em uma unidade. Vaga representa uma necessidade de preenchimento. A vaga referencia o papel e guarda somente contexto ou requisitos específicos, sem duplicar toda a arquitetura funcional.

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

## Pipeline atual

```text
document -> parsing -> extraction -> normalization -> evidence -> inference -> professional profile
```

`ExtractionProvider` não conhece o repositório. O domínio não conhece fornecedor de IA. `processResume` orquestra estados, validação, persistência e telemetria.
