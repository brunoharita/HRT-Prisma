# Validação antecipada de formatos na revisão

Versão 1.0.0, agreed, 2026-10-04. Bruno aprovou a proposta e autorizou implementação/main/publicação. Baseline `d207e114412893037021d9697426fe697a3f2f72`, risco D (revisão, gate de salvamento/publicação e UI). Complemento da v2.0.3, sem nova entrega no registro público; `review-field-format-1.0.0` versiona esta validação, sem alterar envelope de erro ou formato dos fatos.

- D-01: ao carregar e editar, destacar em vermelho campos que violem regras objetivas, com explicação em português e correção concreta; incluir telefone/e-mail/LinkedIn/limites existentes e datas impossíveis/período invertido nas experiências/formações. CA: erros presentes antes de salvar e desaparecem ao corrigir, sem reload ou alteração de outros dados.
- D-02: preservar formatos válidos, incluindo anos, mês/ano, data completa, anos com dois dígitos pela política vigente, períodos abertos e Atual. Não exigir precisão ausente. Período não reconhecido recebe aviso amarelo não bloqueante; opcional vazio não é erro. CA: exemplos válidos/ambíguos/ausentes, sem invenção ou mutação do draft/fonte.
- D-03: resumo de pendências/avisos com acesso ao campo, tab e registro corretos, inclusive segundo/terceiro item; reusar estrutura/componentes atuais. Diferenciar avisos de impedimentos; somente erros obrigatórios bloqueiam salvar/comparar/publicar. CA: navegação por ID estável, edição e classes/aria/mensagem acessíveis, desktop/mobile.
- D-04: servidor preserva os mesmos impedimentos objetivos sem bloquear ingestão inicial de texto defeituoso. Auth/tenant/locks/idempotência/auditoria continuam antes do novo gate, histórico não é reescrito, erro retorna motivo/campo no envelope vigente. CA: SQL QA local, paridade TS/SQL, save/publicação reais sintéticos com rollback e negativos.
- D-05: owner docs, Context Pack, AoT, commit/main/origin/VPS, migration seletiva, web e atualização do runtime Parser quando exigida pela dependência compartilhada. CA: testes dirigidos/person-flow/tipos/build/CI, verificação da função/grants e HTTPS/assets/rollback. Separar smoke sintético de confirmação humana real.
- P-01: não inventar datas, contatos ou fatos, não inferir fato negativo da ausência, não tornar dúvida obrigatória, não normalizar silenciosamente a fonte, não enfraquecer gates/tenant/histórico, não publicar Perfil real para testar.
- F-01: novos campos ou modelos de contato, alteração dos cálculos de matching/score, novas regras de data futura/posse do telefone, modelos/prompts/infraestrutura Parser/OCR/IA, saneamento histórico, redesenho ou novas bibliotecas.
- A-01: reusar parser/normalização de datas, validação de campos, envelope de feedback, navegação e padrões SQL; implementação/fixtures/entrega delegadas à engenharia.
- Q-01: nenhuma decisão pendente; formatos incompletos/ambíguos são avisos, não bloqueios. A validação não interpreta ausência como atual ou zero.

## Mapa de impacto inicial

| Capacidade | Relação | Baseline / prova proporcional |
| --- | --- | --- |
| Revisão/pendências/edição/navegação | direct | v2.0.3 já valida ao carregar; faltam datas/avisos/resumo; testes dirigidos e render sintético |
| Salvar/comparar/publicar | direct | RPCs instaladas conferidas, gates após auth/lock/replay; QA SQL real local e person-flow |
| Auth/tenant/auditoria/histórico/evidências | critical_transversal | SECURITY DEFINER existente e grants preservados; negativos SQL e rollback |
| Datas/educação/normalização | plausible_indirect | parser 1.1.0 e precisão preservados; casos aceitos e paridade SQL |
| Web/versão/runtime | direct | imagem web 8d578d5, Parser dc3fd80; rollout web/HTTPS/rollback e Parser preservado |
| Ingestão/Parser hospedado | direct | Dependência descoberta no render: normalizador compartilhado podia interpretar ISO impossível como intervalo. Guard preserva texto inválido antes da normalização; parser raiz, modelo/prompt e cache bruto não mudam; regressão Parser/worker/cache/hosted e rollout seletivo |
| Matching/Knowledge | plausible_indirect | Parser de datas/cálculo/método vigente não mudam; datas válidas preservadas e data impossível permanece ausente de cálculo útil, conforme contrato; testes resumeDates e diff |

## Execução congelada

Implementar D-01 a D-05 sob P-01/F-01, com A-01. Este acordo incorpora o prompt autorizado. Não há nova referência visual normativa: reutilizar o destaque vermelho existente, acrescentar avisos e resumo sem substituir composição aprovada. AoT registra qualquer limite de render/smoke autenticado real.

Revisão técnica do mapa em 04/10: o render expôs `2024-02-30` interpretado pelo normalizador como intervalo pelos hífens internos. Preservar datas objetivamente inválidas antes da normalização é necessário para D-01/D-02/D-04; a dependência compartilhada exige atualização de Parser e web, sem novo produto/modelo/prompt, sem mudança de interpretação válida ou infraestrutura. Ensino médio mantém a composição vigente; um período preservado com erro/aviso abre o campo existente para correção.
