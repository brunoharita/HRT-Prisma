# Acordo — consistência do reconhecimento profissional no matching

Versão 1.0.0. Decisão de Bruno em 2026-09-28: corrigir de forma geral para o Prisma SaaS o reconhecimento ocupacional e a apresentação do resultado pré-IA, conforme o diagnóstico da Posição backend. Complementa M8.6 v1.0.0 e o acordo de preservação após falha v1.0.0; não os substitui.

## DEVE

- D-01 — Uma relação ocupacional rastreável deve manter o mesmo grau de segurança ao informar área, função, grupo e períodos usados no score. Referência/alias Knowledge aprovado pode apoiar relação relacionada; título aproximado sozinho não comprova equivalência nem especialização.
- D-02 — Área profissional ampla, sem relação suficiente com o núcleo da Posição, não promove uma trajetória ao Grupo A. Experiência direta ou funcionalmente equivalente continua em A; relacionada em B; somente contexto em C.
- D-03 — Duração e recência usam períodos das experiências realmente relacionadas à função quando elas existem. Evidência de área ampla não deve substituir uma experiência ocupacional mais específica para pontuar tempo.
- D-04 — Após falha da IA, preservar integralmente o cálculo pré-IA da consulta, identificando-o como tal e mostrando sua versão. Não apresentá-lo como a última interpretação semântica válida de outra versão.
- D-05 — Versionar a mudança no matching determinístico; snapshots históricos permanecem legíveis e não são reescritos. O score mantém seus pesos e faixas aprovados.

## PROIBIDO

- P-01 — Inferir especialização backend, ferramentas, requisitos, atividade atual, senioridade ou equivalência global a partir de título, família, palavra ou área genérica.
- P-02 — Alvo personalizado de pontos ou ordenação para Pessoas reais; mutação de Perfil, Posição, Knowledge, decisão humana ou snapshot anterior.
- P-03 — Aceitar cache incompatível, enfraquecer tenant/autoridade, transformar falha de IA em zero ou ocultar a limitação do cálculo pré-IA.

## FORA DE ESCOPO

- F-01 — Alterar prompt/modelo, política de acionamento/custo da IA, pesos/faixas, requisitos da Posição ou curadoria da Knowledge.
- F-02 — Reprocessar registros reais ou criar novas relações globais automaticamente.

## AUTONOMIA

- A-01 — Engenharia escolhe as heurísticas conservadoras, estados explicáveis, versão aditiva, testes sintéticos contrastados e publicação seletiva dentro dos limites acima.

## CRITÉRIOS DE ACEITE

- CA-01 / D-01–D-03 — Casos sintéticos de programador/desenvolvedor de software versus backend preservam relação profissional sem inventar backend; área ampla isolada não vira A. Casos negativos de programador de produção, venda de software, outro domínio e ferramenta isolada não viram equivalência.
- CA-02 / D-03 — Períodos de função relacionada determinam duração/recência; atuação atual somente contextual não torna programação histórica recente. Datas indeterminadas não viram zero factual.
- CA-03 / D-04 — Busca, comparação e detalhe distinguem explicitamente cálculo pré-IA vigente de interpretação semântica anterior; falha preserva todos os campos e resposta válida permanece inalterada.
- CA-04 / D-05 — Versões históricas e nova versão são aceitas onde necessário; runtime web/Edge concorda; testes negativos de contrato, tenant e snapshot continuam passando. QA proporcional, release seletivo e smoke seguro precedem a declaração de produção.

## Mapa de impacto inicial

Baseline: `main` em `75b3dc52fbb11d5ae2e1e1308ad6e29eadf74896`; Posição backend v3, Perfis v5/v1; snapshots semânticos de 25/09 B/47 para ambos e snapshots pré-IA de 28/09 A/40 e B/20. Quatro itens não rastreados do usuário preservados.

| Área | Relação | Capacidade a preservar e prova |
| --- | --- | --- |
| Matching determinístico e score | direct | Grupos, evidência, tempo e pesos; casos contrastados e negativos |
| Busca, comparação e detalhe | direct | Aviso fiel à origem/versão; resposta válida e falha |
| Runtime gerado Edge e snapshots M6.2 | critical_transversal | Mesma regra, versão aceita, histórico, autorização e tenant |
| Outras profissões e Knowledge publicada | plausible_indirect | Sem equivalência por setor, título ou ferramenta; corpus sintético |
| Perfis, Parser, requisitos e curadoria | no_impact_identified | Nenhuma escrita ou alteração de fonte; revisão do diff |
