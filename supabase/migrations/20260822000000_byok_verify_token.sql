-- Migration to allow verifying a reference token's scope without consuming it
-- This is used for n8n retry loops where the token is already consumed but we still need to prove tenant scope.

drop function if exists public.byok_verify_reference_token(text);

create or replace function public.byok_verify_reference_token(
  p_lease_token text,
  p_organization_id uuid default null
)
returns table (
  credential_ref text,
  state text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
begin
  return query
  select
    c.credential_ref,
    t.state::text,
    t.expires_at
  from pn_vault.vault_reference_tokens t
  join pn_vault.vault_credentials c on c.id = t.credential_id
  where t.token_hash = pn_vault.hash_reference_token(p_lease_token)
  and (
    p_organization_id is null or exists (
      select 1 from tenant_integration_vault.tenant_integrations ti
      where ti.vault_credential_ref = c.credential_ref
      and ti.organization_id = p_organization_id
    )
  );
end;
$$;

-- Grant access to service_role
grant execute on function public.byok_verify_reference_token(text, uuid) to service_role;
revoke execute on function public.byok_verify_reference_token(text, uuid) from public, anon, authenticated;
  
-- Reload schema  
NOTIFY pgrst, 'reload schema'; 
