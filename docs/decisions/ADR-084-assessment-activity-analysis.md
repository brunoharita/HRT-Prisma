# ADR-084 — Análise fundamentada da atividade de uma avaliação

Status: implementação local autorizada em13/10/2026; tarifa inicial6.193 Tokens Prisma aprovada por Bruno em13/10/2026, D-10 do acordo assessment-activity-v252 v1.1.0. Publicada em produção2.5.2, evidência no AoT assessment-activity-v252.

## Decisão

Reutilizar a Edge Function position-assessment, OpenAI Responses/modelo já adotados, histórico genérico de IA e ledger Tokens Prisma. Um domínio puro calcula fatos e candidatos a padrões da tentativa inteira, a partir dos eventos oficiais associados à questão/versão. A IA seleciona e ordena padrões/contextos disponíveis em saída estruturada; textos e números vêm do domínio, sem narrativa livre que possa inventar destinos, fraude, intenção ou traços pessoais. Referências de questões/eventos acompanham os padrões, e limitações neutras são obrigatórias.

Esta forma atende à análise geral com priorização da IA, preservando afirmações verificáveis. Apenas traduzir JSON com texto livre aumentaria o risco de conclusões não sustentadas. Gerar tudo deterministicamente e rotular como IA seria incorreto: há chamada explícita ao modelo para organização dos padrões, registrada separadamente.

Provider recebe contagens, durações, números ordinais das questões e descrições neutras; não recebe nomes, contatos, enunciados, respostas, UUIDs pessoais, texto de payload ou horários individuais. Sem ferramentas/web e store:false. Custo técnico observado/estimado permanece separado do crédito comercial; teste não depende de modelo vivo.

## Consistência e autoridade

Snapshots privados são vinculados a organização/tentativa/fingerprint/método e autorizados pelo papel operacional existente. Dados originais não são alterados. Tabela privada com RLS e nenhum DML direto; consultas/início autenticados e conclusão exclusiva do service_role/JWT assinado. Composição não cria julgamento humano, Score ou etapa.

Locks da tentativa e do ledger, índice parcial e operação idempotente impedem aquisição/débito duplicado. Reserva antes do provider; relatório, histórico e liquidação na mesma conclusão transacional. Resultado salvo é gratuito. Perda de confirmação não declara falha contraditória nem repete provider. Após2min em execução sem confirmação, informar necessidade de conciliação; reserva só permite nova ação depois de liberação administrativa explícita. Uma análise anterior permanece legível após falha/desatualização.

Limites técnicos reaproveitam US$0,25/pedido e US$10/mês desta função, saída2000tokens e100solicitações/dia por empresa; custos desconhecidos usam teto conservador no orçamento, nunca zero fictício no histórico. A tarifa comercial aprovada da nova categoria é6.193 Tokens por resultado entregue, independente desses limites técnicos. Consulta salva gratuita e falha sem resultado sem débito.

## Evidência e limites

Fontes: src/domain/assessmentActivityAnalysis.ts, supabase/functions/position-assessment/activity-analysis.ts, migration20261013120000, acordo/docs/qa/agreement-assessment-activity-v252.md. Testes puros, Deno, SQL descartável/rollback e concorrência local, browser sintético. Publicação, jornada autenticada real e qualidade do modelo vivo não são inferidas desses testes. A síntese apoia revisão humana, não certifica justiça, autenticidade ou conformidade jurídica.
