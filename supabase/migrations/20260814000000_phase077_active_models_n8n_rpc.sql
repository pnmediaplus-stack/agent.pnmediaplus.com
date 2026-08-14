-- Phase 077: N8N runtime contract for active models lookup.
-- This RPC reads private tenant integration tables server-side and returns
-- only the minimal metadata needed by the N8N workflow.

create or replace function public.phase077_get_active_tenant_integration_n8n(
  p_organization_id uuid,
  p_integration_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, tenant_integration_vault, pn_vault, pg_temp
as $$
declare
  v_row record;
begin
  if p_organization_id is null then
    return null;
  end if;

  if p_integration_key is null or btrim(p_integration_key) = '' then
    return null;
  end if;

  select
    ti.id as integration_id,
    ti.organization_id,
    ti.integration_key,
    ti.public_metadata,
    ti.status,
    ti.connection_state,
    ti.updated_at,
    p.provider_code
  into v_row
  from tenant_integration_vault.tenant_integrations ti
  join tenant_integration_vault.integration_providers p
    on p.id = ti.provider_id
  where ti.organization_id = p_organization_id
    and ti.integration_key = p_integration_key
    and ti.status = 'configured'
    and ti.connection_state = 'healthy'
    and p.status = 'active'
  order by ti.updated_at desc, ti.id desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'integration_id', v_row.integration_id,
    'organization_id', v_row.organization_id,
    'integration_key', v_row.integration_key,
    'provider_code', v_row.provider_code,
    'public_metadata', coalesce(v_row.public_metadata, '{}'::jsonb),
    'status', v_row.status,
    'connection_state', v_row.connection_state,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.phase077_get_active_tenant_integration_n8n(uuid, text) from public, anon, authenticated;
grant execute on function public.phase077_get_active_tenant_integration_n8n(uuid, text) to service_role;

