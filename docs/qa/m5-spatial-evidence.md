# Evidência QA do M5: currículo e evidência espacial

## Escopo

- Data: 2026-08-27.
- Branch: `codex/m5-cv-evidence`.
- Backend remoto: Prisma-QA (`ioldpnqqvobprjiontre`), único projeto Supabase atual.
- Frontend: local, sem hosting.
- Dados: somente registros sintéticos de QA.

## Evidência funcional e técnica

| Fluxo | Evidência observada | Resultado |
| --- | --- | --- |
| Split permanente | PDF à esquerda e revisão estruturada à direita, com rolagens independentes | build/contrato aprovados; inspeção autenticada pendente |
| Navegação | campo, evidência, página e histórico navegam sem ocultar a fonte | build/contrato aprovados; inspeção autenticada pendente |
| Seleção espacial | retângulos normalizados suportam arrasto em ambas as direções, clamp e zoom | aprovado por teste |
| Texto e OCR | camada PDF.js é prioritária; Tesseract processa somente a região sem texto | aprovado por contrato e build |
| Contenção textual estrita | seleção nativa inclui somente caracteres cujo centro visual está dentro do retângulo; linhas que apenas encostam ficam fora | regressão local aprovada em 2026-08-28 |
| Aplicação da seleção | texto reconhecido, interpretação revisada ou conteúdo manual seguem para a RPC sem texto livre; ação e mudança recebem descrição automática | regressão local aprovada em 2026-09-02 |
| Erro no modal | validação e falha de persistência aparecem dentro do modal, sem alerta oculto atrás da sobreposição | contrato estático e build aprovados; smoke autenticado pendente |
| Compatibilidade | 18 evidências originais foram vinculadas sem fabricar coordenadas | aprovado em QA |
| Transação positiva | Admin registrou evidência complementar, criou revisão/região/vínculo e a transação foi revertida | aprovado em QA |
| Replay idempotente | a mesma correção concluída devolveu região/vínculo anteriores com `reused = true`, mesmo após o valor se tornar atual | aprovado em QA |
| Coordenadas inválidas | largura fora de 0 a 1 retornou `normalized evidence coordinates are invalid` | aprovado, fail-closed |
| Papel insuficiente | sessão `member` recebeu `organization scope is not authorized` | aprovado, fail-closed |
| Tenant e versão | FKs compostas e validação interna exigem organização, documento e versão coincidentes | aprovado por migration/teste |
| Imutabilidade | eventos não aceitam update/delete e substituição preserva o vínculo anterior | aprovado por migration/teste |
| Refinamento subtrativo | caracteres ou símbolos dentro de áreas humanas já mapeadas são descontados, com reinclusão explícita e texto bruto preservado | regressão local e contrato remoto aprovados em 2026-08-29; smoke visual pendente |
| Destaques contextuais | a página mostra somente evidências da aba e, em Experiência/Formação, do registro atualmente aberto | regressão determinística aprovada em 2026-08-29; smoke autenticado pendente |

As três migrations originais M5 e a migration compatível de precisão textual estão ativas no Prisma-QA. As três tabelas possuem RLS, `authenticated` tem somente `SELECT` direto e a mutação ocorre exclusivamente pela RPC controlada. A auditoria pós-migração encontrou zero coordenadas inválidas, zero vínculos com duas fontes e 18 vínculos originais compatíveis.

O advisor de performance não aponta foreign key M5 sem índice após a migração complementar. Índices recém-criados aparecem como não utilizados porque ainda não existem eventos espaciais persistidos. O advisor de segurança aponta `record_profile_review_evidence` como RPC `security definer`; a exceção é intencional e documentada no ADR-016.

## Limites

- A prova conectada de mutação foi executada dentro de transação revertida e não deixou evidência sintética persistida.
- A sessão do navegador interno não estava autenticada e não havia Chrome conectado nem credencial de QA no ambiente. A inspeção visual autenticada desktop/mobile permanece pendente e não é apresentada como aprovada.
- Não houve uso de currículo real, LLM externo ou embeddings.
- O frontend continua local. Não existe ambiente de produção separado e nenhuma ação de produção foi realizada.

## Correção de precisão em 2026-08-28

O método `pdfjs-text-layer-v1` incluía o conteúdo integral de qualquer `span` que intersectasse a seleção. Como o PDF.js pode representar uma linha completa em um único `span`, uma área curta recuperava caracteres visualmente externos. O runtime local foi corrigido para `pdfjs-character-region-v2`, com teste de caractere parcialmente intersectado e linha adjacente. Evidências históricas continuam identificadas como `1.0.0`/`pdfjs-text-layer-v1`; novas evidências usam contrato `1.1.0`.

A migration local `20260828160707_strict_pdf_character_region.sql` foi aplicada no Prisma-QA como `20260828161125_strict_pdf_character_region`. O banco preserva `1.0.0`, usa default `1.1.0`, aceita o novo método na constraint e na validação privada da RPC, e mantém RLS. Uma chamada conectada `add_complementary` com `pdfjs-character-region-v2` retornou região, vínculo e lock 9 dentro de transação revertida. Depois do rollback, o review permaneceu no lock 8 e as contagens do método e da chave de teste permaneceram zero.

## Correção de aplicação em 2026-08-28

O botão `Aplicar seleção` podia interromper o fluxo antes da RPC por uma validação de justificativa e exibia a mensagem no alerta global atrás do modal. O modal agora possui estado de erro próprio, limpa mensagens anteriores ao iniciar uma seleção, indica processamento e não exige justificativa quando o valor predefinido pelo texto reconhecido não foi editado. A justificativa permanece obrigatória quando há mudança semântica ou quando não existe texto reconhecido. A cobertura determinística confirma os quatro casos e a página mantém a falha de rede visível sem fechar a seleção.

## Refinamento subtrativo em 2026-08-29

A migration local `20260829111414_spatial_evidence_refinement.sql` introduz `spatial-evidence` 1.2.0 sem reclassificar regiões históricas. `raw_selected_text` preserva o retângulo completo, `selected_text` mantém somente o texto efetivo e `profile_review_evidence_refinements` registra decisões `excluded` ou `included` sem duplicar o conteúdo. A RPC refinada rejeita vínculo fora do tenant, revisão, documento, versão, página, registro semântico ou interseção geométrica. A tabela possui RLS, leitura tenant-scoped, DML direto revogado e trigger de imutabilidade. A primeira prova conectada encontrou ambiguidade entre o parâmetro de retorno `region_id` e a coluna homônima no alvo do `ON CONFLICT`; a transação foi revertida e a migration complementar `20260829113452_spatial_evidence_refinement_rpc_fix.sql` corrige exatamente essa cláusula, falhando se o corpo remoto não tiver o formato esperado.

O runtime local filtra caracteres posicionados do PDF.js e símbolos com bounding boxes do Tesseract. Regiões humanas ficam selecionadas para desconto por padrão; regiões automáticas são apresentadas sem exclusão automática. O revisor pode alternar cada decisão e restaurar o texto refinado após uma edição manual. Os testes determinísticos cobrem contenção original, subtração, isolamento entre registros, contrato SQL e presença do fluxo na interface.

A seleção pendente agora mantém um conjunto explícito de caracteres: esse conjunto gera o texto, o refinamento e os destaques individuais mostrados sobre o PDF, enquanto a região final se ajusta ao contorno das caixas resolvidas. Na direita, a tolerância subpixel pode recuperar somente o primeiro caractere contíguo; o seguinte e as linhas fora da altura continuam descartados. Quando a fonte de fallback torna um `span` invisível mais largo do que seu intervalo visual no PDF, as caixas dos caracteres são proporcionalmente encaixadas até o início do próximo item da linha. A faixa de status já ocupa sua altura antes do pressionamento, portanto a página não muda de posição durante o arraste. As regressões determinísticas cobrem o sufixo `TI`, deslocamento realista de 0,6 pixel, exclusão do caractere seguinte, contorno final, encaixe no próximo item, subtração e presença do destaque por caractere na interface. Em smoke autenticado no currículo real de Bruno Harita, uma seleção encerrada 0,4 pixel antes da caixa ajustada do `I` retornou exatamente `Pós-graduação em Gestão de Processos de TI`, destacou o `I` e não incluiu `| Universidade Anhanguera`; a operação foi cancelada sem persistência.

As migrations foram aplicadas no Prisma-QA como `20260829113031_spatial_evidence_refinement` e `20260829113502_spatial_evidence_refinement_rpc_fix`. A tabela remota possui RLS, policy tenant-scoped, trigger imutável, `authenticated` com `SELECT` e sem `INSERT`, `anon` sem leitura e sem execução da RPC. Uma transação revertida rejeitou região sem sobreposição, rejeitou candidato de outro registro, persistiu temporariamente `raw_selected_text`, `selected_text`, contrato 1.2.0 e decisão `excluded`, e terminou com zero regiões e refinamentos residuais. Outra sessão autenticada sem membership foi negada sem mutação. O advisor registra a nova RPC `security definer` como alerta intencional e os índices recém-criados como ainda não utilizados; não foi observado novo problema de RLS ou foreign key.

## Filtro contextual de destaques em 2026-08-29

O visualizador agora deriva um escopo semântico do campo selecionado antes de renderizar regiões persistidas. Para `experiences.<índice>.*` e `education.<índice>.*`, somente vínculos do mesmo índice permanecem visíveis; Resumo, Competências e Idiomas são isolados por aba; Certificações, áreas personalizadas e pendências permanecem juntas porque são renderizadas simultaneamente em Outros. Caminhos desconhecidos falham de forma restritiva e somente coincidem por igualdade exata. O filtro não escreve no banco, não altera a navegação por evidência e mantém o contrato `spatial-evidence` 1.2.0. As regressões cobrem troca de campo no mesmo registro, troca de registro, troca de aba, agrupamento de Outros e caminho desconhecido.

## Mapa canônico e invariância de zoom em 2026-08-30

O currículo real revelou que `pdfjs-dist` 5.4.296 exige `--total-scale-factor` no ancestral do `TextLayer`. Sem a variável, o canvas permanecia correto, mas a camada invisível herdava fonte de 14 px: no ajuste à largura, uma linha visual de aproximadamente 289 px recebia caixa textual próxima de 894 px. O corte recorrente na direita era consequência dessa divergência, não de OCR ou ausência de texto no PDF.

O runtime agora define a escala total do viewport e converte imediatamente caracteres PDF.js e símbolos OCR para `normalized-page-v1`. Seleção, texto, refinamento e destaque usam essas mesmas unidades canônicas. A compensação de um caractere por tolerância de pixel foi removida; conteúdo fora da borda direita não entra.

As regressões determinísticas comprovam a mesma sequência em 57%, 100% e 147% e rejeitam o primeiro caractere cuja caixa começa fora do limite. No smoke autenticado local, a página 2 do currículo de Bruno Harita foi aberta pela sessão `harita.super`; a mesma região da descrição da Bencato recuperou 1.063 unidades e 1.076 caracteres normalizados em 57% e 147%. Foram confirmados `fornecedores e liderança`, `e retrabalhos`, `impacto`, `disciplina` e `dos novos fluxos`. A página variou de 346,13 px para 896,92 px, enquanto o conjunto e o texto permaneceram iguais. O teste foi somente leitura e não criou região, revisão ou evento.

## Paridade visual dos campos comparados em 2026-08-30

Campos multilinha extraídos e revisados agora mantêm a mesma altura externa. O editor humano preenche integralmente o espaço restante abaixo do rótulo, preserva overflow vertical para conteúdo excedente e bloqueia redimensionamento manual isolado. No smoke autenticado, as duas superfícies de `Descrição / Principais atividades` mediram `141,59 px`; o editor ocupou `102 px` dos `103 px` internos disponíveis, diferença exclusiva da borda, com `overflow-y: auto` e `resize: none`. A validação foi somente leitura e não alterou o rascunho.

## Bloqueio explicativo e retomada da intenção em 2026-08-30

Enquanto o rascunho possui edição manual local, operações espaciais mantêm a precondição de salvamento, mas os controles exibem cadeado, texto acessível e tooltip em vez de ficarem silenciosamente inertes. O alerta contextual oferece salvar ou descartar, altera a mensagem após o operador escolher adicionar evidência ou criar área e preserva essa intenção até a resolução. `Salvar rascunho e continuar` mantém a justificativa obrigatória e leva foco ao campo quando ausente; após sucesso, retoma a operação. `Descartar e continuar` exige confirmação explícita e também retoma a intenção.

No smoke autenticado, o cargo recebeu o sufixo temporário `[SMOKE UX]`, `Adicionar evidência` registrou a intenção, o salvamento sem justificativa exibiu o erro e focou `Justificativa da correção`, e o descarte confirmado restaurou o cargo original e abriu a seleção para `experiences.0.role`. A seleção foi cancelada; o status final foi `Rascunho sincronizado`, sem resíduo visual ou persistido.

## Destaque de descrições históricas com marcadores em 2026-08-31

No currículo aprovado de Bruno Harita, Empresa, Cargo e Período eram localizados pelo fallback textual, mas a Descrição não era destacada. A evidência histórica possui página de origem e não possui região espacial persistida. A descrição estruturada removeu os marcadores `•`, enquanto a camada textual do PDF os manteve entre os parágrafos, impedindo a correspondência exata do conteúdo completo.

O localizador visual agora normaliza marcadores decorativos como separadores, preservando letras, números e pontuação semântica. O destaque só é produzido quando o texto normalizado possui uma única ocorrência; duplicidade continua falhando fechada. A regressão determinística cobre uma descrição multilinha sem marcadores contra três linhas posicionadas com marcadores no PDF, confirma o contorno conjunto e rejeita a mesma fonte duplicada. A mudança é somente leitura e não cria nem altera região, vínculo, revisão ou perfil.

## Auditoria factual automática em 2026-09-02

A exigência histórica de justificativa descrita nas correções de 2026-08-28 e 2026-08-30 foi substituída pelo contrato `human-profile-review` 7.1.0. A revisão comum e o modal espacial não exibem mais textarea de justificativa. `save_profile_review` e o núcleo privado de evidência aceitam `p_reason` vazio e geram descrição operacional determinística, enquanto ator, instante, revisão, campo, valor anterior, valor novo e evidência continuam preservados. A remoção explícita de fato já aprovado no Delta conserva o motivo humano obrigatório com mínimo de cinco caracteres.

A migration `20260902181013_automatic_review_audit_reason` foi aplicada diretamente ao Prisma-QA e registrada no histórico remoto. Consultas pós-aplicação comprovaram a ausência das duas precondições antigas, presença de `resolved_reason`, execução pública negada a `anon`, execução da fronteira de salvamento concedida a `authenticated` e núcleo privado sem execução por `authenticated`. A prova `supabase/qa/automatic_review_audit_reason_verification.sql` salvou uma revisão com `p_reason = null`, confirmou lock e descrição automática e executou rollback; o lock permaneceu 9, com zero revisão ou operação de teste residual. No smoke visual autenticado, não havia campo `Justificativa da correção` nem `Justificativa da operação de evidência`; uma edição local habilitou `Salvar revisão` e mostrou o alerta de alteração não salva sem criar uma nova exigência. O valor original foi restaurado, retornando a `Rascunho sincronizado`, sem persistência, publicação ou resíduo de teste.
