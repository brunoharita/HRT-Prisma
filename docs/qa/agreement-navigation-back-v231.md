# Acordo — Retorno à tela anterior v2.3.1

Versão 1.0.0, agreed, aprovado por Bruno em 10/10/2026 nesta conversa: opções de destino fixo podem coexistir, mas a seta no alto à esquerda deve retornar à tela imediatamente anterior; implementar em main e publicar 2.3.1. Delta do contrato de apresentação, sem contrato persistido novo.

## DEVE

- D-01 — Uma seta compartilhada no alto à esquerda das páginas operacionais retorna à origem imediata registrada na navegação, independentemente da hierarquia do módulo. Etapas e subtelas internas integradas retornam ao estado anterior, sem criar navegação de domínio.
- D-02 — Atalhos existentes a Pessoas, Posições, documentos, revisão e acompanhamento continuam disponíveis com destino fixo; não usam a seta reservada ao retorno imediato.
- D-03 — Reutilizar confirmação de alterações não salvas, histórico do navegador, filtros/seleção/rolagem já integrados. Cancelar a saída preserva URL e rascunho; confirmar a seta exige uma única confirmação.
- D-04 — Histórico de retorno restrito à sessão/papel/empresa atuais; entrada direta sem origem conhecida exibe seta indisponível, sem inventar origem ou sair para site externo. Não registrar URLs de credenciais ou portais pessoais nesse histórico.
- D-05 — Publicar 2.3.1 pelo registry único, main/origin/VPS, somente web, com QA sintético, smoke e rollback.

## PROIBIDO

- P-01 — Retorno a destino hierárquico fixo pela seta quando houver origem imediata conhecida; ciclos causados por empilhar um novo retorno.
- P-02 — Ignorar guardas, atravessar escopo de empresa/sessão/papel, persistir dados de domínio/segredos no histórico ou executar IA/envio/publicação por voltar.
- P-03 — Alterar regras, autoridade, respostas, resultados, Score, Perfil, serviços, banco ou permissões.

## FORA DE ESCOPO

- F-01 — Redesenho de telas, fórmulas, dados, serviços de e-mail/IA, migrations e operações reais de candidatos. Portais públicos mantêm sua navegação própria, sem seta para área autenticada.

## AUTONOMIA

- A-01 — Estender os componentes/history API existentes, sem novo roteador/dependência. Nome acessível, acabamento responsivo, limites de memória e testes sintéticos delegados à engenharia.

## PENDÊNCIAS

Nenhuma decisão material pendente.

## ACEITE

- CA-01 — Caminhos Pessoa via busca/Posição/acompanhamento, edição por origens distintas, documento/revisão/versões e Posição/acompanhamento retornam ao endereço exato anterior, por teste de navegador com componentes reais e serviços substituídos por fixtures.
- CA-02 — Setas presentes no alto à esquerda inclusive em telas antes sem retorno; destinos fixos preservados; etapas internas retornam à anterior. Desktop e mobile sem overflow/erros.
- CA-03 — Voltar/avançar, recarregar, saída limpa, cancelar/confirmar rascunho e troca de escopo têm provas positivas e negativas; URLs pessoais e externas não são origens elegíveis.
- CA-04 — Registry 2.3.1, Context Pack, tipos/build/testes dirigidos, CI, runtime SHA/version e smoke de preservação dos serviços sem reconstruí-los.

## Mapa inicial de impacto e preservação

Baseline local main 79f12a54eb727c42ab237304a7e1ce9c251a3ec2; levantamento de destinos nesta conversa confirmado no código. Runtime será conferido antes do rollout. Risco C com negativos no limite de navegação/escopo; nenhuma mudança de autorização.

| Área/capacidade | Relação | Mecanismo e preservação | Regressão |
| --- | --- | --- | --- |
| Navegação, páginas e cabeçalhos operacionais | direct | Seta comum; atalhos fixos; URL anterior; etapas/subtelas | QA browser sintético em componentes reais, tipos/build |
| Rascunhos, filtros/seleção/rolagem | direct | Guardas e store existentes, sem cópia de formulários | Cancelamento/aceite, histórico/back/forward, estado da origem |
| Sessão/papel/empresa | critical_transversal | Sem retorno elegível entre escopos; autorização de rota preservada | Negativos de escopo e URL, troca de contexto |
| Avaliação/ingestão/revisão/curadoria | plausible_indirect | Apresentação e transição interna; ações de domínio continuam explícitas | Fixture registra ausência de geração/envio/escrita implícitos |
| Backend/Score/modelos/Resend/Parser/Synthesis/Mail | no_impact_identified | Nenhuma mudança de contrato, dados ou chamada de negócio; release web isolado | Revisão do diff/plano e IDs/imagens/restarts dos serviços |

Sem referência visual normativa fornecida; posição superior esquerda é requisito explícito, demais detalhes seguem o design system.
