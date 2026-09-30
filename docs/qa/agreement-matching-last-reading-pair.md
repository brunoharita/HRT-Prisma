# Acordo — último par de leituras da interpretação por IA v1.0.0

Decisão de Bruno em 2026-09-30: registrar somente o último par de uma checagem de Perfil para uma versão da Posição, para auditoria posterior. Este movimento estende o cache sem mudar a interpretação ou a interface.

## DEVE

- D-01 — Após cada tentativa concluída, conservar no registro tenant-scoped da análise o último par ordenado de leituras. Uma tentativa posterior da mesma chave substitui o par, sem histórico adicional de pares.
- D-02 — Para leitura validada, conservar apenas classificação por trecho e referência de evidência, modelo resolvido e índice da leitura; para leitura inválida, apenas etapa e motivo tipificados. Conservar versões, tentativa e horário já presentes no registro da análise.
- D-03 — A gravação acompanha a conclusão autorizada da análise na mesma transação; falha de gravação não pode confirmar leitura sem seu par. A classificação consensual, fallback pré-IA, triagem, score e decisões humanas não mudam.

## PROIBIDO

- P-01 — Não guardar resposta bruta, prompt, currículo integral, erro livre do provedor, segredo ou texto de evidência duplicado no novo campo.
- P-02 — Não expor o par em respostas ao navegador ou a papéis sem autoridade; não usar o par para mudar grupo, score ou resultado.
- P-03 — Não reinterpretar registros anteriores nem gerar chamadas de IA só para preencher auditoria.

## FORA DE ESCOPO

- F-01 — Tela de auditoria, política de retenção de histórico por tentativa, alteração de modelo/prompt/retry, reprocessamento de Perfis reais e mudança de regras de matching.

## AUTONOMIA

- A-01 — Formato compacto e caminho interno de gravação, reutilizando cache e autorização existentes.

## CRITÉRIOS DE ACEITE

- CA-01 — Par concordante e divergente, resposta inválida e modelo divergente são gravados sem texto bruto; o navegador só recebe o resultado anterior.
- CA-02 — Nova tentativa substitui o último par, tentativas/cache antigos seguem sem backfill; deleção de Perfil ou versão da Posição remove o par com o cache.
- CA-03 — Chamada sem lease, usuário sem acesso, par malformado e leitura não sustentada são recusados; RLS e privilégios continuam restritos.

## Mapa de impacto inicial

| Área | Relação | Baseline | Preservação/validação |
| --- | --- | --- | --- |
| Edge de duas leituras e conclusão | direct | `main` antes deste movimento, duas leituras sem par persistido | Testes Deno de acordo/divergência/falha e resposta pública |
| Cache PostgreSQL, RPC, grants e ciclo de vida | direct | M8.3/M8.6, RLS e lease; apenas leitura acordada persistida | SQL de forma, lease, tenant, substituição e cascade |
| Privacidade e autoridade | critical_transversal | Conteúdo profissional minimizado no cache, sem acesso direto de cliente | Testes negativos, revisão de campos e grants |
| Fallback, snapshot, Knowledge, score | plausible_indirect | Resultado pré-IA preservado em falha | Regressão focada do handler e snapshot |
| UI, prompt, modelo, dados de produção | no_impact_identified | Sem alteração pretendida | Inspeção do diff e plano de release |

Estado: aprovado para implementação por pedido explícito de Bruno; nenhuma nova decisão material pendente neste escopo.
