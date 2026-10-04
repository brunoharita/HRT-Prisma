-- review-field-format-1.0.0. Diagnostics only: never persist inferred dates.
-- Gate human save/approval, preserving ingestion, immutable history and replay.
begin;
create or replace function private.review_format_date(p_text text, p_boundary text default 'single')
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  t text; m text[]; year_text text; y integer; mo integer; dy integer;
  last_day integer; result_date date; pattern text; month_index integer := 0;
begin
  t := regexp_replace(pg_catalog.normalize(lower(coalesce(p_text,'')),'NFD'),U&'[\0300-\036f]','','g');
  t := regexp_replace(t,'([0-9])\.([0-9])','\1/\2','g');
  -- Overlapping numeric dots, e.g. 31.02.2024.
  t := regexp_replace(t,'([0-9])\.([0-9])','\1/\2','g');
  t := replace(t,'.','');
  t := regexp_replace(t,'\s+de\s+',' ','g');
  t := btrim(regexp_replace(t,'\s+',' ','g'));
  m := regexp_match(t,'^([0-9]{4})-([0-9]{1,2})(?:-([0-9]{1,2}))?$');
  if m is not null then year_text:=m[1]; mo:=m[2]::integer; dy:=m[3]::integer;
  else
    m := regexp_match(t,'^(?:([0-9]{1,2})[/-])?([0-9]{1,2})[/-]([0-9]{4}|[0-9]{2})$');
    if m is not null then year_text:=m[3]; mo:=m[2]::integer; dy:=m[1]::integer;
    else
      m := regexp_match(t,'^(?:([0-9]{1,2})\s+)?([a-z]+)[ /-]([0-9]{4}|[0-9]{2})$');
      if m is not null then
        foreach pattern in array array[
          'jan(?:eiro|uary)?','(?:fev(?:ereiro)?|feb(?:ruary)?)','mar(?:co|ch)?',
          '(?:abr(?:il)?|apr(?:il)?)','(?:mai(?:o)?|may)','jun(?:ho|e)?','jul(?:ho|y)?',
          '(?:ago(?:sto)?|aug(?:ust)?)','(?:set(?:embro)?|sep(?:t(?:ember)?)?)',
          '(?:out(?:ubro)?|oct(?:ober)?)','nov(?:embro|ember)?','(?:dez(?:embro)?|dec(?:ember)?)'
        ] loop
          month_index:=month_index+1;
          if m[2] ~ ('^'||pattern||'$') then mo:=month_index; exit; end if;
        end loop;
        if mo is null then return jsonb_build_object('kind','unknown'); end if;
        year_text:=m[3]; dy:=m[1]::integer;
      elsif t ~ '^(?:[0-9]{4}|[0-9]{2})$' then year_text:=t;
      else return jsonb_build_object('kind','unknown'); end if;
    end if;
  end if;
  y:=year_text::integer;
  if length(year_text)=2 then y:=y+case when y<=50 then 2000 else 1900 end; end if;
  mo:=coalesce(mo,case when p_boundary='end' then 12 else 1 end);
  if y<1000 or y>9999 or mo<1 or mo>12 then return jsonb_build_object('kind','invalid'); end if;
  last_day:=extract(day from (make_date(y,mo,1)+interval '1 month'-interval '1 day'))::integer;
  dy:=coalesce(dy,case when p_boundary='end' then last_day else 1 end);
  if dy<1 or dy>last_day then return jsonb_build_object('kind','invalid'); end if;
  result_date:=make_date(y,mo,dy);
  return jsonb_build_object('kind','valid','value',to_char(result_date,'YYYY-MM-DD'));
end $$;

create or replace function private.review_period_format_error(p_text text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  t text; left_text text; right_text text; probe jsonb; start_date jsonb; end_date jsonb;
  separator text; pos integer; is_current boolean;
  current_pattern constant text := '^(?:atual|presente|present|current|hoje|today|ate (?:o momento|hoje)|to date)$';
begin
  if p_text is null or btrim(p_text)='' or length(btrim(p_text))>160 then return null; end if;
  t:=btrim(regexp_replace(btrim(p_text),'\s*\([^)]*\m(?:anos?|meses?|years?|months?)\M[^)]*\)\s*$','','i'));
  t:=btrim(regexp_replace(t,'^\((.*)\)$','\1'));
  t:=regexp_replace(pg_catalog.normalize(lower(t),'NFD'),U&'[\0300-\036f]','','g');
  if t ~ current_pattern then return null; end if;
  probe:=private.review_format_date(t);
  if probe->>'kind'='valid' then return null; end if;
  if probe->>'kind'='invalid' then return 'review_period_invalid_date'; end if;
  -- Try each separator; ISO internal hyphens must not become range boundaries.
  for pos in 1..length(t) loop
    separator:=substring(substring(t from pos) from '^(?:\s+(?:a|ate|to)\s+|\s*[-–—]\s*)');
    if separator is null then continue; end if;
    left_text:=btrim(substring(t from 1 for pos-1));
    right_text:=btrim(substring(t from pos+length(separator)));
    start_date:=private.review_format_date(left_text,'start');
    is_current:=right_text ~ current_pattern;
    end_date:=private.review_format_date(right_text,'end');
    if start_date->>'kind'='unknown' or (not is_current and end_date->>'kind'='unknown') then continue; end if;
    if start_date->>'kind'='invalid' or (not is_current and end_date->>'kind'='invalid') then return 'review_period_invalid_date'; end if;
    if not is_current and end_date->>'value'<start_date->>'value' then return 'review_period_reversed'; end if;
    return null;
  end loop;
  return null; -- Ambiguous/missing evidence is advisory, never a negative fact.
end $$;

create or replace function private.assert_review_period_formats(p_data jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare
  group_name text; entity_kind text; item record; reason text; segment text; legacy text[];
begin
  foreach group_name in array array['experiences','education'] loop
    if jsonb_typeof(p_data->group_name) is distinct from 'array' then continue; end if;
    entity_kind:=case group_name when 'experiences' then 'experience' else 'education' end;
    for item in select value,ordinality from jsonb_array_elements(p_data->group_name) with ordinality loop
      reason:=private.review_period_format_error(item.value->>'period');
      if reason is null then continue; end if;
      segment:=coalesce(item.value->>'id',(item.ordinality-1)::text);
      legacy:=regexp_match(segment,'^'||entity_kind||'_legacy([0-9]{8})(?:[a-z0-9]+)?$');
      if legacy is not null then segment:=(legacy[1]::integer)::text; end if;
      perform private.raise_review_action_required(reason,group_name||'.'||segment||'.period',item.ordinality::integer);
    end loop;
  end loop;
end $$;
revoke all on function private.review_format_date(text,text), private.review_period_format_error(text), private.assert_review_period_formats(jsonb) from public,anon,authenticated;

do $$
declare definition text; marker text;
begin
  definition:=pg_get_functiondef('public.save_profile_review(uuid,uuid,integer,jsonb,text,text)'::regprocedure);
  marker:='  next_revision := review.lock_version + 1;';
  if strpos(definition,'private.assert_review_period_formats')=0 then
    if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'save_profile_review format gate insertion point changed'; end if;
    execute replace(definition,marker,'  perform private.assert_review_period_formats(p_reviewed_data);'||chr(10)||marker);
  end if;
  definition:=pg_get_functiondef('public.approve_profile_review(uuid,uuid,integer,text)'::regprocedure);
  marker:='  perform 1 from public.people item';
  if strpos(definition,'private.assert_review_period_formats')=0 then
    if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'approve_profile_review format gate insertion point changed'; end if;
    execute replace(definition,marker,'  perform private.assert_review_period_formats(review.reviewed_data);'||chr(10)||marker);
  end if;
end $$;
commit;
