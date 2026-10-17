# Acordo e execução — Cadastrar Owner 3.0.1

Versão 1.0.0, aprovado por Bruno neste chat em 17/10/2026: implementar, validar e publicar em **3.0.1**. Complementa o acordo V3M0 1.0.0, especialmente D-04/05, e substitui sua escolha de versão somente nesta entrega; não renumera publicações históricas.

- D-01: a origem Cadastrar Owner de grupo novo transporta o ID do grupo. O servidor resolve nome de usuário, perfil Owner, grupo exato e única primeira empresa. Os quatro campos aparecem preenchidos e bloqueados no formulário existente. Nome completo, e-mail, celular, status e credenciais mantêm o fluxo atual.
- D-02: nome de usuário é o nome atual do grupo em minúsculas, sem espaços, seguido de `.owner`; HRT Solutions -> hrtsolutions.owner. Sem transliteração, truncamento ou sufixo alternativo silencioso. Conflito de username é informado. Restrições atuais de username permanecem: nome de grupo incompatível exige correção explícita no grupo.
- D-03: somente Super Admin ativo pode iniciar esse onboarding, em grupo em preparação, sem Owner ativo/pendente, com exatamente sua primeira empresa em preparação. Alteração/tampering de qualquer dos quatro campos, contexto inválido/obsoleto ou contrato desconhecido são recusados antes de Auth; persistência revalida o contexto sob lock do grupo. Falha posterior compensa apenas a identidade recém-criada, conforme fluxo existente. Auditoria obrigatória na transação.
- D-04: cadastro genérico/edição de usuários, quatro perfis, Owner abrangendo futuras empresas, isolamento, vínculos, dados e Tokens existentes são preservados. Cancelar/concluir o onboarding retorna a Grupos e empresas; não cria Pessoa nem ativa grupo automaticamente.
- D-05: publicar 3.0.1 com documentação, contexto, CI, migration/Edge/web seletivos, smoke e sincronização; sem testes que criem identidades reais ou enviem e-mails em produção.
- P-01: não aceitar campos protegidos alterados, usar rota/metadata como autoridade, inventar outro username, reutilizar identidade alheia ou mudar cadastros existentes automaticamente.
- P-02: não alterar planos, cobrança, decisões, dados de talentos, histórico de migrations ou contadores de versões já publicadas.
- F-01: transferência/substituição de Owner, renomeação automática de Owners existentes, alteração global das regras de username e outras melhorias de onboarding.
- A-01: reutilizar formulário, Supabase Auth/Edge e persistência transacional atuais; contexto dedicado e seleção de detalhes técnicos delegados à engenharia. Nada de novo fornecedor/dependência.
- CA-01: navegação pelo botão real, reload da rota contextual, quatro valores/locks, campos pessoais editáveis, criação/erro/retorno; cadastro genérico editável; desktop/mobile com mesma composição da imagem fornecida (conteúdo pessoal da imagem é ilustrativo e não entra nas fixtures).
- CA-02: negativos Edge reais com fetch sintético para cada campo, ator/contrato/colisão/escopo; SQL PG17 descartável cobre contexto, grants, revalidação, concorrência/Owner único, auditoria e persistência genérica preservada.
- CA-03: tipos/build/lint/contexto e testes dirigidos/CI; publicação e smoke somente nos destinos do diff, com evidência e limites no AoT.

## Mapa de impacto e fechamento

Baseline 82dee4bc25a8b2b4981e69058cf2c34ad6c8dc6c; runtime anterior e969c60/2.9.0, migration multiempresa_v3 e Edge platform-users v6 conforme entrega anterior, a revalidar antes do rollout.

| Capacidade | Relação | Prova/preservação |
| --- | --- | --- |
| Botão/rota/Cadastrar Owner/formulário | direct | Browser desktop/mobile, reload, quatro locks e retorno; mesma topologia/ordem da referência |
| Auth/autoridade/grupo/primeira empresa/audit | critical_transversal | Edge/SQL negativos, contexto antes de Auth e sob lock antes de persistir; compensação existente |
| Cadastro genérico/edição/default/Owner futuro | plausible_indirect | Testes dos usuários anteriores e SQL multiempresa; fixture genérica editável |
| Release/contratos/documentação | direct | Versão3.0.1, contexto/ledger/CI e publicação seletiva |
| Knowledge/matching/Parser/Tokens/PII/portais | no_impact_identified | Nenhuma lógica/serviço dessas capacidades alterada; helpers e save_platform_user_v3 existentes reutilizados sem redefinição; diff e destinos conferidos |

Mínimo suficiente: provas CA-01..03 e regressão dirigida acima; não executar validate integral local. Encerrar com D/P PASS, evidência, publicação e sincronização. Sem Q bloqueante. Execução incorpora integralmente este contrato 1.0.0, a autorização do chat e o acordo V3M0 de base lido por completo; AoT registra resultado, não raciocínio privado.
