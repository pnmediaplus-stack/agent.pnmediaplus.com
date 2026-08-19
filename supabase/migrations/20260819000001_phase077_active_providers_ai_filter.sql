-- Update public.phase077_get_active_integration_providers() to filter by provider_category = 'ai'
-- This ensures the RPC only returns AI providers, reducing noise when the catalog expands.

create or replace function public.phase077_get_active_integration_providers()
returns jsonb
language plpgsql
security definer
set search_path = public, tenant_integration_vault, pg_temp
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'provider_code', p.provider_code,
      'public_metadata', coalesce(p.public_metadata, '{}'::jsonb)
    )
  ), '[]'::jsonb)
  into v_result
  from tenant_integration_vault.integration_providers p
  where p.status = 'active'
    and p.provider_category = 'ai';

  return v_result;
end;
$$;

revoke all on function public.phase077_get_active_integration_providers() from public, anon, authenticated;
grant execute on function public.phase077_get_active_integration_providers() to service_role;
