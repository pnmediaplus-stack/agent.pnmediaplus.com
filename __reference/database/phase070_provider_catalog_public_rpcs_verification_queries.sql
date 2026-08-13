select
  proname as function_name,
  prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'phase070_upsert_integration_provider',
    'phase070_delete_integration_provider'
  )
order by proname;

select
  provider_code,
  provider_name,
  status,
  public_metadata
from tenant_integration_vault.integration_providers
where provider_code = 'groq_ai';
