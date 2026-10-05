# Acordo — Síntese do Perfil v2.0.5

Versão 1.0.0, agreed, 2026-10-04. Autoridade: Bruno aprovou perguntas aprofundadas, constância, telas 1 + 3, geração persistida assíncrona e autorizou implementar/publicar v2.0.5. Baseline main/origin/VPS `6c5bf38051e29afe4e3fec209a0077d4274e81d8`. Risco E: novo resultado derivado, worker e limite de confiança; D: dados/tenant/auth/IA. Este acordo incorpora o prompt de execução integral.

## DEVE — Inegociável

- D-01: oito eixos fixos, nessa ordem: trajetória; atividades/contribuição; contextos/responsabilidade/autonomia; competências em contexto; resultados; formação/aplicação; direção profissional; investigação complementar. Perguntas aprofundadas e títulos ficam no contrato, não sob autoridade do modelo. Resposta por eixo distingue registrado, interpretação e lacunas. Síntese até 120 palavras, respostas proporcionais até 120 palavras/eixo, até três perguntas complementares. Informação prevalece sobre questionário, sem preencher lacunas artificialmente.
- D-02: contrato `profile-synthesis-1.0.0`, schema estrito, fontes por afirmação, versões de prompt/modelo/base/hash. Validar oito eixos, refs, limites, rejeição/incompleto, informação mínima e textos não confiáveis. Sem conteúdo suficiente: mensagem determinística e zero IA. Não apresentar afirmação de verificação sem fonte verificada.
- D-03: fonte é Perfil publicado e evidências autorizadas, excluindo identidade/contato desnecessários. Resumo extraído/humano permanece separado e intacto. Snapshot/base versionado; mudanças profissionais/evidências relevantes invalidam base, visita/rascunho/aba não. Histórico preserva análise própria. Fontes são resolvidas pelo servidor e carregadas sob demanda.
- D-04: PostgreSQL/Supabase: resultados, jobs e tentativas separados, JSONB compacto, índices, organização em TS/SQL e RLS/RPC/grants. Chave idempotente por tenant/Pessoa/Perfil/base/contrato/prompt/modelo. Geração após publicação, assíncrona, sem bloquear publicação humana; Perfis antigos somente na primeira consulta. Evento/fila/reconciliação durável; nenhuma chamada IA em transação SQL. Fonte nova relevante provoca nova revisão da síntese sem reescrever anterior.
- D-05: worker independente na VPS existente, sem PC/túnel, fila reutiliza lease/skip locked, concorrência inicialmente limitada, retries limitados/espaçados, métricas de duração/tokens/modelo/falha sem PII integral. Credencial de worker server-only com autoridade restrita a RPCs de processamento; não distribuir service role. Modelo aprovado já usado no Parser é candidato de reaproveitamento, ativação condicionada a benchmark sintético de qualidade/custo. Nenhum novo fornecedor/GPU/broker/limite financeiro paralelo.
- D-UX-01: referência 1 normativa para entrada: cabeçalho/abas existentes; principal ~70% com narrativa, três contextos compactos e sustentação; lateral ~30% com proveniência e pontos a esclarecer. Ações/fontes no local da referência. Referência 3 normativa para fonte aberta: principal texto/afirmações ~60%, fonte selecionada ~40%, destaque correspondente e acesso ao documento. Navegação global/logos inventados pelo gerador são ilustrativos, preservar shell real do Prisma. Dados Marina Costa são sintéticos. Mobile empilha conteúdo/fonte, sem overflow; perguntas completas em disclosure. Resumo original acessível separado. Estados preparando/sem informação/falha/base anterior identificados, sem confirmação humana redundante.
- D-06: contratos owner/ADR/Context Pack/AoT, release seletivo com v2.0.5 em main/origin/VPS. Testes dirigidos, SQL QA descartável, negativos auth/tenant/lease/replay/exclusão, fixtures ricos/pobres/injeção, benchmark sem Pessoa real e comparação visual 1416/390 mesmos dados/estados. Smoke/runtime/rollback. Não confundir sintético com jornada autenticada real.

## PROIBIDO

- P-01: inventar fatos, números, datas, personalidade, proficiência, senioridade, contratação/ranking/confiança; ocupação típica não vira evidência pessoal. Não substituir fontes por inferência.
- P-02: IA alterar fatos/Knowledge, publicar Pessoa ou decidir confirmação humana. Não publicar Perfil real para testar; não incluir PII integral/secrets em logs/cache público; não atravessar tenant.
- P-03: gerar em cada abertura, repetir chamadas ilimitadamente, reprocessar histórico/massa por troca de prompt/modelo, bloquear operador por falha opcional da análise ou mudar Parser/matching.

## FORA DE ESCOPO

- F-01: parser/importação, matching, Knowledge/assessment como domínio, novos dados de entrevista, backfill em massa, novos fornecedores e alterações de fatos históricos. Síntese usa somente fontes realmente existentes.

## AUTONOMIA DE ENGENHARIA

- A-01: reutilizar cliente/provider/fila/validadores, nomes de arquivos/RPCs, tokens acessíveis, índices e credencial limitada; ajustar limites operacionais via benchmark sem alterar perguntas/produto. Segurança/retentativa/exclusão e versionamento fazem parte do escopo.

## PENDÊNCIAS

- Q-01: nenhuma decisão de produto pendente. Capacidade/latência/custo devem ser medidos; não prometer cobrança externa exatamente uma vez. Registra-se um resultado aceito por chave, tentativas externas são auditadas.

## CRITÉRIOS DE ACEITE / Mapa de Impacto

| IDs / capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| D-01/02, perguntas/IA | direct | baseline sem síntese gerada; schema/8 IDs/negativos/fixtures/benchmark real sintético |
| D-03/04, dados/versões | direct | Perfil canônico publicado e evidências existentes; imutabilidade, hash, leitura histórico, fontes tardias/exclusão |
| D-04/05, auth/tenant/job | critical_transversal | base sem worker de síntese; SQL local roles/auth/tenant/token/lease/duplicidade/retry/concurrency |
| D-UX-01, Resumo/fontes | direct | referências PNG 1/3; render mesmas fixtures 1416/390, preservar cabeçalho/abas/competências/evidências |
| Parser/publicação/matching | plausible_indirect | publicação independente da análise; person-flow e checker de módulos matching, imagens runtime preservadas |
| D-06, release/docs | direct | v2.0.4 e SHA 6c5bf38; tipos/build/contextos/CI/plan/migrations/web/worker/smoke/rollback |

## Prompt de execução congelado

Implementar integralmente D-01 a D-06 e D-UX-01, sob P-01 a P-03 e F-01, com A-01. Critérios da tabela são mínimos. Referências `docs/qa/references/profile-synthesis-01.png` e `profile-synthesis-03.png`, geradas nesta conversa e escolhidas pelo PO, são normativas para composição de conteúdo conforme D-UX-01. AoT tem PASS somente com evidência; limitações reais permanecem explícitas.
