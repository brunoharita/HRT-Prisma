-- M7.2: read-only, versioned projection of published Person evidence onto M7.1 Knowledge concepts.
-- The projection never imports Position requirements and never writes Person knowledge.

create function private.m72_require_profile_reader(p_organization_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null
    or not exists (select 1 from public.organizations item where item.id = p_organization_id)
    or not (
      private.is_super_admin(v_actor)
      or private.has_org_role(p_organization_id, array['owner','admin','recruiter','member']::public.membership_role[])
    ) then
    raise exception 'PERSON_PROFESSIONAL_EVIDENCE_UNAUTHORIZED' using errcode = '42501';
  end if;
  return v_actor;
end;
$$;

revoke all on function private.m72_require_profile_reader(uuid) from public, anon, authenticated;

create function public.load_person_professional_evidence_map(
  p_organization_id uuid,
  p_person_id uuid
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.professional_profiles;
  v_declared jsonb := '[]'::jsonb;
  v_profile_competencies jsonb := '[]'::jsonb;
  v_demonstrated jsonb := '[]'::jsonb;
  v_issues jsonb := '[]'::jsonb;
begin
  perform private.m72_require_profile_reader(p_organization_id);

  select profile.* into v_profile
  from public.professional_profiles profile
  where profile.organization_id = p_organization_id
    and profile.person_id = p_person_id
    and profile.superseded_at is null
    and profile.review_status = 'approved'
  order by profile.profile_version desc, profile.created_at desc
  limit 1;

  if v_profile.id is null then
    raise exception 'PERSON_PUBLISHED_PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'observation:' || observation.id::text,
    'nature', 'declared',
    'concept', jsonb_build_object(
      'id', concept.id,
      'label', concept.canonical_label,
      'type', concept.concept_type,
      'scope', concept.scope,
      'version', concept.version
    ),
    'observedTerm', observation.original_term,
    'evidence', jsonb_build_object(
      'id', coalesce(evidence.id::text, evidence_link.id::text, observation.id::text),
      'title', observation.original_term,
      'fact', coalesce(evidence.fact, 'Competência declarada no Perfil publicado.'),
      'quote', coalesce(region.selected_text, evidence.quoted_text, observation.original_term),
      'recordedAt', coalesce(observation.resolved_at, observation.created_at),
      'source', jsonb_build_object(
        'kind', case when evidence.document_id is not null or region.document_id is not null or observation.source_snapshot ? 'documentId' then 'document' else 'published_profile' end,
        'label', coalesce(document.filename, observation.source_snapshot ->> 'filename', 'Perfil publicado v' || v_profile.profile_version::text),
        'documentId', coalesce(evidence.document_id::text, region.document_id::text, observation.source_snapshot ->> 'documentId'),
        'filename', coalesce(document.filename, observation.source_snapshot ->> 'filename'),
        'pageNumber', coalesce(region.page_number, evidence.source_page),
        'fieldPath', observation.source_field_path,
        'reviewId', coalesce(observation.review_id, evidence_link.review_id, region.review_id)::text,
        'evidenceLinkId', evidence_link.id,
        'spatialRegionId', region.id
      )
    ),
    'explanation', jsonb_build_object(
      'method', case observation.normalization_method
        when 'organization_exact' then 'Termo explícito associado por alias aprovado da Knowledge da empresa.'
        when 'global_exact' then 'Termo explícito associado por alias aprovado da Knowledge Global Prisma.'
        else observation.normalization_method end,
      'methodVersion', observation.resolution_method_version,
      'taxonomyVersion', 'position-taxonomy-1.0.0',
      'knowledgeGlobalVersion', observation.knowledge_global_version,
      'knowledgeOrganizationVersion', observation.knowledge_organization_version,
      'sourceName', source.name,
      'sourceVersion', source_version.external_version,
      'humanDecision', case when observation.resolved_by_auth_user_id is not null then 'Resolução confirmada por operador autorizado.' else null end
    ),
    'verification', null
  ) order by concept.concept_type, concept.canonical_label, observation.created_at), '[]'::jsonb)
  into v_declared
  from public.knowledge_observations observation
  join public.knowledge_concepts concept on concept.id = observation.concept_id
  left join public.evidence evidence
    on evidence.organization_id = observation.organization_id and evidence.id = observation.evidence_id
  left join public.profile_review_evidence_links evidence_link
    on evidence_link.organization_id = observation.organization_id and evidence_link.id = observation.evidence_link_id
  left join public.spatial_evidence_regions region
    on region.organization_id = observation.organization_id and region.id = evidence_link.spatial_region_id
  left join public.documents document
    on document.organization_id = observation.organization_id
   and document.id = coalesce(evidence.document_id, region.document_id)
  left join public.knowledge_source_versions source_version
    on source_version.id = observation.resolution_source_version_id
  left join public.knowledge_sources source on source.id = source_version.source_id
  where observation.organization_id = p_organization_id
    and observation.person_id = p_person_id
    and observation.profile_id = v_profile.id
    and observation.resolution_state = 'resolved'
    and observation.resolution_method_version = 'knowledge-normalization-2.0.0'
    and concept.status = 'approved'
    and (concept.scope = 'global' or concept.organization_id = p_organization_id)
    and (observation.resolution_source_version_id is null or source_version.import_status = 'published');

  -- Compatibility path for versioned profile_competencies. Exact Knowledge resolution is required;
  -- contextual inference remains separate from an explicit declaration and never becomes verification.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'profile-competency:' || profile_competency.id::text,
    'nature', case profile_competency.classification when 'inferred' then 'contextual' else 'declared' end,
    'concept', jsonb_build_object(
      'id', resolution.concept_id,
      'label', resolution.concept_label,
      'type', resolution.concept_type,
      'scope', resolution.resolution_scope,
      'version', concept.version
    ),
    'observedTerm', competency.normalized_name,
    'evidence', jsonb_build_object(
      'id', profile_competency.id,
      'title', competency.normalized_name,
      'fact', case profile_competency.classification when 'inferred'
        then 'Relação contextual registrada no Perfil publicado.'
        else 'Competência explícita registrada no Perfil publicado.' end,
      'quote', null,
      'recordedAt', profile_competency.created_at,
      'source', jsonb_build_object(
        'kind', 'published_profile',
        'label', 'Perfil publicado v' || v_profile.profile_version::text,
        'documentId', v_profile.source_document_id,
        'filename', null,
        'pageNumber', null,
        'fieldPath', 'competencies',
        'reviewId', v_profile.review_id,
        'evidenceLinkId', null,
        'spatialRegionId', null
      )
    ),
    'explanation', jsonb_build_object(
      'method', case profile_competency.classification when 'inferred'
        then 'Relação contextual preservada separadamente da declaração.'
        else 'Declaração explícita preservada no Perfil publicado.' end,
      'methodVersion', v_profile.inference_version,
      'taxonomyVersion', 'position-taxonomy-1.0.0',
      'knowledgeGlobalVersion', resolution.global_version,
      'knowledgeOrganizationVersion', resolution.organization_version,
      'sourceName', resolution.source_name,
      'sourceVersion', source_version.external_version,
      'humanDecision', null
    ),
    'verification', null
  ) order by resolution.concept_type, resolution.concept_label, profile_competency.created_at), '[]'::jsonb)
  into v_profile_competencies
  from public.profile_competencies profile_competency
  join public.competencies competency
    on competency.organization_id = profile_competency.organization_id
   and competency.id = profile_competency.competency_id
  cross join lateral public.resolve_knowledge_term_v2(p_organization_id, competency.normalized_name, 'pt-BR') resolution
  join public.knowledge_concepts concept on concept.id = resolution.concept_id
  left join public.knowledge_source_versions source_version on source_version.id = resolution.source_version_id
  where profile_competency.organization_id = p_organization_id
    and profile_competency.profile_id = v_profile.id
    and resolution.resolution_state = 'resolved'
    and concept.status = 'approved'
    and (concept.scope = 'global' or concept.organization_id = p_organization_id)
    and (profile_competency.classification = 'inferred' or not exists (
      select 1 from public.knowledge_observations observation
      where observation.organization_id = p_organization_id
        and observation.profile_id = v_profile.id
        and observation.concept_id = resolution.concept_id
        and observation.resolution_state = 'resolved'
    ));

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'demonstrated:' || demonstrated.id::text,
    'nature', 'demonstrated',
    'concept', jsonb_build_object(
      'id', resolution.concept_id,
      'label', resolution.concept_label,
      'type', resolution.concept_type,
      'scope', resolution.resolution_scope,
      'version', concept.version
    ),
    'observedTerm', need.competency_label,
    'evidence', jsonb_build_object(
      'id', demonstrated.id,
      'title', 'Evidência Demonstrada: ' || need.competency_label,
      'fact', 'Resultado direto registrado pelo contrato vigente de Verificação de Competências.',
      'quote', null,
      'recordedAt', demonstrated.verified_at,
      'source', jsonb_build_object(
        'kind', 'demonstrated_evidence',
        'label', 'Verificação de Competências',
        'documentId', null,
        'filename', null,
        'pageNumber', null,
        'fieldPath', null,
        'reviewId', null,
        'evidenceLinkId', null,
        'spatialRegionId', null
      )
    ),
    'explanation', jsonb_build_object(
      'method', 'Resultado direto M5.1 associado por termo exato e inequívoco da Knowledge publicada.',
      'methodVersion', 'demonstrated-evidence-1.0.0',
      'taxonomyVersion', 'position-taxonomy-1.0.0',
      'knowledgeGlobalVersion', resolution.global_version,
      'knowledgeOrganizationVersion', resolution.organization_version,
      'sourceName', resolution.source_name,
      'sourceVersion', source_version.external_version,
      'humanDecision', null
    ),
    'verification', jsonb_build_object(
      'status', case when demonstrated.status = 'active' and demonstrated.valid_until is not null and demonstrated.valid_until <= now()
        then 'expired' else demonstrated.status end,
      'qualifiesAsVerified', demonstrated.status = 'active'
        and (demonstrated.valid_until is null or demonstrated.valid_until > now())
        and demonstrated.demonstrated_level in ('basic','intermediate','advanced'),
      'demonstratedLevel', demonstrated.demonstrated_level,
      'validUntil', demonstrated.valid_until,
      'evaluationVersion', demonstrated.evaluation_version,
      'integrityRuleVersion', demonstrated.integrity_rule_version
    )
  ) order by resolution.concept_type, resolution.concept_label, demonstrated.verified_at desc), '[]'::jsonb)
  into v_demonstrated
  from public.competency_demonstrated_evidence demonstrated
  join public.verification_needs need
    on need.organization_id = demonstrated.organization_id
   and need.id = demonstrated.verification_need_id
  cross join lateral public.resolve_knowledge_term_v2(p_organization_id, need.competency_label, 'pt-BR') resolution
  join public.knowledge_concepts concept on concept.id = resolution.concept_id
  left join public.knowledge_source_versions source_version on source_version.id = resolution.source_version_id
  where demonstrated.organization_id = p_organization_id
    and demonstrated.person_id = p_person_id
    and resolution.resolution_state = 'resolved'
    and concept.status = 'approved'
    and (concept.scope = 'global' or concept.organization_id = p_organization_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', case
      when observation.resolution_method_version <> 'knowledge-normalization-2.0.0' then 'incompatible'
      when observation.resolution_state = 'ambiguous' then 'ambiguous'
      when observation.resolution_state = 'unresolved' then 'unresolved'
      else 'source_unavailable' end,
    'observedTerm', observation.original_term,
    'explanation', case
      when observation.resolution_method_version <> 'knowledge-normalization-2.0.0' then 'A associação usa uma versão de normalização incompatível e foi omitida.'
      when observation.resolution_state = 'ambiguous' then 'Mais de um conceito publicado é possível; nenhuma escolha silenciosa foi feita.'
      when observation.resolution_state = 'unresolved' then 'Nenhum conceito publicado sustenta esta associação no momento.'
      else 'O conceito ou a versão de origem não está disponível para reconstrução segura.' end
  ) order by observation.original_term), '[]'::jsonb)
  into v_issues
  from public.knowledge_observations observation
  left join public.knowledge_concepts concept on concept.id = observation.concept_id
  left join public.knowledge_source_versions source_version on source_version.id = observation.resolution_source_version_id
  where observation.organization_id = p_organization_id
    and observation.person_id = p_person_id
    and observation.profile_id = v_profile.id
    and (
      observation.resolution_state <> 'resolved'
      or observation.resolution_method_version <> 'knowledge-normalization-2.0.0'
      or concept.id is null
      or concept.status <> 'approved'
      or (concept.scope = 'organization' and concept.organization_id is distinct from p_organization_id)
      or (observation.resolution_source_version_id is not null and (source_version.id is null or source_version.import_status <> 'published'))
    );

  return jsonb_build_object(
    'contractVersion', 'person-professional-evidence-1.0.0',
    'taxonomyContractVersion', 'position-taxonomy-1.0.0',
    'organizationId', p_organization_id,
    'personId', p_person_id,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'version', v_profile.profile_version,
      'publishedAt', coalesce(v_profile.approved_at, v_profile.created_at),
      'inferenceVersion', v_profile.inference_version
    ),
    'associations', v_declared || v_profile_competencies || v_demonstrated,
    'issues', v_issues
  );
end;
$$;

revoke all on function public.load_person_professional_evidence_map(uuid, uuid) from public, anon;
grant execute on function public.load_person_professional_evidence_map(uuid, uuid) to authenticated;
