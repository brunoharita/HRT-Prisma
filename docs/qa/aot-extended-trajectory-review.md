# AoT — revisão extensa opcional v2.1.7

Acordo integral `agreement-extended-trajectory-review.md` 1.0.0 e prompt/mapa `execution-extended-trajectory-review.md`. Autoridade: pedido explícito de Bruno em07/10/2026, implementação/publicação pela autorização permanente AGENTS7. Baseline main/origin/VPS1a1c254 e runtime20ebdd70 v2.1.6; projeto Prisma ioldpnqqvobprjiontre ACTIVE_HEALTHY, Edge matching-trajectory16/JWT ativo. Limite cinco confirmado ao vivo nas duas funções e constraint, sem ler Pessoas.

| Regra | Implementação | Evidência | Status |
| --- | --- | --- | --- |
| D-01 | Abertura direta até5, mesmo modal/ajuda | Browser1/5,3 viewports; regressão ajuda | PASS |
| D-02 | Confirmação explícita acima5; paginação1 e escolhas porID | Browser6/21, aceitar/recusar/ida/volta desktop/mobile; renders | PASS |
| D-03 | Recusa/abertura/páginas não gravam; salvar todos | Browser/Edge/SQL: ausência de efeitos, completo/ausente/duplicado, incerteza | PASS |
| D-04 | Guards preservados; migração aditiva amplia somente elegibilidade | SQL sintético com rollback, Edge e105 Node dirigidos; fonte/RLS/tenant/papel/proveniência/stale/concorrência | PASS |
| D-05 | Estados v2.1.6, owner/versão/main/rollout | CI branch/main, migração/Edge/web e smoke/rollback conferidos | PASS |
| P-01 | Sem truncamento/decisão parcial/IA automática; histórico preservado | Browser/SQL/Edge e regressão estabilidade | PASS |

## Preservação e limites

Mapa prévio permanece vigente. Mudanças somente na elegibilidade/apresentação da revisão, com autorização server-side mantida. O formato persistido1.0.0 continua idêntico, incluindo revisão sem conclusão; contrato de UX/eligibilidade novo explicitamente substitui a regra antiga. Não altera fórmula, prompt/modelo, parâmetros de recálculo, Perfil/Knowledge nem serviços de processamento. Browser usa componentes reais com serviço sintético e bloqueia rede externa; SQL usa banco local vazio import_evidence_v202/127.0.0.1:55479 e rollback. Sem IA paga, dados reais ou decisão humana fabricada.

O baseline local tem arquivo físico ausente na tabela preexistente profile_synthesis_jobs. Apenas o bloco histórico de teste de exclusão de Perfil/Posição foi excluído da preparação sintética, por não pertencer ao movimento; não se afirma preservação dessa capacidade pelo SQL desta execução. Colunas auxiliares de taxonomia ausentes no baseline são acrescentadas somente dentro da transação de teste. Os144 checks executados incluem reprodução da barreira histórica antes da migração e negativos/positivos da revisão após a migração. Nenhum teste alvo foi removido. Harness/projeção inicial de fontes do teste Edge e código esperado do negativo cross-tenant foram corrigidos antes do PASS final; falhas iniciais não são contadas como sucesso.

Renders em `evidence/extended-trajectory-review`: confirmação e revisão paginada, em1280/390/320; estrutura original do modal e ajuda mantida, sem novo alvo visual normativo. Comparação com baseline v2.1.6; nenhum desvio material de topologia além da confirmação/paginação explicitamente solicitadas. Jornada autenticada real em produção NOT TESTED. Rollback da aplicação preserva schema ampliado/histórico; não recolocar constraint<=5 após possíveis revisões maiores. Plano prévio confirma migração nova, matching-trajectory e web, sem Parser/Synthesis. O comando genérico pnpm test foi substituído por105 testes Node diretamente afetados,46 Edge e144 checks SQL, mais navegador/19 tooling. CI obrigatório mantém o fluxo existente. Tipos/build raiz e web, lint/foundation/runtime gerado/ledger/Context Pack PASS; avisos anteriores de chunk/dynamic import permanecem. Confirmar plano commitado antes do rollout.

Navegador final:14 cenários novos e13 de preservação da ajuda/legado/papéis PASS, sem chamadas externas/erros de runtime. Cobre falha e incerteza em revisão extensa com carregamento contínuo e bloqueio funcional de navegação durante salvamento. Capturas aguardam fim da animação. A verificação inicial de atributo disabled no botão decorativo de paginação foi substituída pelo teste funcional de que a página não muda; a implementação já respeitava disabled. Execuções intermediárias do harness não contam como PASS.

## Publicação e fechamento

Publicado em07/10/2026, SHA funcional `191de3dfd8cd743d46aecc0cf643e74a4b3e72d0`, integrado main/origin/VPS. CI branch37693061025/main37693203350 success. Migração remota `20261007220005` aplicada por MCP, somente a migration nova; alias local20261007220000 registrado sem reparar o histórico. Verificação remota confirma retirada do teto nas duas funções e constraint não vazia, RLS/grants intactos. Edge matching-trajectory17 ACTIVE/verify_jwt true,13 arquivos conferidos iguais ao commit; somente handler e compositor gerado mudaram frente à16. Nenhuma revisão real foi salva e nenhuma IA chamada.

Web imagem `sha256:0d6a7664b61990ff5ce5a171764f40928139b83f6e21dcfb50e19ab91c706d37`, running/0, entry `index-sVw5w6Ck.js` e CSS `index-SNTMzHER.css`. Rollback `prisma-web:rollback-before-191de3dfd8cd` preserva imagem28aacc1c/v2.1.6. Parser/Synthesis/gateway preservam IDs/imagens/reinícios; workers healthy. O comando SSH de release saiu22 por404 do curl imediato durante recriação; não é contado como PASS. Smoke posterior independente:14 HTTP200 e9 checks de SHA/versão/confirmar/paginar/ajuda/carregamento/score/negação anônima401 PASS, incluindo assets anteriores. Sem rebuild adicional. Recibo consolidado distingue a falha transitória da verificação posterior.

D-01–05/P-01 PASS; desvios materiais: nenhum identificado. Jornada autenticada real em produção permanece NOT TESTED; evidência sintética não comprova escolha/revisão de Pessoa real. Fechamento documental e ledger sincronizam Git/VPS sem reconstruir o runtime funcional acima. Servidor Vite próprio5697 encerrado; servidor anterior5693 e arquivos alheios preservados. Context Pack usa somente rastreados/arquivos próprios, sem documentos alheios não rastreados.
