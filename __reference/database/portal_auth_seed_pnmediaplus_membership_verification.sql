select
  'auth_user_exists' as check_name,
  case when count(*) = 1 then 'PASS' else 'BLOCK' end as status
from auth.users
where id = '7767ed3c-b049-4886-b9cb-50e8bb06c673'::uuid;

select
  'active_pn_media_plus_organization_exists' as check_name,
  case when count(*) = 1 then 'PASS' else 'BLOCK' end as status
from portal_auth.organizations
where status = 'active'
  and organization_key = 'pn_media_plus';

select
  'exactly_one_active_membership' as check_name,
  case when count(*) = 1 then 'PASS' else 'BLOCK' end as status
from portal_auth.organization_memberships m
join auth.users u
  on u.id = m.user_id
join portal_auth.organizations o
  on o.id = m.organization_id
where u.id = '7767ed3c-b049-4886-b9cb-50e8bb06c673'::uuid
  and o.organization_key = 'pn_media_plus'
  and m.status = 'active';

select
  'inserted_membership_row' as check_name,
  m.id as membership_id,
  o.id as organization_id,
  o.organization_key,
  o.organization_name,
  u.id as user_id,
  u.email,
  m.role,
  m.status,
  m.created_at,
  m.updated_at
from portal_auth.organization_memberships m
join portal_auth.organizations o
  on o.id = m.organization_id
join auth.users u
  on u.id = m.user_id
where u.id = '7767ed3c-b049-4886-b9cb-50e8bb06c673'::uuid
  and o.organization_key = 'pn_media_plus'
  and m.status = 'active';
