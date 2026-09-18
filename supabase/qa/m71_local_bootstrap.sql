-- Disposable PostgreSQL only. Minimal Supabase platform schemas; application
-- tables, authorization helpers, RLS and RPCs come from actual repo migrations.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin superuser; end if;
end $$;
create schema auth;
create schema storage;
create schema extensions;
create extension pgcrypto with schema extensions;
-- The historical M2 migration uses min(uuid), absent in vanilla PostgreSQL.
-- Local compatibility only; no authorization or application function is replaced.
create function public.m71_uuid_min(uuid,uuid) returns uuid language sql immutable strict as $$ select least($1,$2) $$;
create aggregate public.min(uuid) (sfunc=public.m71_uuid_min,stype=uuid,sortop=operator(<));
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}',
  created_at timestamptz default now(),updated_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select coalesce(auth.jwt()->>'role',current_user) $$;
grant usage on schema auth,storage,extensions,public to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
create publication supabase_realtime;
