begin;

create extension if not exists pgcrypto;

create schema if not exists portal_auth;
revoke all on schema portal_auth from public;

create table if not exists portal_auth.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_key text not null unique,
  organization_name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_key_format
    check (organization_key ~ '^[a-z0-9_]+$'),
  constraint organizations_name_check
    check (btrim(organization_name) <> ''),
  constraint organizations_status_check
    check (status in ('active', 'suspended', 'archived')),
  constraint organizations_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists portal_auth.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references portal_auth.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null,
  status text not null default 'active',
  invited_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_unique_user_org
    unique (organization_id, user_id),
  constraint organization_memberships_role_check
    check (role in ('owner', 'admin', 'member', 'viewer')),
  constraint organization_memberships_status_check
    check (status in ('active', 'invited', 'suspended', 'revoked'))
);

create index if not exists organizations_status_created_at_idx
  on portal_auth.organizations (status, created_at desc);

create index if not exists organization_memberships_user_status_idx
  on portal_auth.organization_memberships (user_id, status);

create index if not exists organization_memberships_org_role_status_idx
  on portal_auth.organization_memberships (organization_id, role, status);

create or replace function portal_auth.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = portal_auth, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function portal_auth.reject_membership_identity_change()
returns trigger
language plpgsql
security definer
set search_path = portal_auth, pg_temp
as $$
begin
  if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
    raise exception 'PORTAL_AUTH_MEMBERSHIP_IDENTITY_CHANGE_FORBIDDEN'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function portal_auth.guard_membership_authority_change()
returns trigger
language plpgsql
security definer
set search_path = portal_auth, pg_temp
as $$
declare
  v_active_owner_count integer;
begin
  if tg_op = 'UPDATE' then
    if (old.role = 'owner' or new.role = 'owner')
       and not portal_auth.is_org_owner(old.organization_id) then
      raise exception 'PORTAL_AUTH_OWNER_ROLE_CHANGE_REQUIRES_OWNER'
        using errcode = 'P0001';
    end if;

    if old.role = 'owner'
       and old.status = 'active'
       and (new.role <> 'owner' or new.status <> 'active') then
      select count(*)
      into v_active_owner_count
      from portal_auth.organization_memberships m
      where m.organization_id = old.organization_id
        and m.role = 'owner'
        and m.status = 'active';

      if v_active_owner_count <= 1 then
        raise exception 'PORTAL_AUTH_LAST_ACTIVE_OWNER_REQUIRED'
          using errcode = 'P0001';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' and not portal_auth.is_org_owner(old.organization_id) then
      raise exception 'PORTAL_AUTH_OWNER_DELETE_REQUIRES_OWNER'
        using errcode = 'P0001';
    end if;

    if old.role = 'owner' and old.status = 'active' then
      select count(*)
      into v_active_owner_count
      from portal_auth.organization_memberships m
      where m.organization_id = old.organization_id
        and m.role = 'owner'
        and m.status = 'active';

      if v_active_owner_count <= 1 then
        raise exception 'PORTAL_AUTH_LAST_ACTIVE_OWNER_REQUIRED'
          using errcode = 'P0001';
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists organizations_touch_updated_at on portal_auth.organizations;
create trigger organizations_touch_updated_at
before update on portal_auth.organizations
for each row execute function portal_auth.touch_updated_at();

drop trigger if exists organization_memberships_touch_updated_at on portal_auth.organization_memberships;
create trigger organization_memberships_touch_updated_at
before update on portal_auth.organization_memberships
for each row execute function portal_auth.touch_updated_at();

drop trigger if exists organization_memberships_reject_identity_change on portal_auth.organization_memberships;
create trigger organization_memberships_reject_identity_change
before update on portal_auth.organization_memberships
for each row execute function portal_auth.reject_membership_identity_change();

drop trigger if exists organization_memberships_guard_authority_change on portal_auth.organization_memberships;
create trigger organization_memberships_guard_authority_change
before update or delete on portal_auth.organization_memberships
for each row execute function portal_auth.guard_membership_authority_change();

create or replace function portal_auth.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = portal_auth, pg_temp
as $$
  select auth.uid();
$$;

create or replace function portal_auth.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = portal_auth, pg_temp
as $$
  select exists (
    select 1
    from portal_auth.organization_memberships m
    join portal_auth.organizations o
      on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = portal_auth.current_user_id()
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

create or replace function portal_auth.can_manage_org(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = portal_auth, pg_temp
as $$
  select exists (
    select 1
    from portal_auth.organization_memberships m
    join portal_auth.organizations o
      on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = portal_auth.current_user_id()
      and m.role in ('owner', 'admin')
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

create or replace function portal_auth.is_org_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = portal_auth, pg_temp
as $$
  select exists (
    select 1
    from portal_auth.organization_memberships m
    join portal_auth.organizations o
      on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = portal_auth.current_user_id()
      and m.role = 'owner'
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

do $$
begin
  revoke all on function portal_auth.current_user_id() from public;
  revoke all on function portal_auth.is_org_member(uuid) from public;
  revoke all on function portal_auth.can_manage_org(uuid) from public;
  revoke all on function portal_auth.is_org_owner(uuid) from public;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function portal_auth.current_user_id() to authenticated;
    grant execute on function portal_auth.is_org_member(uuid) to authenticated;
    grant execute on function portal_auth.can_manage_org(uuid) to authenticated;
    grant execute on function portal_auth.is_org_owner(uuid) to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function portal_auth.current_user_id() to service_role;
    grant execute on function portal_auth.is_org_member(uuid) to service_role;
    grant execute on function portal_auth.can_manage_org(uuid) to service_role;
    grant execute on function portal_auth.is_org_owner(uuid) to service_role;
  end if;
end $$;

alter table portal_auth.organizations enable row level security;
alter table portal_auth.organization_memberships enable row level security;
alter table portal_auth.organizations force row level security;
alter table portal_auth.organization_memberships force row level security;

drop policy if exists organizations_select_by_membership on portal_auth.organizations;
create policy organizations_select_by_membership
  on portal_auth.organizations
  for select
  to authenticated
  using (portal_auth.is_org_member(id));

drop policy if exists organizations_update_by_manager on portal_auth.organizations;
create policy organizations_update_by_manager
  on portal_auth.organizations
  for update
  to authenticated
  using (portal_auth.can_manage_org(id))
  with check (portal_auth.can_manage_org(id));

drop policy if exists organization_memberships_select_by_org_membership on portal_auth.organization_memberships;
create policy organization_memberships_select_by_org_membership
  on portal_auth.organization_memberships
  for select
  to authenticated
  using (portal_auth.is_org_member(organization_id));

drop policy if exists organization_memberships_insert_by_org_manager on portal_auth.organization_memberships;
create policy organization_memberships_insert_by_org_manager
  on portal_auth.organization_memberships
  for insert
  to authenticated
  with check (
    portal_auth.can_manage_org(organization_id)
    and (role <> 'owner' or portal_auth.is_org_owner(organization_id))
  );

drop policy if exists organization_memberships_update_by_org_manager on portal_auth.organization_memberships;
create policy organization_memberships_update_by_org_manager
  on portal_auth.organization_memberships
  for update
  to authenticated
  using (portal_auth.can_manage_org(organization_id))
  with check (
    portal_auth.can_manage_org(organization_id)
    and (role <> 'owner' or portal_auth.is_org_owner(organization_id))
  );

drop policy if exists organization_memberships_delete_by_org_owner on portal_auth.organization_memberships;
create policy organization_memberships_delete_by_org_owner
  on portal_auth.organization_memberships
  for delete
  to authenticated
  using (portal_auth.is_org_owner(organization_id));

do $$
begin
  revoke all on table portal_auth.organizations from public;
  revoke all on table portal_auth.organization_memberships from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table portal_auth.organizations from anon;
    revoke all on table portal_auth.organization_memberships from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema portal_auth to authenticated;
    grant select, update on portal_auth.organizations to authenticated;
    grant select, insert, update, delete on portal_auth.organization_memberships to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema portal_auth to service_role;
    grant select, insert, update, delete on portal_auth.organizations to service_role;
    grant select, insert, update, delete on portal_auth.organization_memberships to service_role;
  end if;
end $$;

create or replace view public.portal_organizations
with (security_invoker = true)
as
select
  id as organization_id,
  organization_key,
  organization_name,
  status,
  metadata,
  created_at,
  updated_at
from portal_auth.organizations;

create or replace view public.portal_organization_memberships
with (security_invoker = true)
as
select
  m.id as membership_id,
  m.organization_id,
  o.organization_key,
  o.organization_name,
  m.user_id,
  m.role,
  m.status,
  m.invited_by_user_id,
  m.created_at,
  m.updated_at
from portal_auth.organization_memberships m
join portal_auth.organizations o
  on o.id = m.organization_id;

do $$
begin
  revoke all on table public.portal_organizations from public;
  revoke all on table public.portal_organization_memberships from public;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.portal_organizations to authenticated;
    grant select on public.portal_organization_memberships to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.portal_organizations to service_role;
    grant select on public.portal_organization_memberships to service_role;
  end if;
end $$;

commit;
