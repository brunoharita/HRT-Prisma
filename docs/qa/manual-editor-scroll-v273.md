# Acordo, execução e AoT: rolagem do editor manual 2.7.3

Baseline 7e5d8f4, runtime2.7.2. Relato de Bruno e screenshot em15/10/2026: editor manual de Perfil existente corta conteúdo no rodapé e desperdiça espaço lateral. Imagem é contraprova, não novo desenho normativo. Correção delimitada restaura o comportamento aprovado em agreement-manual-profile-v270, D-UX-01 (área de edição ampla e seções acessíveis).

Acordo1.0.0: D-01 permitir rolagem da página manual até todos os campos, sem altura fixa/recorte herdados da revisão PDF. D-02 manter abas, valores de referência, campos, rascunho, comparação humana e navegação; alinhar cartão/área editável para retirar margens brancas internas excessivas. P-01 não alterar semântica, writers, dados/versões, IA/Tokens, PDF ou comparação. F-01 redesenho do formulário, remoção da referência e edição direta dos agrupamentos Knowledge. A-01 CSS restrito ao modo manual e detalhes menores de largura. CA-01 reproduzir antes, testar desktop/celular, editar área e salvar rascunho sintético sem publicar, preservar revisão não manual; tipos/build/versão/contexto/CI e smoke seletivo.

Execução congelada: D-01/02 e P-01, F-01/A-01 acima; branch codex/manual-editor-scroll-v273; publicar patch2.7.3 pela autorização permanente de correções. Classe B, sem backend/banco ou fronteira sensível alterados.

GOV-01 inicial: formulário manual/rolagem/layout `direct`, incluindo cadastro novo e atualização; revisão PDF/Perfil não manual `plausible_indirect` por CSS compartilhado, preservar altura/painéis/rolagem próprios. Salvar/comparar/navegação `critical_transversal`, verificar callback e rascunho no browser sintético. Knowledge/Pessoas/Score/seleção/ingestão/Tokens/auth/banco `no_impact_identified`: CSS apenas em ancestral manual e registry de versão, sem mudança de serviços/contratos. Regressão mínima CA-01, sem suíte integral local. Fechamento exige evidência visual equivalente, CI obrigatório, dispatcher web, rollback e sincronização. Estado inicial NOT TESTED.

## AoT local

| Acordo | Implementação e prova | Estado |
| --- | --- | --- |
| D-01 | Altura natural/overflow visível exclusivamente manual. Baseline1448: frame670px/conteúdo1893px, Áreas fora do recorte após wheel. Depois: nenhum ancestral recorta, campo visível e editável em2232/1448/390 | PASS |
| D-02 | Header/cartão alinhados em1320px e editor ocupa sua largura; seis cenários cadastro/atualização salvam a área declarada em rascunho, comparação continua disponível, nenhuma publicação automática | PASS |
| P-01 | Três cenários não manuais conservam overflow hidden e altura própria. Diff só CSS manual/registry/testes/docs, zero chamadas externas no teste; sem writers alterados | PASS |
| CA-01 |9 cenários browser,5 testes registry, tipos root/web, build web, lint/contexto/diff PASS. CI/produção pendentes até recibo final | PARTIAL |

Imagens e medições em `evidence/manual-editor-scroll-v273`, mesmos dados sintéticos/estado update/viewport1448 antes/depois; desktop2232 e celular390 adicionais. Referência é contraprova do recorte; nenhuma composição nova foi tratada como aprovada. Ajuste de largura é acabamento da área ampla já aprovada. O seletor exato de comparação no teste ignorava nome acessível composto; corrigido para correspondência textual após inspecionar botões, sem alterar produto. Não se refez nenhuma jornada/dado humano em produção para testar gravação.
