select
  'portal_auth_schema_exists' as check_name,
  case when exists (
    select 1 from information_schema.schemata where schema_name = 'portal_auth'
  ) then 'PASS' else 'BLOCK' end as status;

select
  'portal_auth_tables_exist' as check_name,
  case when count(*) = 2 then 'PASS' else 'BLOCK' end as status
from information_schema.tables
where table_schema = 'portal_auth'
  and table_name in ('organizations', 'organization_memberships');

select
  'required_org_columns_present' as check_name,
  case when count(*) = 7 then 'PASS' else 'BLOCK' end as status
from information_schema.columns
where table_schema = 'portal_auth'
  and table_name = 'organizations'
  and column_name in ('id', 'organization_key', 'organization_name', 'status', 'metadata', 'created_at', 'updated_at');

select
  'required_membership_columns_present' as check_name,
  case when count(*) = 8 then 'PASS' else 'BLOCK' end as status
from information_schema.columns
where table_schema = 'portal_auth'
  and table_name = 'organization_memberships'
  and column_name in ('id', 'organization_id', 'user_id', 'role', 'status', 'invited_by_user_id', 'created_at', 'updated_at');

select
  'rls_enabled_and_forced' as check_name,
  case when count(*) = 2 then 'PASS' else 'BLOCK' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'portal_auth'
  and c.relname in ('organizations', 'organization_memberships')
  and c.relrowsecurity
  and c.relforcerowsecurity;

select
  'membership_policies_present' as check_name,
  case when count(*) >= 6 then 'PASS' else 'BLOCK' end as status
from pg_policies
where schemaname = 'portal_auth'
  and tablename in ('organizations', 'organization_memberships');

select
  'membership_authority_triggers_present' as check_name,
  case when count(*) = 2 then 'PASS' else 'BLOCK' end as status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'portal_auth'
  and c.relname = 'organization_memberships'
  and t.tgname in ('organization_memberships_reject_identity_change', 'organization_memberships_guard_authority_change');

select
  'helper_functions_present' as check_name,
  case when count(*) = 4 then 'PASS' else 'BLOCK' end as status
from information_schema.routines
where routine_schema = 'portal_auth'
  and routine_name in ('current_user_id', 'is_org_member', 'can_manage_org', 'is_org_owner');

select
  'public_read_views_exist' as check_name,
  case when count(*) = 2 then 'PASS' else 'BLOCK' end as status
from information_schema.views
where table_schema = 'public'
  and table_name in ('portal_organizations', 'portal_organization_memberships');

select
  'anon_has_no_table_grants' as check_name,
  case when not exists (
    select 1
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema in ('portal_auth', 'public')
      and table_name in ('organizations', 'organization_memberships', 'portal_organizations', 'portal_organization_memberships')
  ) then 'PASS' else 'BLOCK' end as status;

select
  'no_public_write_surface' as check_name,
  case when not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('portal_organizations', 'portal_organization_memberships')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) then 'PASS' else 'BLOCK' end as status;
