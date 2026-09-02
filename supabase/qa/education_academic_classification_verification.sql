begin;

do $$
declare
  valid_payload jsonb := '{"education":[{"id":"education_12345678","source":"extracted","course":"Sistemas de Informação","institution":"UNESP","period":"2010 - 2013","description":null,"evidenceText":"Bacharelado em Sistemas de Informação","page":1,"originalText":"Bacharelado em Sistemas de Informação","level":"undergraduate","qualification":"bachelor","status":"unknown","classificationOrigin":"explicit","classificationSources":{"level":"explicit","qualification":"explicit","status":"unknown"},"classificationReasons":["explicit_bachelor_marker"],"classificationMethodVersion":"1.0.0","classificationReviewed":false,"classifierSnapshot":{"course":"Sistemas de Informação","level":"undergraduate","qualification":"bachelor","status":"unknown","classificationOrigin":"explicit","classificationSources":{"level":"explicit","qualification":"explicit","status":"unknown"},"classificationReasons":["explicit_bachelor_marker"],"classificationMethodVersion":"1.0.0"}}]}'::jsonb;
  invalid_payload jsonb;
  historical_payload jsonb := '{"education":[{"id":"education_legacy00000000","source":"extracted","course":"MBA em Gestão","institution":"Universidade QA","period":"2019 - 2020","evidenceText":"MBA em Gestão","page":1}]}'::jsonb;
  reviewed_historical_payload jsonb := '{"education":[{"id":"education_legacy00000000","source":"extracted","course":"MBA em Gestão","institution":"Universidade QA","period":"2019 - 2020","evidenceText":"MBA em Gestão","page":1,"originalText":"MBA em Gestão","level":"postgraduate","qualification":"mba","status":"unknown","classificationOrigin":"human","classificationSources":{"level":"human","qualification":"human","status":"human"},"classificationReasons":["historical_record_without_classification","human_classification_confirmed"],"classificationMethodVersion":"legacy-unclassified","classificationReviewed":true}]}'::jsonb;
begin
  if not private.is_valid_education_classification(valid_payload, true) then raise exception 'valid academic payload was rejected'; end if;
  invalid_payload := jsonb_set(valid_payload, '{education,0,level}', '"technical"'::jsonb);
  if private.is_valid_education_classification(invalid_payload, true) then raise exception 'invalid level and qualification combination was accepted'; end if;
  if not private.is_valid_education_classification(historical_payload, false) then raise exception 'historical payload became unreadable'; end if;
  if private.is_valid_education_classification(historical_payload, true) then raise exception 'historical payload bypassed current write contract'; end if;
  if not private.is_valid_education_classification(reviewed_historical_payload, true) then raise exception 'explicitly reviewed historical payload was rejected'; end if;
  if private.is_approved_education_classification(valid_payload) then raise exception 'unreviewed classification was accepted for publication'; end if;
  if not private.profile_delta_items_match(
    'education',
    '{"id":"old","institution":"UNESP","course":"Bacharelado em Sistemas de Informação"}'::jsonb,
    '{"id":"new","institution":"UNESP","course":"Sistemas de Informação"}'::jsonb
  ) then raise exception 'academic enrichment would duplicate a stable formation'; end if;
  if pg_catalog.has_function_privilege('anon', 'private.is_valid_education_classification(jsonb,boolean)', 'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated', 'private.is_valid_education_classification(jsonb,boolean)', 'EXECUTE')
  then raise exception 'private validator is executable by API roles'; end if;
  if to_regclass('public.education') is not null or to_regclass('public.educations') is not null then raise exception 'parallel education table was created'; end if;
  if private.review_field_record_scope('education.education_legacy00000000.qualification') <> 'education.education_legacy00000000' then raise exception 'academic evidence field is outside its education record scope'; end if;
end;
$$;

select
  private.is_valid_education_classification('{"education":[]}'::jsonb, true) as empty_collection_valid,
  not pg_catalog.has_function_privilege('anon', 'private.is_valid_education_classification(jsonb,boolean)', 'EXECUTE') as anon_denied,
  not pg_catalog.has_function_privilege('authenticated', 'private.is_valid_education_classification(jsonb,boolean)', 'EXECUTE') as authenticated_denied,
  to_regprocedure('private.audit_education_classification_change()') is not null as audit_trigger_function_present;

rollback;
