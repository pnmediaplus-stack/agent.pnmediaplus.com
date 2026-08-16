-- Migration to support array-based lookups for multi-provider aggregation
-- bypassing the unexposed tenant_integration_vault schema via REST.

create or replace function public.phase077_get_all_active_tenant_integrations(
  p_organization_id uuid
)
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
      'integration_key', ti.integration_key,
      'provider_id', ti.provider_id,
      'public_metadata', coalesce(ti.public_metadata, '{}'::jsonb),
      'updated_at', ti.updated_at
    ) order by ti.updated_at desc
  ), '[]'::jsonb)
  into v_result
  from tenant_integration_vault.tenant_integrations ti
  where ti.organization_id = p_organization_id
    and ti.status = 'configured'
    and ti.connection_state = 'healthy';

  return v_result;
end;
$$;

revoke all on function public.phase077_get_all_active_tenant_integrations(uuid) from public, anon, authenticated;
grant execute on function public.phase077_get_all_active_tenant_integrations(uuid) to service_role;

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
  where p.status = 'active';

  return v_result;
end;
$$;

revoke all on function public.phase077_get_active_integration_providers() from public, anon, authenticated;
grant execute on function public.phase077_get_active_integration_providers() to service_role;
