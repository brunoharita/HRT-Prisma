# Privacidade e LGPD

## Estado

Privacy by design está definida e refletida na separação de PII, perfil e Storage privado. Base legal, aviso de privacidade, retenção, subprocessadores, operações de titular e auditoria de visualização/exportação ainda não estão aprovados. QA usa apenas fixtures sintéticas.

## Mapa de dados

| Categoria | Natureza | Origem | Finalidade inicial | Persistência atual | Acesso pretendido |
| --- | --- | --- | --- | --- | --- |
| Nome e lifecycle | pessoal | currículo/organização | identificar perfil | JSON local/migration | admin, recruiter, hiring manager limitado |
| E-mail, telefone, localização | pessoal privado | currículo/pessoa | contato autorizado | migration separada; não usada localmente | admin e recruiter |
| Experiência, educação, certificação | pessoal profissional | currículo | estruturar conhecimento | perfil/evidência | papéis autorizados |
| Idioma, ferramentas, competências | pessoal profissional e inferência possível | currículo/regras | busca e matching | perfil/evidência/inferência | papéis autorizados |
| Documento bruto | pessoal | upload | fonte e auditoria | bucket privado `person-documents` em QA | super admin, owner, admin e recruiter no tenant |
| Intake pré-Pessoa | pessoal e técnico | upload | resolver identidade e vínculo | staging tenant-scoped sem texto integral | super admin, owner, admin e recruiter no tenant |
| Evidência espacial | pessoal profissional | seleção humana no PDF | sustentar correção ou complemento | página, região normalizada, método e somente caracteres visualmente contidos | super admin, owner, admin e recruiter no tenant |
| Caso de aprendizado de extração | referência técnica ligada a dado pessoal | correção humana aprovada | avaliação controlada de qualidade | IDs de revisão/evento/campo, status e versões; sem duplicar currículo ou valor | super admin, owner, admin e recruiter no tenant |
| Evento de adaptação | metadado técnico ligado a revisão | aceite humano de sugestões | rastrear método e campos aceitos | IDs, caminhos, página, versão, padrão e código de justificativa; sem valor ou trecho | super admin, owner, admin e recruiter no tenant |
| Padrão de extração organizacional | sinal estrutural não textual | revisão integralmente aprovada | melhorar primeira extração futura no mesmo tenant | chave allowlisted, versão, contagem e timestamps; sem PII ou texto | super admin, owner, admin e recruiter no tenant |
| Avaliação e matching | pessoal derivado | vaga + perfil | apoio à decisão | JSON local/migration | admin, recruiter, hiring manager |
| Telemetria | dado técnico ligado a IDs | sistema | custo e diagnóstico | JSON local/migration | admin/auditoria |

## Dados sensíveis

Currículo não autoriza inferência indiscriminada. Origem racial ou étnica, religião, opinião política, filiação sindical, saúde, vida sexual, biometria, diversidade e outros atributos sensíveis não devem ser extraídos, inferidos, usados em matching ou enviados a modelo sem fundamento jurídico, necessidade legítima, decisão explícita de produto, minimização e controle reforçado.

## Finalidade e base legal

Finalidade atual é prova técnica com fixtures sintéticas. A base legal para candidatos e colaboradores reais deve ser validada por responsável jurídico antes do piloto. Consentimento não deve ser assumido apenas porque existe currículo. Finalidade incompatível exige nova análise.

## Onde persiste

- Local: `.prisma-data`, ignorado pelo Git, somente fixtures representativas.
- Banco planejado: PostgreSQL/Supabase com RLS.
- Documento: Storage privado em QA; metadados e checksum na tabela `documents`.
- Intake currículo-first: o PDF permanece no mesmo Storage privado, sob caminho iniciado por `organization_id`; `resume_intakes` guarda somente metadados, identificação mínima, decisão e erro sanitizado.
- Evidência espacial: o PDF não é duplicado; a região referencia documento e versão. PDF.js e Tesseract.js processam localmente no browser e somente o recorte selecionado pode passar por OCR.
- Embeddings: não implementados; quando existirem, são dados derivados sujeitos ao mesmo tenant, retenção e exclusão.
- Modelos externos: nenhum ativo; provider futuro exige DPA/subprocessador, retenção e região documentados.

## Minimização

Persistir apenas campos necessários à finalidade. Evidência usa trecho mínimo suficiente e limita a seleção persistida a 2.000 caracteres. Logs M5 recebem IDs, ação e versões, não o trecho selecionado. Eventos adaptativos e padrões organizacionais persistem somente metadados estruturais allowlisted. Casos de aprendizado referenciam a correção e só são aprovados junto com a revisão, sem copiar valores ou documento integral. Logs não recebem currículo, prompt completo com PII ou resposta integral. Dados privados ficam separados do perfil consultável.

## Retenção e exclusão

Política temporal está bloqueada por decisão jurídica e comercial. Antes do piloto real, definir por categoria: prazo, gatilho, legal hold, anonimização, deleção de documento, perfil, evidência, inferência, embedding, cache, backup e fornecedor externo.

Exclusão deve localizar registros por pessoa e organização, revogar acessos, remover ou anonimizar derivados conforme obrigação, preservar somente auditoria legalmente necessária e produzir evidência da operação.

## Exportação e correção

Titular deve poder solicitar acesso, correção, exportação e exclusão pelos canais definidos pelo controlador. Correção cria trilha de origem e não reescreve evidência histórica sem registro. Formato de exportação deve ser legível e incluir proveniência e inferências identificadas.

## Anonimização

QA usa fixtures ou dados anonimizados. Anonimização deve considerar texto livre, nomes de empresas, datas, localização, metadados, embeddings e combinações reidentificáveis. Pseudonimização não deve ser chamada de anonimização.

## Acesso e auditoria

`authorization-model.md` define papéis. Antes do piloto, registrar visualização, exportação, alteração, reprocessamento, exclusão e configuração de IA com ator, tenant, alvo, finalidade, timestamp e resultado. Auditoria não contém o dado sensível integral.

## Subprocessadores e fornecedores de IA

Nenhum está aprovado. Antes de ativar: finalidade, categorias enviadas, base legal, contrato/DPA, região, retenção, treinamento, subprocessadores, segurança, exclusão, incidentes e mecanismo de transferência internacional devem ser avaliados.

## Decisões automatizadas

Prisma auxilia, recomenda e explica. Não rejeita, aprova, contrata ou elimina automaticamente. Recomendação, decisão humana e resultado observado são registros separados. Contestação deve permitir revisão humana e acesso à explicação.

Deduplicação é tenant-scoped e conservadora. E-mail ou telefone válidos são sinais fortes; nome é somente sinal possível. O sistema não expõe correspondências cross-tenant, não faz merge automático e não copia currículo integral para auditoria.

## Riscos abertos

- base legal e aviso de privacidade;
- retenção e backup;
- malware scanning e quarentena;
- operações de titular;
- auditoria de acesso;
- validação com dados reais autorizados;
- subprocessador e transferência internacional para futuro provider;
- política de embeddings e anonimização.
