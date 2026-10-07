# Execução — carregamento visível v2.1.6

Implementar integralmente `docs/qa/agreement-loading-feedback-v216.md` versão 1.0.0 (D-01–05, P-01–02, F-01, A-01, CA-01–05), lido na íntegra. Sem Q pendente. Reutilizar PrismaState e estados explícitos de operação; inventariar páginas e componentes, corrigir lacunas, validar e publicar web/owner docs. Não introduzir observador genérico de rede nem alterar regras de negócio.

## Mapa de impacto e preservação anterior à implementação

Baseline main/origin `bb223ce6e5c079139db2a52a6138838a21eea69a`, runtime web v2.1.4 `d980fc6`. Estados acessíveis e skeleton já existem, cobertura incompleta; essa limitação integra o baseline, não é PASS de cobertura universal.

| Área/capacidade | Relação | Preservação e regressão |
| --- | --- | --- |
| Todas as páginas e componentes assíncronos, autenticação e superfícies públicas | direct | Inventário completo; feedback por operação, carregamento/atualização/erro/desmontagem, renders desktop/mobile |
| Componentes compartilhados, tema, modais, navegação | critical_transversal | Conteúdo e interação disponíveis, sobreposição não captura cliques, limpeza por desmontagem, responsividade e acessibilidade |
| Score persistido e revisão de divergências | plausible_indirect | Sem novas chamadas/efeitos de domínio; regressão dirigida score persistido e atualização somente causal |
| Rascunhos, seleção, publicação, evidência PDF e curadoria | plausible_indirect | Estados originais preservados; nenhum remount/limpeza por feedback; operações existentes com feedback |
| Auth/tenant/autorização | critical_transversal | Nenhuma mudança de regras/serviços ou exposição de dados; aviso não inclui nomes, termos, tokens ou PII |
| Banco, Edge, Parser, Synthesis, gateway | no_impact_identified | Indicadores consomem estados de UI, nenhuma mudança de consumidor/contrato/runtime destes serviços; plano deve excluir destinos |

Risco C: apresentação integrada com dependências sensíveis preservadas, sem alteração destas fronteiras. Validação dirigida, não suíte integral. Referências anteriores são contexto, não novo alvo estrutural. Rollback: imagem web anterior preservada pelo release existente.
