create or replace function public.phase076_find_tenant_integration(
  p_organization_id uuid,
  p_integration_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, tenant_integration_vault, pn_vault, pg_temp
as $$
declare
  v_integration record;
begin
  select ti.id, ti.organization_id, ti.integration_key, ti.vault_credential_ref
  into v_integration
  from tenant_integration_vault.tenant_integrations ti
  inner join pn_vault.vault_credentials vc
    on ti.vault_credential_ref = vc.credential_ref
  where ti.organization_id = p_organization_id
    and ti.integration_key = p_integration_key
    and ti.status in ('active', 'configured');
    
  if v_integration is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_integration.id,
    'organization_id', v_integration.organization_id,
    'integration_key', v_integration.integration_key,
    'vault_credential_ref', v_integration.vault_credential_ref
  );
end;
$$;

REVOKE ALL ON FUNCTION public.phase076_find_tenant_integration(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_find_tenant_integration(uuid, text) TO service_role;

-- Drop the old insecure functions
drop function if exists public.phase075_find_facebook_integration();
drop function if exists public.phase075_find_tenant_integration();
