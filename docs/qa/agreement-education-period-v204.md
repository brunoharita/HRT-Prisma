# Correção da permanência do período na revisão — v2.0.4

Versão 1.0.0, agreed, 2026-10-04. Bruno autorizou corrigir o campo que desaparece na formação e publicar v2.0.4 em main/produção. Baseline `03044b41fb66c53d9348293e460b9d96213add55`; risco B, UI delimitada, sem banco/Parser. Este acordo incorpora o prompt de execução autorizado, restaurando a correção humana prevista por D-01/D-03 do acordo de formatos 1.0.0.

- D-01: período aberto para revisão permanece acessível ao apagar, digitar, corrigir, perder foco, navegar entre registros/abas e salvar rascunho. Um período presente no original ou rascunho persistido continua acessível após recarregar, inclusive ensino médio. Campos sem período mantêm a composição acadêmica quando nunca abertos. CA: reproduzir falha anterior e testar sequência no componente real, com identidade estável por formação.
- D-02: erros/avisos desaparecem ao corrigir, sem remover o campo, perder foco ou descartar valor/fonte. CA: input mantém identidade/foco ao limpar e digitar, fonte preservada, segunda/terceira formação independente, dados anteriores preservados.
- D-03: registrar v2.0.4, owner docs/Context Pack/AoT e publicar SHA validado em main/GitHub/VPS, somente web. CA: tipos/build, testes dirigidos, render desktop/mobile, CI, HTTPS/assets/versão, rollback e imagens dos serviços não afetados.
- P-01: não inventar datas, alterar validadores/calendário/classificação/evidências, salvar dados de Pessoas reais para teste ou enfraquecer salvamento/publicação/tenant.
- F-01: banco, migrations, Parser/OCR/IA, matching/Knowledge, novos campos/bibliotecas ou redesenho da revisão.
- A-01: engenharia escolhe estado local por revisão/ID estável e reaproveita navegação, inputs e fixture existentes.
- Q-01: nenhuma decisão material pendente.

## Mapa de impacto inicial

| Capacidade | Relação | Baseline / preservação / prova |
| --- | --- | --- |
| Período/Formação e navegação | direct | v2.0.3 condiciona ensino médio ao aviso; render sintético com foco, digitação, ida/volta, rascunho recarregado e duas larguras |
| Revisão/validação/rascunho/evidência | plausible_indirect | mesmos dados/handlers/validadores; testes lifecycle/datas e fonte original no render |
| Web/versão/Context Pack/release | direct | main 03044b4, web 4111e554; tipos/build/registro/contextos/CI e smoke/rollback |
| Auth/tenant/RPC/publicação | no_impact_identified | sem alteração de serviço/payload/gate; análise do diff e testes existentes de lifecycle/erros, nenhuma operação real |
| Parser/OCR/IA/matching/Knowledge | no_impact_identified | apenas componente web/registro; dispatcher deve excluir Parser, banco e Edge, imagens remotas preservadas |

Referência fornecida: contraexemplo de desaparecimento, não novo layout normativo. Preservar abas, navegação, cartões extraído/revisado, classificação e evidências; recolocar apenas o campo existente. Teste sintético é evidência do componente, não jornada autenticada de currículo real.

## Execução congelada

Implementar D-01 a D-03 sob P-01/F-01, com A-01. AoT registra comportamento novo, preservação e limites. Sem mudança de contratos persistidos.
