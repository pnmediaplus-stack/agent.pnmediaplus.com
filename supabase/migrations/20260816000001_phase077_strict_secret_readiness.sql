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
  join pn_vault.vault_credentials vc on vc.credential_ref = ti.vault_credential_ref
  where ti.organization_id = p_organization_id
    and ti.status = 'configured'
    and ti.connection_state = 'healthy'
    and ti.current_secret_blob_id is not null
    and vc.current_secret_blob_id is not null;

  return v_result;
end;
$$;

create or replace function public.phase076_get_runtime_tenant_integration_status(
  p_organization_id uuid,
  p_provider_code text,
  p_integration_key text default null
)
returns table (
  organization_id uuid,
  organization_key text,
  provider_code text,
  provider_name text,
  provider_category text,
  integration_key text,
  integration_name text,
  status text,
  connection_state text,
  last_verified_at timestamptz,
  credential_configured boolean,
  public_metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, tenant_integration_vault, portal_auth, pg_temp
as $$
  select
    o.id as organization_id,
    o.organization_key,
    p.provider_code,
    p.provider_name,
    p.provider_category,
    i.integration_key,
    i.integration_name,
    i.status,
    i.connection_state,
    i.last_verified_at,
    (vc.current_secret_blob_id is not null) as credential_configured,
    i.public_metadata,
    i.created_at,
    i.updated_at
  from tenant_integration_vault.tenant_integrations i
  join portal_auth.organizations o
    on o.id = i.organization_id
  join tenant_integration_vault.integration_providers p
    on p.id = i.provider_id
  join pn_vault.vault_credentials vc
    on vc.credential_ref = i.vault_credential_ref
  where i.organization_id = p_organization_id
    and p.provider_code = p_provider_code
    and i.status = 'configured'
    and i.connection_state = 'healthy'
    and p.status = 'active'
    and i.current_secret_blob_id is not null
    and vc.current_secret_blob_id is not null
    and (
      p_integration_key is null
      or i.integration_key = p_integration_key
    )
  order by i.updated_at desc
  limit 1;
$$;
