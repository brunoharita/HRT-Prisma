-- Cover the two foreign keys introduced by the M7.2 v2 release registry.
create index professional_taxonomy_releases_organization_idx
  on public.professional_taxonomy_releases(organization_id)
  where organization_id is not null;

create index professional_taxonomy_releases_publisher_idx
  on public.professional_taxonomy_releases(published_by_auth_user_id)
  where published_by_auth_user_id is not null;
