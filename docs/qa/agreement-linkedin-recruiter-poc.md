# Acordo e execução — PoC LinkedIn Recruiter

Versão experimental1.0.0. Autorização explícita de Bruno em25/10/2026: avaliar stickerdaniel/linkedin-mcp-server antes de integrar, somente ferramentas gratuitas, sem alterar produção. Não aprova sua adoção nem coleta de perfis reais.

## Contrato

- D-01: congelar SHA/licença/dependências do upstream e executar PoC local isolada. CA: manifesto reproduzível e ambiente separado.
- D-02: testar os contratos reais de busca, filtros e leitura usando entradas sintéticas/mocks; separar capacidade implementada de funcionamento ao vivo não testado. CA: resultados de testes positivos/negativos e lacunas explícitas.
- D-03: analisar sessão, importação de cookies, ferramentas de escrita, transporte, proveniência, erros, isolamento e manutenção. CA: referências ao código congelado e riscos concretos.
- D-04: recomendar adoção/adaptação/rejeição para Prisma Recruiter, com custos e trabalho interno necessário. CA: matriz fundamentada e próximos gates, sem integrar.
- P-01: nenhum login, leitura/importação de cookies reais, coleta de perfis, mensagens, conexões, contorno de controles, chamada de LLM paga, acesso a Supabase/VPS ou deploy. CA: execução sem credenciais, rede de runtime bloqueada no harness e diff somente experimental/documental.
- P-02: não criar base paralela, Perfil/Score/associação/decisão humana ou atribuir à PoC prova de qualidade/segurança de conta ao vivo.
- F-01: integração funcional/produção, medição real de recall/precisão, piloto com pessoas, desenho definitivo de persistência ou filtros sensíveis.
- A-01: seleção de testes e ferramentas locais gratuitas, mocks, estrutura do relatório e mecânica de isolamento.
- Q: nenhuma decisão pendente para este escopo sintético; acesso real e adoção exigem discussão posterior.

## Mapa de impacto e fechamento

Baseline Prisma b052be8751e66d495c160959839e4cb133ea5ae4/3.3.0. Branch codex/linkedin-recruiter-poc; clone/venv privados ignorados em tmp/linkedin-recruiter-poc.

`direct`: harness experimental e relatório; provar testes/limitações. `plausible_indirect`: futura conexão com Posição/Knowledge/revisão, somente mapeamento sem alteração. `critical_transversal`: credenciais/dados/autoridade humana; nenhum serviço produtivo acessado e harness bloqueia runtime externo. `no_impact_identified`: web/backend/modelos/Score/RLS/schema/runtime3.3.0, pois nenhum desses executáveis será alterado ou publicado; verificar diff final e plano de superfícies. Produção preservada por ausência de acesso, sem alegar inspeção operacional.

Execução: ler este acordo integral, auditar código congelado, preparar ambiente, executar testes selecionados e witness Prisma, registrar resultado e AoT no relatório. Fechar quando D-01..04 comprovados e P respeitados, mesmo que a recomendação seja não integrar. Não executar suíte completa do Prisma; validação suficiente é teste experimental, documentação/contexto e diff/plan. Contrato da PoC1.0.0; versão do produto3.3.0 permanece.

## Adendo1.1.0 — validação real de leitura,25/10/2026

Decisão posterior explícita de Bruno: login concluído na conta exclusiva informada por ele; confirmar identidade e prosseguir com testes reais de busca, sem mensagens/conexões ou produção. Substitui P-01/F-01 somente quanto a autenticação e leitura delimitada da fonte real. A rodada sintética1.0.0 permanece como evidência histórica.

- D-05: confirmar e-mail principal nas configurações antes da busca. CA: identidade coincide com a conta de testes autorizada; não inferir somente por nome.
- D-06: executar amostra pequena de buscas profissionais e conferir filtro versus estado real; separar leitura via navegador integrado da execução do MCP. CA: URL/controle selecionado, contagens e limitações, sem promessa de recall/banimento.
- D-07: para executar o MCP, usar perfil local exclusivo da PoC, sem importação automática ou cookies da conta oficial; autenticação manual quando necessária. CA: caminho segregado/flags e identidade confirmada antes de chamadas. Se a sessão não estiver disponível, registrar como não executado, sem substituir resultado do navegador por resultado do conector.
- P-03: nenhuma mensagem, conexão, reação, salvamento de prospecto, alteração de configuração, compra/assinatura, contorno de desafio, escrita no Prisma ou acesso/deploy produtivo. Rede real fica restrita ao LinkedIn nas operações manuais e às leituras de teste autorizadas; o harness sintético mantém seu bloqueio original.
- P-04: não publicar nomes, contatos, fotos ou currículo dos encontrados no repositório. Evidência persistida deve ser agregada/sanitizada; resultados não se tornam Perfis, Scores ou decisões humanas.
- F-02: integração, ranking de candidatos, coleta em massa e medição estatística de recall/precisão continuam fora do escopo.

Mapa adicional: `direct` filtros/observações da fonte real e sessão experimental; `critical_transversal` identidade/cookies/minimização, com confirmação de e-mail e sessão própria; `plausible_indirect` adequação futura do conector, sem implementar correções; `no_impact_identified` produção/cadastros/Score/Knowledge mantidos por ausência de acesso ou mudança. Encerramento exige relatar o executado e os bloqueios reais, sem inventar sucesso de conector. Nenhuma nova aprovação necessária para passos já autorizados; senha/2FA são fornecidos pelo operador diretamente no site.
