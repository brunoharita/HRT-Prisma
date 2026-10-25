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
