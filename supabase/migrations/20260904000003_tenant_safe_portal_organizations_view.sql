-- ==============================================================================
-- 20260904000003_tenant_safe_portal_organizations_view.sql
-- Module: Portal Auth Tenant-Safe Least-Privilege Views
-- Standard: Next.js Local Build Gatekeeper QA Approved Specification
-- Migration Version: 20260904000003 (Unique, strictly ordered after 20260904000002)
-- Preflight: Drop views if exists cascade to guarantee type/order compatibility
-- ==============================================================================

-- 1. Helper Function: Get Active Organizations for Authenticated User (SECURITY DEFINER)
create or replace function public.portal_auth_get_my_organizations()
returns table (
  organization_id uuid,
  organization_key text,
  organization_name text,
  status text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select 
    o.id as organization_id,
    o.organization_key,
    o.organization_name,
    o.status,
    coalesce(o.metadata, '{}'::jsonb) as metadata,
    o.created_at,
    o.updated_at
  from portal_auth.organizations o
  join portal_auth.organization_memberships m
    on m.organization_id = o.id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'active';
$$;

-- 2. Helper Function: Get Active Memberships for Authenticated User (SECURITY DEFINER)
create or replace function public.portal_auth_get_my_memberships()
returns table (
  membership_id uuid,
  organization_id uuid,
  organization_key text,
  organization_name text,
  user_id uuid,
  role text,
  status text,
  invited_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public
as $$
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
    on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'active';
$$;

-- 3. Preflight: Safely drop existing views to avoid column order/type conflicts
drop view if exists public.portal_organization_memberships cascade;
drop view if exists public.portal_organizations cascade;

-- 4. Re-create Public Read Surfaces with Secure Tenant-Filtered Barrier Views
create view public.portal_organizations
with (security_barrier = true)
as
select
  organization_id,
  organization_key,
  organization_name,
  status,
  metadata,
  created_at,
  updated_at
from public.portal_auth_get_my_organizations();

create view public.portal_organization_memberships
with (security_barrier = true)
as
select
  membership_id,
  organization_id,
  organization_key,
  organization_name,
  user_id,
  role,
  status,
  invited_by_user_id,
  created_at,
  updated_at
from public.portal_auth_get_my_memberships();

-- 5. Enforce Strict Least-Privilege Access Controls
-- Revoke all permissions from public and anon
revoke all on function public.portal_auth_get_my_organizations() from public, anon;
revoke all on function public.portal_auth_get_my_memberships() from public, anon;
revoke all on table public.portal_organizations from public, anon;
revoke all on table public.portal_organization_memberships from public, anon;

-- Grant EXECUTE and SELECT strictly to authenticated and service_role
grant execute on function public.portal_auth_get_my_organizations() to authenticated, service_role;
grant execute on function public.portal_auth_get_my_memberships() to authenticated, service_role;
grant select on public.portal_organizations to authenticated, service_role;
grant select on public.portal_organization_memberships to authenticated, service_role;
