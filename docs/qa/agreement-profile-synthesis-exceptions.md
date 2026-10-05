# Acordo e execução — Exceções da síntese v2.0.5

Versão 1.0.0, agreed, 2026-10-04. Autoridade: pedido explícito de Bruno para identificar, declarar, tratar e explicar exceções sem impedir o carregamento do Perfil. Complemento corretivo do acordo `agreement-profile-synthesis-v205.md` v1.0.0, integralmente preservado. Baseline main/origin/VPS `080249e7c26b2b32b582a260a8cd8ccd2e56ed9f`; worker saudável, único job observado failed/RESPONSE_INVALID, tentativa1, sem motivo detalhado armazenado. Risco D/C; mesma versão de produto 2.0.5, contrato de resultado/prompt/modelo preservados.

- D-E01: falha de consulta, fonte ou renderização da síntese é isolada; cabeçalho, abas, fatos publicados e navegação continuam acessíveis. Resumo original aparece como informação publicada, nunca como análise substituta de IA.
- D-E02: identificar entrada, provedor, leitura JSON, validação do contrato e gravação com motivos fixos e localização limitada, referência do job/tentativa e métricas disponíveis inclusive em respostas rejeitadas. Persistir diagnóstico limitado sem texto pessoal, corpo do provedor, prompt ou segredo. Falha anterior sem detalhe permanece explicitamente sem causa fina conhecida.
- D-E03: explicar em português a falha e a ação adequada; separar indisponibilidade, resposta interrompida, limite, referência inconsistente e erro interno. Atualizar consulta não chama IA; nova tentativa é explícita, idempotente, espaçada, autorizada por tenant e limitada às três tentativas já aprovadas. Configuração/entrada excessiva não oferecem retry inútil. Histórico preservado.
- D-E04: validação negativa local/SQL, injeção de exceções na interface desktop/mobile, documentação, Context Pack, publicação seletiva e smoke. Recuperação do job afetado pode gerar somente análise derivada, nunca alterar/publicar fatos humanos.
- D-UX-E01: imagem do incidente é contraexemplo da mensagem genérica; preservar cabeçalho/abas e arquitetura narrativa70/30 e fonte60/40 do acordo original. Diagnóstico fica no bloco de síntese; detalhes de atendimento em disclosure. Mobile empilha sem overflow.
- P-E01: não relaxar evidência/limites, inventar causa anterior, expor conteúdo/segredos, atravessar tenant, zerar tentativas ou gerar IA a cada abertura.
- F-E01: Parser, matching, curadoria, publicação humana, fornecedores/modelos/perguntas novos, backfill, plataforma genérica de observabilidade.
- A-E01: reutilizar React/Ant Design/Supabase, fila e tabelas existentes; nomes técnicos, motivos fixos, proteção local e testes são escolhas de engenharia.
- Q-E01: nenhuma decisão material pendente; causa detalhada da tentativa anterior não foi armazenada e não pode ser inventada.

## Mapa de impacto / critérios de aceite

| Capacidade/IDs | Relação | Baseline e regressão mínima |
| --- | --- | --- |
| D-E01/E03/UX-E01, tela/fontes | direct | web ed4e328, seis estados sintéticos anteriores; erros async/render/fonte e anterior, 1416/390, resumo original/navegação/sem overflow |
| D-E02/E03, worker/contrato | direct | worker497b2ee, RESPONSE_INVALID sem detalhe; erro JSON/incompleto/refusal/schema/fontes/limites, métricas sem texto, 109 fontes longas |
| D-E02/E03, RPC/auth/tenant/fila | critical_transversal | PostgreSQL17 + migração anterior; SQL QA rollback, segredo/leitura intertenant/lease/replay/retry concorrente/orçamento/diagnóstico rejeitado |
| Perfil canônico/publicação | plausible_indirect | person-flow anterior256PASS; regressão dirigida e proteção de síntese, nenhum write canônico |
| Parser/gateway/matching | no_impact_identified | não compartilham worker/RPC/UI derivada; check matching e preservação de imagens operacionais |
| D-E04, release | direct | main080249e, serviços saudáveis; tipos/build/CI/contextos, migração incremental, worker/web e smoke/rollback |

## Prompt congelado

Implementar D-E01..04 e D-UX-E01 sob P-E01/F-E01/A-E01, preservando integralmente o acordo v2.0.5. Cada linha exige implementação, teste/evidência e AoT. Não atribuir ao incidente uma subcausa que o diagnóstico antigo não registrou. Não ampliar validação para a suíte integral local por padrão.
