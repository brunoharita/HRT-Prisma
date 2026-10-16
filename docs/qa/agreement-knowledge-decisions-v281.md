# Acordo — decisões de Conhecimento2.8.1

Versão1.0.0 congelada pela autorização explícita de Bruno em16/10/2026: remover Rejeitar, decidir entre aprovar globalmente e manter local, sem justificativa obrigatória, implementar e publicar nova versão. Baseline cb0c629fbabd019d72e4075ee63ba2190f98e2f3 (2.8.0). Nova entrega2.8.1; classe D, RPC privilegiada existente e UI.

- D-01: contribuições globais pendentes de empresas têm somente duas decisões humanas: Aprovar na Base Global e Manter somente local. Pesquisa continua ferramenta auxiliar explícita. Proposta global nativa sem origem local mantém sua elegibilidade anterior, sem inventar uma origem empresarial.
- D-02: ambas aceitam justificativa ausente, vazia ou curta, sem mínimo de caracteres; texto opcional continua disponível e preservado, sem explicação inventada.
- D-03: novas rejeições devem ser indisponíveis na interface e recusadas pelo servidor, inclusive em clientes antigos; rejeições/histórico já existentes permanecem íntegros.
- D-04: preservar Super Admin exclusivo, autenticação, isolamento, origem local, auditoria transacional de autor/data/ação e guardas de classificação/certificação/estado. Nenhuma decisão implícita.
- D-05: preservar contenção desktop/celular; validar limites sensíveis localmente, publicar migration seletiva e web2.8.1 com CI, smoke e sincronização.
- P-01: proibido alterar/excluir/reclassificar decisões históricas ou termos/perfis reais como efeito da instalação/teste.
- P-02: proibido dispensar autoridade/classificação obrigatória ou inventar motivo para satisfazer auditoria.
- F-01: transição legada de proposta local, criação local, macroáreas profissionais, pesquisa IA, normalização/matching e outras curadorias. Sem nova tabela, biblioteca ou infraestrutura.
- A-01: engenharia pode reutilizar o RPC deferred, atualizar seu contrato por migration aditiva e ajustar textos/testes de forma proporcional. Campo opcional, ordem e composição dos cartões preservados.
- CA-01 (D-01/02): testes de clique sintético das duas decisões com motivo vazio e curto, payload sem motivo inventado, ausência de Rejeitar, histórico legível.
- CA-02 (D-03/04,P): PostgreSQL descartável com migration real: deferred sem motivo/curto, auditoria e origem preservadas; rejeitar/null/outros, anônimo, usuário comum, escopo/estado inválido e falha de auditoria recusados atomicamente; grants verificados. Aprovação mantém RPC/guardas existentes.
- CA-03 (D-05): tipos/build, testes diretamente afetados, responsive1448/390/320, docs/contexto, CI, fingerprints/ACL remotos e smoke produtivo somente leitura.

Sem Q material. A decisão de Bruno substitui a parte de D-05 do acordo M7.7 que permitia rejeitar/adiar como decisão adicional e a exigência atual de motivo nas duas decisões globais. D-07 e P-04 do acordo M7.7 (origem e histórico preservados) continuam. Contrato de decisão evolui para knowledge-global-decision-2.0.0; enum/status históricos permanecem compatíveis. A referência visual é o cartão atual corrigido, preservado salvo rótulos e retirada da decisão recusada.
