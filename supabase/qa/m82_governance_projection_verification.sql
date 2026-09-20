-- Run after the matching setup and the new projection migration in the same
-- disposable transaction. No real Person or production data is modified.
set local role authenticated;
select set_config('request.jwt.claim.sub',m81_id('owner-a')::text,true);
do $$declare projection jsonb;
begin
  projection:=public.load_person_professional_evidence_map_v6(m81_id('org-a'),m81_id('governance-person'));
  perform m81_assert((select count(*)=1 from jsonb_array_elements(projection->'associations') association
    where association#>>'{concept,id}'=m81_id('governance-concept')::text
      and association#>>'{concept,classification,macroGroupCode}'='hard'
      and association#>>'{concept,classification,subgroupCode}'='H4'
      and association->>'nature'='declared'
      and association#>>'{explanation,humanDecision}' is not null
      and association#>>'{evidence,source,fieldPath}'='competencies'
      and association->'verification'='null'::jsonb),
    'human-created concept appears once in Hard/Gestão as a declaration');
  perform m81_assert((select count(*)=0 from jsonb_array_elements(projection->'associations') association
    where association->>'nature' in ('verified_assessment','demonstrated_skill','certified')),
    'creating a concept does not elevate evidence');
  perform m81_assert(projection#>>'{normalization,coverage,uniqueConceptCount}'='1',
    'coverage counts the human-created concept visible in the projection');
  perform m81_assert((select count(*)=1 from jsonb_array_elements(public.load_person_professional_evidence_map_v6(
    m81_id('org-a'),m81_id('governance-person'))->'associations') association
    where association#>>'{concept,id}'=m81_id('governance-concept')::text),
    'refresh remains idempotent');
end $$;
select set_config('request.jwt.claim.sub',m81_id('owner-b')::text,true);
select m81_reject(format('select public.load_person_professional_evidence_map_v6(%L,%L)',
  m81_id('org-a'),m81_id('governance-person')),'42501');
reset role;
