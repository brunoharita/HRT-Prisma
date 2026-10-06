# Acordo e execução — Resumo executivo enriquecido v2.0.12

Versão1.0.0, agreed/frozen, 2026-10-06. Autoridade: Bruno escolheu Painel executivo (opção1), aprovou áreas junto da posição mais recente e os quatro cards enriquecidos; autorizou implementar/main/produção2.0.12. Supersede o rascunho não executado2.0.11 e o número público pretendido. Baseline main/origin/VPS `b2f8bdb629fd04c68aa358fc5eea6f4f4ce16ba9`, web42308e72, produto2.0.10. Branch codex/profile-summary-cards-v2012, Classes C/B, sem decisão de taxonomia/IA/schema nova. Dados de Bruno/Beatriz lidos anteriormente não serão versionados como fixtures ou usados para mutação.

## DEVE

- D-UX-01: topologia Painel executivo: toolbar, quatro destaques em linha (área/posição/formação/empresas), síntese larga com acento azul, oito seções abertas em duas colunas. Uma coluna no celular, duas de cards em largura intermediária, altura livre. Ícones azuis suaves, rótulos discretos, informação forte e complementos legíveis. Shell/cabeçalho/abas existentes preservados. Referência normativa de topologia: imagem1 da proposta, textos/navegação global ilustrativos; enriquecimento autorizado por texto.
- D-DATA-01: área acompanha a posição mais recente, não o último item da lista geral. Reusar áreas declaradas somente com menção explícita em cargo/descrição da experiência. Sem associação suficiente, apresentar relato publicado da experiência e explicar que área/tempo ainda não foram determinados; áreas gerais continuam identificadas como gerais. Nenhuma equivalência/taxonomia/área principal inferida silenciosamente.
- D-TIME-01: duração aproximada da posição, período publicado e tempo documentado por área quando relação e precisão mensal suficientes. União de intervalos elimina sobreposições e não inclui lacunas. Datas inválidas, futuras ou sem meses suficientes não viram zero/duração inventada. “Atual” significa declaração publicada, não vínculo conferido hoje. Método local identificado, sem persistência paralela ou provider adicional.
- D-POS-01: priorizar registros em andamento; entre eles, início mais recente com empates preservados. Sem registros em andamento, fim mais recente. Períodos desconhecidos impedem declarar sequência segura. Complemento de outra experiência recente traz cargo/empresa/período/duração. Chamar anterior somente quando terminou antes do início da destacada; sobreposição ou simultaneidade usa Outra experiência recente/Outra posição em andamento. Informação secundária permanece visível.
- D-EDU-01: maior nível concluído, curso/instituição/período disponível, empates preservados. Andamento/legado/conclusão inferida não confirmada não vira concluído. MBA e especialização sem precedência arbitrária; qualificações desconhecidas não excluem cursos do mesmo nível. Empresas distintas com quantidade e nomes completos; clientes citados em descrições não contam como empregadores.
- D-KEEP-01: síntese/oito respostas/lacunas/perguntas integrais, fontes desligadas por padrão e sob demanda, cache/snapshot/foco preservados. Fallback mantém dados aprovados e cards durante falha/espera de IA. Falha de card não oculta demais cards/respostas; aviso de falha com recuperação real e português claro. Análise anterior identificada, cards explicitamente do Perfil vigente.
- D-REL-01: registry único2.0.12, salto11 declarado sem entrega fictícia; tipos/build/testes dirigidos/visual/contextos/CI/main/web seletiva/smoke/rollback/sincronização/AoT.

## PROIBIDO / FORA DE ESCOPO / AUTONOMIA / PENDÊNCIAS

- P-01: truncar respostas/listas, colocar conteúdo profissional atrás de expansão/fontes, confundir área com cargo/empresa/setor, inventar tempo/área/diploma/emprego atual/decisão humana, somar sobreposições, inferir ausência negativa, geração IA adicional, mistura de snapshots, scores/ranking/contratação.
- P-02: alterar Perfis/PII humanos, tenant/auth, matching/Score/Parser/prompt/modelo/contratos persistidos; registrar dados reais integrais em evidência pública.
- F-01: nova taxonomia de áreas/setores, novos campos de IA/banco, backfill, chamadas pagas, curadoria/publicação humana, outras abas/navegação global, suíte integral local.
- A-01: reuso PrismaCard/Ant Design/ícones/parseResumePeriod/classificação acadêmica; derivação read-only e aproximação mensal explícita, componentes/CSS e fixtures sintéticas. Relato contextual é texto publicado, não resposta de IA nem área normalizada. Sem nova biblioteca.
- Q-01: nenhuma pendência material. A autorização do PO aceita tempo não determinado quando o vínculo não estiver estabelecido. A engenharia não preencherá esse caso por suposição.

Supersede somente a exclusão de destaques de D-UX04 do acordo2.0.8; conteúdo integral/fontes/falhas isoladas continuam. Nenhuma entrega2.0.11 é inventada. Rascunho anterior preservado fora do commit como referência histórica não normativa.

## Mapa de impacto inicial / critérios de aceite

| Capacidade | Relação | Baseline / regressão proporcional |
| --- | --- | --- |
| Resumo/cards/CSS | direct |2.0.10 sem cards; mesma fixture1448 da imagem/390mobile, composição/textos completos/longos/ausência |
| Datas/área/formação | direct |parseResumePeriod/classificações publicados; união/gaps/meses/empates/futuro/inválidos/área geral sem vínculo/conclusão segura |
| Fontes/cache/snapshot/fallback | plausible_indirect |consulta lazy v208; UI fonte/refresh/foco/erro parcial/fallback, sem provider extra |
| Perfil/abas/leitura autorizada | critical_transversal |projeção existente tenant-scoped; UI/tipos/build, nenhuma mutation/API nova |
| Matching/SQL/IA/Parser/worker | no_impact_identified |helpers de leitura isolados, sem editar matching/Score, nenhuma migration/provider; diff/plan e imagens VPS preservadas |
| Registry/login/sidebar/produção web | direct |registry2.0.10/DxCL2PFY; teste skip11/CI/SHA/assets atuais e anteriores/rollback/HTTP |

CA-01..07: testes sintéticos de cada D e negativos P, capture desktop1448/mobile390 com todos os cards/textos/ações, comparação estrutural da referência, requests/sourceReads sem aumento, falha local não derruba seções. Datas dos cenários fixadas para assert determinístico. Types/build/contextos/lint/foundation e releaseplan, CI e web operacional. Sem promessa de jornada autenticada real ou qualidade universal.

## Prompt congelado

Executar integralmente D-UX-01/D-DATA-01/D-TIME-01/D-POS-01/D-EDU-01/D-KEEP-01/D-REL-01 sob P/F/A e CA acima. Referência escolhida `exec-9df601fc-6f84-404f-85e4-fa7246c19f7e.png` será copiada a `docs/qa/evidence/profile-summary-cards-v2012/approved-reference.png`. Topologia/hierarquia/grupo/ordem normativa; exemplos e shell global ilustrativos. Validar mesma fixture/estado/viewport e registrar adaptações autorizadas, limites e AoT.
