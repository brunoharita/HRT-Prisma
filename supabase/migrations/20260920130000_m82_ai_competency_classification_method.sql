-- M8.2: distinguish assisted taxonomy decisions from source rules and human curation.
-- The nine M8.1 subgroups and taxonomy version remain unchanged.
alter table public.knowledge_competency_classifications
  drop constraint knowledge_competency_classifications_method_check;
alter table public.knowledge_competency_classifications
  add constraint knowledge_competency_classifications_method_check
  check (method in ('contract_example', 'source_type', 'human_curated', 'ai_assisted'));
alter table public.knowledge_competency_classifications
  add constraint knowledge_competency_classifications_ai_provenance_check
  check (method <> 'ai_assisted' or (
    organization_id is null
    and decided_by_auth_user_id is null
    and nullif(btrim(provenance->>'source'), '') is not null
    and nullif(btrim(provenance->>'sourceVersion'), '') is not null
    and nullif(btrim(provenance->>'classifierVersion'), '') is not null
    and nullif(btrim(provenance->>'reason'), '') is not null
  ));

comment on table public.knowledge_competency_classifications is
  'M8.2 versioned classification of a Knowledge concept. ai_assisted decisions retain source, model and reason in provenance; human_curated remains distinct and can supersede automation.';
