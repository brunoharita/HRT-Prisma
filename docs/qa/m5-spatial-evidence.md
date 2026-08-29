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
| Aplicação da seleção | texto reconhecido e não editado segue direto para a RPC; interpretação ou conteúdo manual exige justificativa | regressão local aprovada em 2026-08-28 |
| Erro no modal | validação e falha de persistência aparecem dentro do modal, sem alerta oculto atrás da sobreposição | contrato estático e build aprovados; smoke autenticado pendente |
| Compatibilidade | 18 evidências originais foram vinculadas sem fabricar coordenadas | aprovado em QA |
| Transação positiva | Admin registrou evidência complementar, criou revisão/região/vínculo e a transação foi revertida | aprovado em QA |
| Replay idempotente | a mesma correção concluída devolveu região/vínculo anteriores com `reused = true`, mesmo após o valor se tornar atual | aprovado em QA |
| Coordenadas inválidas | largura fora de 0 a 1 retornou `normalized evidence coordinates are invalid` | aprovado, fail-closed |
| Papel insuficiente | sessão `member` recebeu `organization scope is not authorized` | aprovado, fail-closed |
| Tenant e versão | FKs compostas e validação interna exigem organização, documento e versão coincidentes | aprovado por migration/teste |
| Imutabilidade | eventos não aceitam update/delete e substituição preserva o vínculo anterior | aprovado por migration/teste |
| Refinamento subtrativo | caracteres ou símbolos dentro de áreas humanas já mapeadas são descontados, com reinclusão explícita e texto bruto preservado | regressão local e contrato remoto aprovados em 2026-08-29; smoke visual pendente |

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
