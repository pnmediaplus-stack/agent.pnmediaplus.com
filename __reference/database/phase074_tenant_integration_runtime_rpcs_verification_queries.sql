-- Phase 074 Tenant Integration RPC contract verification

select
  'phase074_rpc_functions_exist' as check_name,
  case when count(*) = 3 then 'PASS' else 'BLOCK' end as status,
  count(*) as found_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'phase074_create_tenant_integration',
    'phase074_rotate_tenant_integration',
    'phase074_revoke_tenant_integration'
  )
  and pg_get_function_arguments(p.oid) = 'payload jsonb'
  and pg_get_function_result(p.oid) = 'jsonb';

select
  'phase074_rpc_security_definer' as check_name,
  case when count(*) = 3 then 'PASS' else 'BLOCK' end as status,
  count(*) as security_definer_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'phase074_create_tenant_integration',
    'phase074_rotate_tenant_integration',
    'phase074_revoke_tenant_integration'
  )
  and p.prosecdef = true;

select
  'phase074_rpc_not_executable_by_public_client_roles' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status,
  count(*) as unsafe_execute_grants
from information_schema.routine_privileges rp
where rp.specific_schema = 'public'
  and rp.routine_name in (
    'phase074_create_tenant_integration',
    'phase074_rotate_tenant_integration',
    'phase074_revoke_tenant_integration'
  )
  and rp.privilege_type = 'EXECUTE'
  and rp.grantee in ('PUBLIC', 'anon', 'authenticated');

select
  'phase074_rpc_service_role_execute' as check_name,
  case
    when not exists (select 1 from pg_roles where rolname = 'service_role') then 'PASS_NO_SERVICE_ROLE_ON_INSTANCE'
    when count(*) = 3 then 'PASS'
    else 'BLOCK'
  end as status,
  count(*) as service_role_execute_grants
from information_schema.routine_privileges rp
where rp.specific_schema = 'public'
  and rp.routine_name in (
    'phase074_create_tenant_integration',
    'phase074_rotate_tenant_integration',
    'phase074_revoke_tenant_integration'
  )
  and rp.privilege_type = 'EXECUTE'
  and rp.grantee = 'service_role';

select
  'phase074_private_helpers_exist' as check_name,
  case when count(*) = 4 then 'PASS' else 'BLOCK' end as status,
  count(*) as helper_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'tenant_integration_vault'
  and p.proname in (
    'payload_contains_raw_secret_material',
    'phase074_required_text',
    'phase074_event_hash',
    'phase074_append_audit'
  );

select
  'phase074_private_schema_not_publicly_exposed' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status,
  count(*) as unsafe_schema_usage_grants
from information_schema.usage_privileges
where object_schema = 'tenant_integration_vault'
  and object_type = 'SCHEMA'
  and grantee in ('PUBLIC', 'anon', 'authenticated');

select
  'phase074_secret_tables_no_client_write_grants' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status,
  count(*) as unsafe_table_grants
from information_schema.role_table_grants
where table_schema = 'tenant_integration_vault'
  and table_name in (
    'tenant_integrations',
    'integration_secret_blobs',
    'integration_secret_receipts',
    'integration_access_audit'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

select
  'phase074_rpc_returns_opaque_receipt_contract' as check_name,
  case when count(*) = 3 then 'PASS' else 'BLOCK' end as status,
  count(*) as rpc_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'phase074_create_tenant_integration',
    'phase074_rotate_tenant_integration',
    'phase074_revoke_tenant_integration'
  )
  and pg_get_functiondef(p.oid) ilike '%receipt_ref%'
  and pg_get_functiondef(p.oid) ilike '%receipt_state%'
  and pg_get_functiondef(p.oid) ilike '%NO_SECRET_MATERIAL_RETURNED%';
