-- Additive projection only: preserve the existing actor, filters, mutations and ACL.
do $migration$
declare definition text; previous text; replacement text; pair text[];
begin
 definition:=pg_get_functiondef('public.organization_administration(text,uuid,uuid,jsonb,text)'::regprocedure);
 foreach pair slice 1 in array array[
  array[$old$p_contract is distinct from 'organization-administration-1.0.0'$old$,$new$(p_contract is null or p_contract not in ('organization-administration-1.0.0','organization-administration-1.1.0'))$new$],
  array[$old$'id',visible_group.id,'name',visible_group.name,'status',visible_group.status$old$,$new$'id',visible_group.id,'name',visible_group.name,'createdAt',visible_group.created_at,'updatedAt',visible_group.updated_at,'status',visible_group.status$new$],
  array[$old$'id',x.id,'name',x.name,'status',x.status,'groupId',x.group_id$old$,$new$'id',x.id,'name',x.name,'createdAt',x.created_at,'updatedAt',x.updated_at,'status',x.status,'groupId',x.group_id$new$]
 ] loop
  previous:=pair[1];replacement:=pair[2];
  if (length(definition)-length(replace(definition,previous,'')))/length(previous)<>1 then
   raise exception 'Unexpected organization_administration baseline; review before applying sorting projection.';
  end if;
  definition:=replace(definition,previous,replacement);
 end loop;
 execute definition;
end $migration$;
