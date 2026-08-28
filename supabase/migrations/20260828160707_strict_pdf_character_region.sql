alter table public.spatial_evidence_regions
  drop constraint spatial_evidence_regions_extraction_method_check;

alter table public.spatial_evidence_regions
  add constraint spatial_evidence_regions_extraction_method_check
  check (extraction_method in (
    'pdfjs-text-layer-v1',
    'pdfjs-character-region-v2',
    'tesseract-region-v1',
    'manual-region-v1'
  ));

alter table public.spatial_evidence_regions
  drop constraint spatial_evidence_regions_contract_version_check;

alter table public.spatial_evidence_regions
  alter column contract_version set default '1.1.0';

alter table public.spatial_evidence_regions
  add constraint spatial_evidence_regions_contract_version_check
  check (contract_version in ('1.0.0', '1.1.0'));

do $$
declare
  function_oid oid;
  function_definition text;
  updated_definition text;
begin
  function_oid := to_regprocedure(
    'private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)'
  );
  if function_oid is null then
    raise exception 'private record evidence function was not found';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  if position('pdfjs-character-region-v2' in function_definition) > 0 then
    return;
  end if;
  if position(
    'pdfjs-text-layer-v1'', ''tesseract-region-v1'', ''manual-region-v1'
    in function_definition
  ) = 0 then
    raise exception 'private record evidence method allowlist has an unexpected shape';
  end if;

  updated_definition := replace(
    function_definition,
    'pdfjs-text-layer-v1'', ''tesseract-region-v1'', ''manual-region-v1',
    'pdfjs-text-layer-v1'', ''pdfjs-character-region-v2'', ''tesseract-region-v1'', ''manual-region-v1'
  );
  execute updated_definition;
end;
$$;
