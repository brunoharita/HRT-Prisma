# Agreement Contract — M8 UX — Sugestão de descrição de competência

Versão: 1.0.0. Decisão do Product Owner em 2026-09-21. Este movimento adiciona assistência opcional ao formulário de criação de conhecimento da empresa, sem alterar a autoridade humana, a persistência ou a Inbox.

## DEVE

- **D-UX-01** Exibir “Sugerir com IA” junto ao campo “Descrição do conceito” no fluxo de proposta de novo conceito.
- **D-UX-02** Enviar ao agente somente o nome da competência e receber uma definição em um único parágrafo editável.
- **D-UX-03** Preencher o campo localmente; somente “Gravar” persiste a descrição na proposta.
- **D-UX-04** Preservar a edição humana e comunicar carregamento, erro e origem da sugestão.

## PROIBIDO

- **P-UX-01** Criar proposta, associação, evidência, alteração na Inbox ou qualquer gravação durante a sugestão.
- **P-UX-02** Enviar currículo, Perfil, Pessoa, organização, PII ou segredo ao modelo.
- **P-UX-03** Tratar a definição gerada como evidência pessoal, equivalência Knowledge ou decisão de contratação.

## FORA DE ESCOPO

- **F-UX-01** Proveniência persistida da sugestão, migration, novo ledger ou alteração do contrato salvo.
- **F-UX-02** Redesign do painel, mudança das regras de curadoria, pesquisa Web e sugestão para associação a conceito existente.

## AUTONOMIA

- **A-UX-01** Reutilizar a Edge Function `knowledge-agent` em modo dedicado, autenticação, autorização organizacional, bloqueio no-PII, orçamento e Structured Outputs.
- **A-UX-02** Normalizar a saída para um único parágrafo de até 2.000 caracteres e usar fallback de erro sem apagar o rascunho.

## CRITÉRIOS DE ACEITE

- **CA-UX-01** O botão aparece somente na proposta de novo conceito e fica indisponível sem nome ou durante a chamada.
- **CA-UX-02** A resposta aceita contém apenas uma definição não vazia de até 2.000 caracteres; formato inválido é rejeitado.
- **CA-UX-03** Testes estáticos provam o modo dedicado, ausência de Web Search/persistência na sugestão e bloqueio de PII no servidor.
- **CA-UX-04** Typecheck web, build/testes direcionados e diff review passam; nenhuma migration ou mutação remota é necessária.
