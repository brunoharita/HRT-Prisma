-- M8.2: 37 O*NET 31.0 skill concepts; seven broad mixed parent nodes remain pending.
do $m82$
declare
  v_input jsonb := $m82_json$[{"external_id":"O*NET:element:2.A.1.a","category":"S3","reason":"Compreensão e interpretação de informação escrita para formar entendimento."},{"external_id":"O*NET:element:2.A.1.b","category":"S1","reason":"Escuta atenta, perguntas e interação apropriada com outras pessoas."},{"external_id":"O*NET:element:2.A.1.c","category":"S1","reason":"Comunicação eficaz por escrito para um público."},{"external_id":"O*NET:element:2.A.1.d","category":"S1","reason":"Comunicação oral de informações a outras pessoas."},{"external_id":"O*NET:element:2.A.1.e","category":"H1","reason":"Aplicação do domínio matemático para resolver problemas."},{"external_id":"O*NET:element:2.A.1.f","category":"H1","reason":"Aplicação de regras e métodos do domínio científico."},{"external_id":"O*NET:element:2.A.2.a","category":"S3","reason":"Raciocínio lógico para avaliar alternativas, conclusões e abordagens."},{"external_id":"O*NET:element:2.A.2.b","category":"S2","reason":"Autogestão da aprendizagem a partir das implicações de novas informações."},{"external_id":"O*NET:element:2.A.2.c","category":"S2","reason":"Seleção e uso de estratégias para orientar a própria aprendizagem."},{"external_id":"O*NET:element:2.A.2.d","category":"S2","reason":"Acompanhamento e avaliação de desempenho para corrigir e melhorar resultados."},{"external_id":"O*NET:element:2.B.1","category":"S1","reason":"Colaboração e interação com outras pessoas para atingir objetivos de trabalho."},{"external_id":"O*NET:element:2.B.1.a","category":"S1","reason":"Percepção e compreensão das reações de outras pessoas."},{"external_id":"O*NET:element:2.B.1.b","category":"S1","reason":"Ajuste de ações em interação com outras pessoas."},{"external_id":"O*NET:element:2.B.1.c","category":"S1","reason":"Influência interpessoal sobre opiniões ou comportamentos."},{"external_id":"O*NET:element:2.B.1.d","category":"S1","reason":"Mediação e conciliação de diferenças entre pessoas."},{"external_id":"O*NET:element:2.B.1.e","category":"S4","reason":"Ensino e orientação direta de outras pessoas."},{"external_id":"O*NET:element:2.B.1.f","category":"S1","reason":"Foco ativo em ajudar e atender pessoas."},{"external_id":"O*NET:element:2.B.2","category":"S3","reason":"Resolução genérica de problemas novos e desafiadores."},{"external_id":"O*NET:element:2.B.2.i","category":"S3","reason":"Análise, avaliação de opções e implementação para resolver problemas complexos."},{"external_id":"O*NET:element:2.B.3.a","category":"H3","reason":"Método profissional de analisar necessidades e requisitos para criar um desenho."},{"external_id":"O*NET:element:2.B.3.b","category":"H3","reason":"Processo técnico de projetar ou adaptar tecnologia às necessidades de usuários."},{"external_id":"O*NET:element:2.B.3.c","category":"H2","reason":"Seleção de ferramentas e equipamentos concretos necessários ao trabalho."},{"external_id":"O*NET:element:2.B.3.d","category":"H3","reason":"Processo técnico de instalar equipamentos, máquinas, fiação ou programas conforme especificações."},{"external_id":"O*NET:element:2.B.3.e","category":"H3","reason":"Técnica profissional de escrever programas de computador."},{"external_id":"O*NET:element:2.B.3.g","category":"H3","reason":"Procedimento técnico de monitorar indicadores para verificar o funcionamento de máquinas."},{"external_id":"O*NET:element:2.B.3.h","category":"H2","reason":"Controle operacional de equipamentos ou sistemas concretos."},{"external_id":"O*NET:element:2.B.3.j","category":"H2","reason":"Manutenção rotineira de equipamentos e diagnóstico de necessidades de manutenção."},{"external_id":"O*NET:element:2.B.3.k","category":"H3","reason":"Processo técnico de diagnosticar falhas operacionais e definir correções."},{"external_id":"O*NET:element:2.B.3.l","category":"H2","reason":"Reparo de máquinas ou sistemas com ferramentas adequadas."},{"external_id":"O*NET:element:2.B.3.m","category":"H3","reason":"Método profissional de testes e inspeções para avaliar qualidade ou desempenho."},{"external_id":"O*NET:element:2.B.4.e","category":"S3","reason":"Raciocínio para comparar custos, benefícios e escolher ações."},{"external_id":"O*NET:element:2.B.4.g","category":"H3","reason":"Método de análise do funcionamento de sistemas e dos efeitos de mudanças."},{"external_id":"O*NET:element:2.B.4.h","category":"H3","reason":"Processo de avaliar indicadores de sistemas e definir melhorias corretivas."},{"external_id":"O*NET:element:2.B.5.a","category":"S2","reason":"Autogestão e organização do próprio tempo, incluindo coordenação temporal de outros."},{"external_id":"O*NET:element:2.B.5.b","category":"H4","reason":"Gestão estruturada de orçamento, gastos e prestação de contas."},{"external_id":"O*NET:element:2.B.5.c","category":"H4","reason":"Gestão operacional de equipamentos, instalações e materiais."},{"external_id":"O*NET:element:2.B.5.d","category":"S4","reason":"Liderança, motivação, desenvolvimento e direcionamento de pessoas."}]$m82_json$::jsonb;
  v_found integer;
begin
  select count(distinct item.external_id) into v_found
  from jsonb_to_recordset(v_input) as item(external_id text, category text, reason text)
  join public.knowledge_external_mappings mapping on mapping.external_id=item.external_id
  join public.knowledge_sources source on source.id=mapping.source_id and source.name='O*NET'
  join public.knowledge_source_versions source_version on source_version.id=mapping.source_version_id
    and source_version.external_version='31.0' and source_version.import_status='published'
  join public.knowledge_concepts concept on concept.id=mapping.concept_id
    and concept.scope='global' and concept.status='approved'
    and concept.concept_type not in ('occupation','certification');
  if v_found <> jsonb_array_length(v_input) then
    raise exception 'M82_ONET_MAPPING_MISMATCH: found %, expected %', v_found, jsonb_array_length(v_input);
  end if;
  insert into public.knowledge_competency_classifications
    (concept_id,subgroup_id,version,taxonomy_version,method,provenance)
  select distinct on (concept.id)
    concept.id, subgroup.id,
    coalesce((select max(history.version)+1 from public.knowledge_competency_classifications history
      where history.concept_id=concept.id),1),
    'competency-taxonomy-2.0.0','ai_assisted',
    jsonb_build_object('source','O*NET','sourceVersion','31.0','externalId',item.external_id,
      'classifierVersion','prisma-competency-classification-1.1.0','model','gpt-5.6-terra',
      'reason',item.reason,'agreement','M8.2-1.0.0')
  from jsonb_to_recordset(v_input) as item(external_id text,category text,reason text)
  join public.knowledge_external_mappings mapping on mapping.external_id=item.external_id
  join public.knowledge_sources source on source.id=mapping.source_id and source.name='O*NET'
  join public.knowledge_source_versions source_version on source_version.id=mapping.source_version_id
    and source_version.external_version='31.0' and source_version.import_status='published'
  join public.knowledge_concepts concept on concept.id=mapping.concept_id
    and concept.scope='global' and concept.status='approved'
    and concept.concept_type not in ('occupation','certification')
  join public.competency_subgroups subgroup on subgroup.scope='global' and subgroup.status='active'
    and subgroup.code=item.category
  where not exists(select 1 from public.knowledge_competency_classifications current_class
    where current_class.concept_id=concept.id and current_class.is_current)
  order by concept.id,item.external_id;
end $m82$;
