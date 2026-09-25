# M8.3 — Interpretação da trajetória no Score Prisma

Versão 1.0.0. Estado: agreed. Product Owner: Bruno, 2026-09-25. Fonte: discussão de justiça e constância, autorização explícita de implementação completa em main/produção e decisão financeira «siga o parser».

## DEVE

- D-01 — Reutilizar Perfis publicados, Posições versionadas, Knowledge, requisitos e evidências. Preservar pesos 30/20/35/15 e cálculo determinístico; a IA interpreta evidências, não dá pontos.
- D-02 — Interpretar natureza do trabalho com categorias finitas e referências verificáveis. Separar execução de desenvolvimento, análise, liderança e menção contextual. Histórico técnico continua válido; ausência de evidência não significa incapacidade. Não garantir uma ordem entre Bruno e Diego quando os dados não a sustentarem.
- D-03 — Persistir interpretação derivada, isolada por empresa, Perfil, Posição, método, prompt, modelo e fontes usadas. Reabertura e comparação reutilizam a mesma interpretação compatível. Concorrência não produz versões concorrentes nem chamadas duplicadas.
- D-04 — Manter a jornada atual de encontrar, comparar e detalhar Pessoas. Publicar o conjunto estável; mostrar processamento e pendências sem formulário novo. Falha não vira zero nem última posição automática. Diferenças incompletas não representam prioridade segura.
- D-05 — Aplicar a interpretação aos grupos e a área/função, sem equivalência automática nos requisitos. Avaliar piloto de desenvolvimento backend com 12 casos contrastados, variações e chamadas independentes; declarar o limite de validação fora do piloto.
- D-06 — Backend autoriza empresa e versões e constrói contexto mínimo. Não enviar identidade, contatos, empregadores, escolas ou currículo integral como campos da análise. Registrar método, proveniência e códigos operacionais sem PII em logs. Divergência entre leituras independentes impede conclusão competitiva.
- D-07 — Política financeira segue Parser: limites da conta/projeto OpenAI são autoridade financeira; não criar teto monetário paralelo. Preservar timeout, concorrência e reutilização operacional.
- D-08 — Validar localmente antes de produção, documentar limitações, publicar um SHA coerente em main e executar smoke autenticado. Preservar histórico e decisões humanas.

## PROIBIDO

- P-01 — Nota livre da IA, alteração do Perfil/Posição, contratação/rejeição automática, fato inventado, bônus por nome, prestígio, texto longo, idade, características sensíveis, duração ou lacunas da carreira.
- P-02 — Inferir ferramenta específica de outra ferramenta, apagar experiência histórica, tratar cache estável como prova de justiça, reaproveitar avaliação incompatível ou aceitar instruções de currículo.
- P-03 — Misturar tenants, confiar em texto/pontos enviados pelo browser, registrar dados pessoais em logs, substituir autoridade humana por classificação sem evidência.

## FORA DE ESCOPO

- F-01 — Aprendizado por correções humanas, edição manual de notas, reformulação cadastral, alteração dos pesos, validação universal de profissões e novas integrações externas.

## AUTONOMIA

- A-01 — Estender componentes e contratos existentes, rubrica fechada usando faixas atuais de pontos, controles operacionais, persistência derivada, testes e apresentação progressiva. Não adicionar biblioteca sem necessidade.

## PENDÊNCIAS

Nenhuma decisão financeira pendente: resolvida por «siga o parser». Qualquer nova decisão material exige retorno ao Product Owner.

## ACEITE

- CA-D01/D02/D05 — Testes contrastados de execução/gestão/contexto/ausência, requisitos intactos, pesos idênticos, citações válidas, equivalência semântica e variação factual controlada. Testes de modelo não substituem testes determinísticos.
- CA-D03/D06 — Negativos de autorização, fonte/versão divergente, resposta inválida, lease concorrente, replay e isolamento. Duas leituras com divergência não produzem classificação válida.
- CA-D04 — Estados carregando, concluído e indisponível; acesso manual preservado; comparação e reabertura compatíveis; inspeção desktop/mobile.
- CA-D07 — Nenhum contador de orçamento paralelo; falhas do provedor tratadas explicitamente sem repetição financeira ilimitada.
- CA-D08 — Validação proporcional, migrations novas revisadas, deploy e smoke comprovados; limitações e rollback registrados no AoT.

## Mapa de impacto e preservação (antes da implementação)

Baseline local: main 967209240a6eab0acd6bf154f93d2b3dd7ba7165, matching 5.0.0 / score 1.2.0. Baseline de produção histórico desta tarefa: backend v3, Bruno 43/A, Diego 8/B; observação histórica, não critério obrigatório de resultado.

| Área/capacidade | Relação | Mecanismo | Regressão |
| --- | --- | --- | --- |
| Matching e score | direct | Interpretação derivada de área/função e grupos no piloto | Rubrica, determinismo, casos negativos, requisitos/pesos preservados |
| Busca/comparação/detalhe | direct | Consumo da interpretação versionada | Conjunto estável, estados degradados, reabertura e mobile |
| Auth/RLS/PII | critical_transversal | Nova leitura de fontes e cache backend | SQL negativo, isolamento, autenticação e contexto mínimo |
| Knowledge | plausible_indirect | Proveniência e versões existentes preservadas; sem curadoria nova | Invalidação e nenhuma mutação de conceitos |
| Verificações M6.2 | plausible_indirect | Nova versão do snapshot de matching | Aceite explícito da nova versão; requisitos exatos e decisão humana preservados |
| Parser/publicação de Perfil | no_impact_identified | Apenas leitura de Perfil já publicado; política financeira reutilizada sem tocar Parser | Diff e contrato sem escrita em fontes |
| Deploy/release | direct | Nova migration, Edge e web | Plano de destinos, build, smoke e sincronização |

Sem referência visual normativa para esta melhoria; screenshot de importação é exemplo histórico de erro, não alvo de redesenho.

## Compatibilidade

Este acordo supersede somente a proibição de LLM/persistência derivada e a interpretação área/função/grupo do acordo M6.1 no piloto M8.3. Requisitos, pesos, verificações e decisões humanas permanecem. Fora do piloto, método anterior identificado explicitamente. Snapshots anteriores continuam legíveis e não são reescritos.
