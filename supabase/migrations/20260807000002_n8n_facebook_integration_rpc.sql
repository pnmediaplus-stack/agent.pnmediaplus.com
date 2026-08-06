begin;

create or replace function public.phase075_find_facebook_integration(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, tenant_integration_vault
as $$
declare
  v_integration record;
begin
  select id, organization_id, integration_key, vault_credential_ref
  into v_integration
  from tenant_integration_vault.tenant_integrations
  where organization_id = p_organization_id
    and integration_key like 'facebook_page_%'
    and status = 'active'
  limit 1;
  
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

revoke all on function public.phase075_find_facebook_integration(uuid) from public, anon, authenticated;
grant execute on function public.phase075_find_facebook_integration(uuid) to service_role;

commit;
