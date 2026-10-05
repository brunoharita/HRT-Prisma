# Acordo e execução — Resumo preservado por resposta

Versão 1.0.0, agreed, 2026-10-05. Autoridade: decisão explícita de Bruno: a tela de resumo deve ser exibida, somente respostas indisponíveis recebem motivo em português claro, e nenhum erro oculta informações válidas. Supersede a rejeição global de D-02 do acordo v205 e D-E01/E02 do acordo de exceções somente quanto à granularidade de resposta. Perguntas, fonte, autoridade, limites por texto e isolamento permanecem. Produto2.0.6. Baseline main/origin/VPS `f4c327f9e7175905b7985ef23f002d1895d735cf`; incidente legado failed/attempt3. RiscoD/C: contrato aditivo, worker/persistência/leitura/UI. Reutilizar capacidades atuais; sem biblioteca/fornecedor/arquitetura nova.

- D-S01: validar cada afirmação e resposta separadamente; preservar as válidas e representar apenas itens indisponíveis com motivo fixo convertido em português. Referência inválida/texto inseguro/verificação inventada nunca é exibido; falha em overview/eixo/pergunta não invalida outros.
- D-S02: persistir resultado parcial e motivos por seção com snapshot/proveniência; contrato1.1.0 compatível na leitura com1.0.0. Estrutura não decodificável, autenticação/base inválida e falha de persistência não viram análise concluída. Seleção de referências fechada na geração; idempotência/histórico/tentativas mantidos, sem backfill ou reset.
- D-S03: tela e oito eixos presentes em sucesso/parcial/falha/consulta indisponível; conteúdo disponível prevalece sobre aviso. Dados publicados já carregados ficam acessíveis quando não há análise utilizável e são identificados como dados publicados, nunca como síntese de IA. Cada seção explica indisponibilidade em português sem códigos; detalhes técnicos permanecem internos.
- D-S04: validar fluxo completo local, negativos SQL/auth/tenant/proveniência, falhas múltiplas/legado/mobile, publicar seletivamente e registrar AoT. Nenhuma chamada real adicional de IA é necessária para provar preservação da tela.
- P-S01: não inventar fatos, aceitar referências desconhecidas, confundir relato com verificação/IA, ocultar conteúdo válido por outro erro, expor segredo/PII em logs, alterar Perfil humano, resetar tentativas ou gerar a cada visita.
- F-S01: Parser/matching/Knowledge, modelos/perguntas novos, backfill, redesign global e publicação humana.
- A-S01: versionamento aditivo/SQL/RPCs/normalização defensiva/enum/UI/testes sob os padrões atuais; preservar a versão pública2.0.6.
- Q-S01: nenhuma decisão material pendente; falhas antigas descartaram respostas e não permitem reconstruir conteúdo gerado. Exibir dados publicados atuais preservados, sem fabricar aquela análise.

Delta de execução de D-S02, sob a mesma autoridade: uma ação explícita de recuperação pode criar a chave do contrato corrigido para falha de resposta do legado1.0.0, inclusive após três tentativas. Não reinicia aquele job, não apaga tentativas e não gera ao consultar. Reutiliza leitor autorizado, tenant/Pessoa/Perfil vigente/hash, lock, cooldown e chave idempotente; o contrato1.1.0 conserva seu próprio limite de três tentativas. Validação negativa e prova de replay/histórico obrigatórias. Não autoriza reprocessamento administrativo de uma Pessoa real nesta execução.

## Mapa de impacto / aceite

| Capacidade | Relação | Baseline / regressão mínima |
| --- | --- | --- |
| D-S01/02, domínio/worker | direct | rejeição global31testes; defeitos localizados preservam irmãos, enum fontes, métricas/segredos/limites/injeção |
| D-S02, SQL/RPC/tenant | critical_transversal | Pg17 local, RLS/grants/lease/base aprovados; aceitação parcial, legado, negativos/rollback, sem replay de ledger |
| D-S03, Resumo/fontes | direct | screenshot atual é contraexemplo, referência70/30 e60/40 preservada; sucesso/parcial/global/source/render/legado1416/390 e oito seções visíveis, sem overflow/códigos |
| Perfil/publicação humana | plausible_indirect | person-flow256PASS anterior; tipos e regressão dirigida, nenhuma escrita canônica |
| Parser/matching | no_impact_identified | APIs/worker separados; conferir imagens operacionais e espelho matching preservado |
| D-S04, release | direct | webdb837df/worker49cbf2c; tipos/build/QA/context/CI/plan, somente migração/web/worker e smoke/rollback |

## Prompt congelado

Implementar D-S01..04 sob P-S01/F-S01/A-S01. Cada requisito exige implementação/teste/evidência no AoT. Isolamento por resposta é obrigatório; não concluir entrega que apenas troque a mensagem de falha global. Layout mantém cabeçalho/abas, narrativa principal/lateral e fonte selecionada, com seções e avisos locais. Estado aguardando sem resposta não inventa análise; dados publicados continuam identificados.
