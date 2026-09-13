# Formação, datas e duração: acordo, execução e evidência

Versão: 1.0.0. Autoridade: decisões de Bruno nesta conversa, autorizadas com “pode fazer” em 2026-09-12. Complemento do M5.7, sem movimento administrativo separado.

## Acordo aprovado

- D-01: formação declarada com curso identificado assume `completed` quando não houver indicação contrária. Conclusão assumida é inferência; status explícito prevalece. “Trancado”, “interrompido”, “abandonado”, “não concluído”, “cursando” e “conclusão prevista” são exceções reconhecidas em PT/EN.
- D-02: datas do currículo usam `DD/MM/YYYY`; períodos usam `DD/MM/YYYY - DD/MM/YYYY`. Data única e início recebem dia 01 e mês janeiro quando esses componentes estiverem ausentes. Fim recebe último dia do mês e dezembro quando o mês estiver ausente. Preservar componentes explícitos e respeitar anos bissextos.
- D-03: `Atual` permanece aberto. Duração é data final menos inicial, substituindo somente no cálculo a data final aberta pela data civil do dia da consulta. Nunca congelar a data de importação.
- D-04: preservar fatos, texto original, evidências, snapshots acadêmicos e decisões humanas. Aplicar nas novas extrações e nos rascunhos salvos; leitura não reescreve perfis aprovados.
- P-01: não inventar ano ausente, aceitar datas impossíveis, transformar intervalo invertido em duração válida, converter ausência de data final em `Atual` ou alegar conclusão explícita quando apenas assumida.
- P-02: não alterar tenants, Auth/RLS, publicação humana, timestamps técnicos, contratos SQL ou registros históricos em massa.
- F-01: novas chamadas OpenAI, nova importação/publicação de pessoas reais, migração/backfill e servidor online não pertencem à entrega.
- A-01: reutilizar contratos JSON, normalizador de revisão e classificador existentes; escolher helpers e testes locais sem dependência nova.
- Q: nenhuma decisão de produto pendente.
- CA-01: testes de classificação cobrem padrão, exceções, origem e snapshot.
- CA-02: testes de datas cobrem exemplos aprovados, precisão, bissextos, erro, repetição e preservação de origem.
- CA-03: testes com relógio injetado comprovam diferença em dias e avanço de `Atual`; busca filtra pela duração calculada, sem arredondar antes da comparação.
- CA-04: integração sintética atravessa extração, normalização para salvamento, serialização/recarga e cálculo; teste do serviço verifica payload RPC e vínculos preservados.

## Execução

Executar integralmente o acordo 1.0.0 acima. Reutilizar `educationClassification`, `normalizeReviewDraft`, `structureParserIa`, `buildAdaptiveExtraction` e `profileDiscovery`. O método `resume-dates-1.0.0` representa datas civis sem depender de parsing regional de `Date`. Componentes inferidos ficam no resultado do helper; o contrato persistido existente guarda a explicação da inferência, origem textual e valor padronizado em `uncertainties`, enquanto fatos e coordenadas continuam originais. `extraction-draft` 8.2.0 identifica a nova semântica; não adicionar chaves rejeitadas pelo SQL vigente.

Preservar a confirmação humana de classificações inferidas. A mudança não autoriza marcar `classificationReviewed` como verdadeiro em nome do usuário. Datas sem ano, textos não reconhecidos e intervalos inválidos permanecem disponíveis como texto para correção e não contribuem para duração. Uma data única não equivale a um período. Para o filtro em anos, somar durações em dias e dividir por 365,2425; arredondar somente na apresentação. A soma de experiências simultâneas mantém a semântica existente, sem introduzir deduplicação de tempo nesta entrega.

## AoT

| Acordo | Implementação | Prova | Estado |
| --- | --- | --- | --- |
| D-01 / CA-01 | classificador 1.1.0 e explicação na revisão | `educationClassification.test.ts`, `resumeDates.test.ts` | PASS local |
| D-02 / CA-02 | helper compartilhado, extração IA/nativa, revisão e payload RPC | `resumeDates.test.ts` | PASS local |
| D-03 / CA-03 | subtração de dias civis e busca 1.1.0 | `resumeDates.test.ts`, `profileProfessionalStandard.test.ts` | PASS local |
| D-04 / CA-04 | evidências originais, notas persistidas e snapshots | integração sintética, payload RPC do serviço de recuperação e replay offline do PDF autorizado | PASS local |
| P-01 | datas inválidas/ausentes retornam indisponível; status inferido separado | negativos em `resumeDates.test.ts` | PASS local |
| P-02 | nenhum schema, grant, tenant ou histórico alterado | revisão do diff, negativos de vínculo/hash do serviço e testes de regressão | PASS local |

Validação: gate `pnpm run validate` aprovado, com 401 testes técnicos, 19 golden, lint, foundation, tipos, build web, Context Pack e demo. Após o ajuste final da precedência de status explícito sobre período inferido, compilação e 34 regressões de datas/classificação/evidências passaram. O serviço de recuperação verifica datas normalizadas, conclusão inferida, versão 8.2.0, referências e payload de persistência usando PDF sintético e transporte simulado. A revisão do diff preservou os limites de tenant, Auth/RLS e publicação.

Replay offline do PDF autorizado de João, usando somente cache bruto existente: quatro páginas, nove experiências, duas formações, 11 períodos normalizados, nove durações calculáveis, duas conclusões acadêmicas inferidas, contrato de revisão válido e serialização/recarga estável. Zero chamadas de rede e zero escritas remotas. Scripts/logs privados permanecem em `tmp/` ignorado, sem PDF, contato ou chave no Git. Essas provas não representam nova importação/publicação autenticada nem reescrita do Perfil aprovado.

Desvios do acordo: nenhum. Histórico publicado preservado; novos rascunhos usam as regras. Os testes antigos que exigiam situação desconhecida ou períodos brutos foram atualizados apenas para a decisão aprovada. A prova de seção adicional passou a verificar seu próprio caminho, preservando a evidência acadêmica original em seu campo correspondente.
