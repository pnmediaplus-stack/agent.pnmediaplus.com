select
  'schema_exists' as check_name,
  case when exists (
    select 1
    from information_schema.schemata
    where schema_name = 'tenant_integration_vault'
  ) then 'PASS' else 'BLOCK' end as status;

select
  'tables_exist' as check_name,
  case when count(*) = 5 then 'PASS' else 'BLOCK' end as status
from information_schema.tables
where table_schema = 'tenant_integration_vault'
  and table_name in (
    'integration_providers',
    'tenant_integrations',
    'integration_secret_blobs',
    'integration_secret_receipts',
    'integration_access_audit'
  );

select
  'rls_enabled_and_forced' as check_name,
  case when count(*) = 5 then 'PASS' else 'BLOCK' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'tenant_integration_vault'
  and c.relname in (
    'integration_providers',
    'tenant_integrations',
    'integration_secret_blobs',
    'integration_secret_receipts',
    'integration_access_audit'
  )
  and c.relrowsecurity
  and c.relforcerowsecurity;

select
  'secret_tables_have_deny_client_policies' as check_name,
  case when count(*) = 3 then 'PASS' else 'BLOCK' end as status
from pg_policies
where schemaname = 'tenant_integration_vault'
  and tablename in ('integration_secret_blobs', 'integration_secret_receipts', 'integration_access_audit')
  and policyname in (
    'integration_secret_blobs_deny_client',
    'integration_secret_receipts_deny_client',
    'integration_access_audit_deny_client'
  );

select
  'public_read_surfaces_exist' as check_name,
  case when count(*) = 2 then 'PASS' else 'BLOCK' end as status
from information_schema.views
where table_schema = 'public'
  and table_name in ('phase070_integration_provider_catalog', 'phase070_tenant_integration_status');

select
  'public_surfaces_do_not_expose_secret_columns' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status
from information_schema.columns
where table_schema = 'public'
  and table_name in ('phase070_integration_provider_catalog', 'phase070_tenant_integration_status')
  and column_name ~* '(secret|cipher|token|receipt|key_ref|key_version|encrypted)';

select
  'public_metadata_secret_key_constraints_present' as check_name,
  case when count(*) = 2 then 'PASS' else 'BLOCK' end as status
from pg_constraint c
join pg_class rel on rel.oid = c.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'tenant_integration_vault'
  and c.conname in (
    'integration_providers_public_metadata_no_secret_keys',
    'tenant_integrations_public_metadata_no_secret_keys'
  );

select
  'no_anon_private_table_grants' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status
from information_schema.role_table_grants
where table_schema = 'tenant_integration_vault'
  and grantee = 'anon';

select
  'no_authenticated_private_write_grants' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status
from information_schema.role_table_grants
where table_schema = 'tenant_integration_vault'
  and grantee = 'authenticated'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

select
  'no_public_write_surface_grants' as check_name,
  case when count(*) = 0 then 'PASS' else 'BLOCK' end as status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('phase070_integration_provider_catalog', 'phase070_tenant_integration_status')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

select
  'secret_blobs_append_only_trigger_present' as check_name,
  case when count(*) = 1 then 'PASS' else 'BLOCK' end as status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'tenant_integration_vault'
  and c.relname = 'integration_secret_blobs'
  and t.tgname = 'integration_secret_blobs_append_only';

select
  'audit_append_only_trigger_present' as check_name,
  case when count(*) = 1 then 'PASS' else 'BLOCK' end as status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'tenant_integration_vault'
  and c.relname = 'integration_access_audit'
  and t.tgname = 'integration_access_audit_append_only';
