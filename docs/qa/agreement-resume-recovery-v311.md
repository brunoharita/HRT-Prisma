# Acordo — retomada de importação 3.1.1

Versão 1.0.0, agreed, 17/10/2026. Autoridade: Bruno autorizou corrigir a retomada, investigar a falha original, validar, integrar em main e publicar nova versão. Registra a decisão aprovada, sem nova escolha material pendente.

## DEVE / aceite

- D-01: a página do documento consulta e mostra o consumo de Tokens antes da retomada com IA, com atualização acessível. CA-01: navegador com consulta inicial, atualização e falha recuperável.
- D-02: retomada usa a previsão exibida e válida para empresa/função/quantidade; carregamento, expiração, erro e saldo insuficiente impedem chamada IA; clique duplicado não inicia duas operações. CA-02: testes negativos e navegador, recuperação após falha/expiração.
- D-03: recuperar o mesmo PDF/intake/documento preservando SHA, tenant, Pessoa, evidências, histórico e publicação humana. CA-03: regressão do serviço real com dependências sintéticas, sem LLM/banco produtivo.
- D-04: investigar a falha original por leitura mínima e registrar causa comprovada e limites. CA-04: registro sanitizado da tentativa original e comparação com histórico/código vigente; não inventar diagnóstico ausente.
- D-05: publicar 3.1.1 e sincronizar main/GitHub/VPS com CI, smoke e rollback. CA-05: recibos, versão/SHA/assets e serviços preservados.

## PROIBIDO

- P-01: suprimir a previsão ou cobrança, ampliar autoridade ou ignorar divergência da fonte.
- P-02: publicar Perfil automaticamente, apagar histórico, reprocessar o documento real como teste ou expor conteúdo pessoal/segredos em evidências.

## FORA DE ESCOPO

- F-01: regras comerciais, modelo/prompt IA, nova importação histórica, alteração de schema/RLS/Auth e redesign das demais telas.

## AUTONOMIA

- A-01: reaproveitar hook de previsão vigente, controles Ant Design/tokens Prisma, testes sintéticos e patch 3.1.1; preservar composição da tela. Screenshot é evidência do defeito, não nova proposta de arquitetura visual.

## Mapa de impacto e preservação inicial

Baseline: main/local/origin 42dd34ce110c7529e2b1cc668c5912080b9c8daa; runtime 3.1.0/61f91bd. Tracked limpo; rascunhos não rastreados preservados. Classe C, regressões D na fronteira de persistência privada reutilizada.

| Capacidade | Relação | Baseline / regressão mínima |
| --- | --- | --- |
| Retomada na página de documento | direct | Falha por quote ausente; navegador desktop/mobile, erros, expiração, saldo, duplo clique |
| Cliente Parser IA / serviço intake | direct | Previsão e SHA obrigatórios; teste real com transporte/Storage simulados, mesmo intake, persistência e negativos |
| Tokens e importação comum | plausible_indirect | Assinatura opcional preserva chamadas existentes; testes de quotes e Parser existente |
| Perfil vigente / tenant / publicação humana | critical_transversal | Documento v2 aprovado separado de v1 falho; negativos de tenant/fonte e nenhuma escrita real na investigação |
| Matching, Auth, planos, Knowledge | no_impact_identified | Sem mudança de contrato, writer ou cálculo; revisão do diff e release seletivo |

Fechamento: D/P comprovados, checks proporcionais, contexto/documentação, CI, publicação web seletiva e sincronização. Suíte integral não é necessária; dispatcher roteia testes dirigidos para esta fronteira.
