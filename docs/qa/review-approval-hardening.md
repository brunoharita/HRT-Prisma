# Evidência de hardening da aprovação de revisão

Data: 2026-08-30
Ambiente remoto: Prisma-QA (`ioldpnqqvobprjiontre`)
Produção: inexistente e fora de escopo

## Incidente e causa

A aprovação da revisão `5e8f1286-12aa-4db8-b991-954ee51c44eb` falhava quando o gatilho privado aprendia uma área personalizada. A função declarava uma variável local `definition_id` com o mesmo nome de uma coluna usada em `ON CONFLICT`, e o PostgreSQL recusava a referência ambígua. A transação original foi revertida integralmente.

## Correção sistêmica

- o gatilho usa `v_section` e `v_definition_id`;
- `#variable_conflict error` transforma novas colisões em falha explícita durante a criação da função;
- a própria migration verifica a definição instalada;
- execução direta permanece revogada para `public`, `anon` e `authenticated`;
- teste de regressão compara variáveis declaradas e colunas de todos os `ON CONFLICT` da função efetiva;
- o adapter web classifica gates previsíveis e nunca apresenta mensagens SQL desconhecidas ao operador.

## Evidência local

- typecheck web aprovado;
- 99 testes técnicos aprovados;
- cobertura positiva para concorrência, estado, autorização, evidência, identidade, contato, shape e idempotência;
- cobertura negativa garante que identificadores, tabelas, códigos e mensagens SQL desconhecidas não vazem para a interface.

## Evidência conectada no QA

1. Migration local `20260830201029_review_approval_runtime_hardening` aplicada no QA como `20260830201459_review_approval_runtime_hardening`.
2. Definição instalada contém o guard e as variáveis prefixadas.
3. `anon` e `authenticated` não possuem `EXECUTE` direto no gatilho privado.
4. A mesma revisão do incidente percorreu `approve_profile_review` com identidade administrativa e lock 14.
5. Antes do rollback foram comprovados: revisão `approved`, perfil profissional criado e confirmação da área personalizada registrada.
6. Uma exceção sentinela encerrou a transação e forçou rollback.
7. Depois do rollback: revisão `draft`, lock 14, `approved_profile_id` e `approved_at` nulos, zero perfis, zero confirmações e zero operações da chave de teste.

Os advisors foram executados após a migration. Nenhum alerta novo pertence ao gatilho alterado; permanecem avisos históricos do projeto, incluindo RPCs públicas `security definer` intencionais e índices ainda sem uso.

## Limite do smoke

O navegador interno abriu a rota protegida, mas a sessão havia expirado; não existia Chrome conectado com outra sessão reutilizável. Nenhuma credencial foi reenviada automaticamente. Portanto, a inspeção visual autenticada desta mudança não é apresentada como aprovada. A execução autenticada do backend, que reproduz exatamente a operação que falhava, foi concluída com rollback e sem alterar o currículo real.
