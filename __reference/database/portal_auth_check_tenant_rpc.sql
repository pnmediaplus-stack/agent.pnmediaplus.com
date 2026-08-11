-- Create an RPC to check if a tenant is active without exposing the schema
create or replace function public.check_tenant_active(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 
    from portal_auth.organizations 
    where id = p_organization_id 
      and status = 'active'
  );
$$;

-- Revoke all permissions by default for security
revoke all on function public.check_tenant_active(uuid) from public;
revoke all on function public.check_tenant_active(uuid) from anon;
revoke all on function public.check_tenant_active(uuid) from authenticated;

-- Grant execute ONLY to service_role, since this is an internal lane check
grant execute on function public.check_tenant_active(uuid) to service_role;
