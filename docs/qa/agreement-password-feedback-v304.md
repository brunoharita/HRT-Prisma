# Senha reativa e campos bloqueados — acordo e execução1.0.0

Bruno determinou no chat17/10/2026: requisitos reagem imediatamente, pendente com fonte vermelha, atendido com fonte/check verdes; campos não editáveis com aparência de inativados. Baseline375c9e4c599773e3bdf9c47623ebf0cb8cb268eb, runtime3.0.3 a67c32b2824585e5006102ad33c0dbc155aaafe1. Entrega3.0.4. Screenshot fornecida é referência normativa da composição/ordem existente e contraexemplo dos estados visuais; dados pessoais/credenciais são ilustrativos e não serão copiados para evidência/fixtures.

- D-01: seis requisitos do cadastro atualizam a cada digitação, colagem/substituição e exclusão, sem blur; confirmação reage a ambos campos e exige não vazios/iguais. Preservar observação Form.useWatch existente quando comprovada suficiente.
- D-UX-01: pendente vermelho; atendido fonte verde e check verde; ao perder requisito volta a pendente e perde check. Ícone/texto de estado acessível, sem depender só da cor, sem mudar posição do painel ou layout.
- D-UX-02: campos bloqueados no formulário têm fundo/borda/texto de desabilitado, com valores legíveis. No Owner são username, perfil, grupo e empresas canônicos; não editar e não perder valor no envio. Campos pessoais/editáveis e cadastro genérico preservados.
- P-01: sem mudar política de senha, validação no servidor/salvar, permissões, origem Owner, credenciais, persistência, envio de e-mail ou valores protegidos. Sem envio de senha por keystroke, logs ou gravação de senhas em evidência.
- F-01: recuperação/troca de senha, backend/Auth/Edge/banco, regras novas, design global e outros formulários.
- A-01: reutilizar watch, política e componentes atuais; CSS isolado ao cadastro de usuário, tokens/cores com contraste e affordances acessíveis. Validação sintética com senha única gerada em memória, nunca em logs/artefatos; screenshots mascaradas.
- CA-01: browser real em1448/390/320 com foco mantido, cada requisito antes/depois, inserção/substituição/exclusão, confirmação em ambos, cores/checks computados e ausência de chamadas implícitas; screenshots sem credencial visível, sem overflow.
- CA-02: quatro locks/valores/estilo, campos pessoais e cadastro genérico, envio Owner com campos canônicos, senha automática/erro/retorno preservados. Tipos/build, política/rotas e testes dirigidos; CI obrigatória.
- CA-03: documentação/contexto/versão3.0.4 e publicação apenas web; smoke de versão/SHA/assets/rotas, rollback/serviços e sincronização.

## Mapa de impacto / mínimo suficiente

| Área | Relação | Baseline / prova |
| --- | --- | --- |
| Requisitos e campos bloqueados do cadastro | direct | Watch/estados3.0.3; browser foco/cores/checks/estilos em três larguras |
| Política/submit manual e automático | plausible_indirect | Função compartilhada inalterada; testes de contrato e regressão browser submit/erro |
| Owner/usuário genérico | plausible_indirect | Mesmo contexto/handlers;60checks existentes mais novos cenários |
| Autoridade/canonicalidade | critical_transversal | Backend e payload mantidos; quatro locks/valores no browser/rotas; sem alterar servidor |
| Troca de senha/outros fluxos/banco/Edge | no_impact_identified | CSS opt-in no cadastro e componente local; diff e plano seletivo, sem acessar esses destinos |

ClasseB, sem nova dependência/ADR ou Q material. Execução incorpora D/P/F/A e CA acima. Encerrar após evidência obrigatória/CI/publicação/sincronização; não executar validate integral local. Jornada humana autenticada não será inventada a partir de fixture.
