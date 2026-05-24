begin;

do $$
declare
  v_user_id uuid := '7767ed3c-b049-4886-b9cb-50e8bb06c673'::uuid;
  v_organization_id uuid;
  v_active_membership_count integer;
  v_existing_membership_count integer;
  v_missing_required_columns text[];
  v_unhandled_org_required_columns text[];
  v_unhandled_membership_required_columns text[];
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'portal_auth'
      and table_name = 'organizations'
  ) then
    raise exception 'BLOCKER_PORTAL_AUTH_ORGANIZATIONS_TABLE_MISSING'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'portal_auth'
      and table_name = 'organization_memberships'
  ) then
    raise exception 'BLOCKER_PORTAL_AUTH_ORGANIZATION_MEMBERSHIPS_TABLE_MISSING'
      using errcode = 'P0001';
  end if;

  select array_agg(required_column order by required_column)
  into v_missing_required_columns
  from unnest(array[
    'id',
    'organization_key',
    'organization_name',
    'status'
  ]) as required_column
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'portal_auth'
      and c.table_name = 'organizations'
      and c.column_name = required_column
  );

  if coalesce(array_length(v_missing_required_columns, 1), 0) > 0 then
    raise exception 'BLOCKER_PORTAL_AUTH_ORGANIZATIONS_COLUMNS_MISSING: %', array_to_string(v_missing_required_columns, ',')
      using errcode = 'P0001';
  end if;

  select array_agg(required_column order by required_column)
  into v_missing_required_columns
  from unnest(array[
    'id',
    'organization_id',
    'user_id',
    'role',
    'status',
    'created_at',
    'updated_at'
  ]) as required_column
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'portal_auth'
      and c.table_name = 'organization_memberships'
      and c.column_name = required_column
  );

  if coalesce(array_length(v_missing_required_columns, 1), 0) > 0 then
    raise exception 'BLOCKER_PORTAL_AUTH_MEMBERSHIP_COLUMNS_MISSING: %', array_to_string(v_missing_required_columns, ',')
      using errcode = 'P0001';
  end if;

  select array_agg(c.column_name order by c.ordinal_position)
  into v_unhandled_org_required_columns
  from information_schema.columns c
  where c.table_schema = 'portal_auth'
    and c.table_name = 'organizations'
    and c.is_nullable = 'NO'
    and c.column_default is null
    and c.column_name not in ('organization_key', 'organization_name', 'status');

  if coalesce(array_length(v_unhandled_org_required_columns, 1), 0) > 0 then
    raise exception 'BLOCKER_PORTAL_AUTH_ORG_HAS_UNHANDLED_REQUIRED_COLUMNS: %', array_to_string(v_unhandled_org_required_columns, ',')
      using errcode = 'P0001';
  end if;

  select array_agg(c.column_name order by c.ordinal_position)
  into v_unhandled_membership_required_columns
  from information_schema.columns c
  where c.table_schema = 'portal_auth'
    and c.table_name = 'organization_memberships'
    and c.is_nullable = 'NO'
    and c.column_default is null
    and c.column_name not in ('organization_id', 'user_id', 'role', 'status');

  if coalesce(array_length(v_unhandled_membership_required_columns, 1), 0) > 0 then
    raise exception 'BLOCKER_PORTAL_AUTH_MEMBERSHIP_HAS_UNHANDLED_REQUIRED_COLUMNS: %', array_to_string(v_unhandled_membership_required_columns, ',')
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = v_user_id
  ) then
    raise exception 'BLOCKER_PORTAL_AUTH_USER_NOT_FOUND: %', v_user_id
      using errcode = 'P0001';
  end if;

  insert into portal_auth.organizations (
    organization_key,
    organization_name,
    status
  ) values (
    'pn_media_plus',
    'PN MEDIA PLUS',
    'active'
  )
  on conflict (organization_key) do update
    set organization_name = excluded.organization_name,
        status = excluded.status
  where portal_auth.organizations.status <> 'active'
     or portal_auth.organizations.organization_name <> excluded.organization_name
  returning id into v_organization_id;

  if v_organization_id is null then
    select o.id
    into v_organization_id
    from portal_auth.organizations o
    where o.organization_key = 'pn_media_plus'
      and o.status = 'active'
    order by o.created_at asc
    limit 1;
  end if;

  if v_organization_id is null then
    raise exception 'BLOCKER_PORTAL_AUTH_ORG_PN_MEDIA_PLUS_NOT_ACTIVE_AFTER_BOOTSTRAP'
      using errcode = 'P0001';
  end if;

  select count(*)
  into v_active_membership_count
  from portal_auth.organization_memberships m
  where m.user_id = v_user_id
    and m.status = 'active';

  if v_active_membership_count > 0 then
    raise exception 'BLOCKER_PORTAL_AUTH_ACTIVE_MEMBERSHIP_ALREADY_EXISTS: %', v_user_id
      using errcode = 'P0001';
  end if;

  select count(*)
  into v_existing_membership_count
  from portal_auth.organization_memberships m
  where m.user_id = v_user_id
    and m.organization_id = v_organization_id;

  if v_existing_membership_count > 0 then
    raise exception 'BLOCKER_PORTAL_AUTH_MEMBERSHIP_ALREADY_EXISTS_FOR_ORG: %', v_user_id
      using errcode = 'P0001';
  end if;

  insert into portal_auth.organization_memberships (
    organization_id,
    user_id,
    role,
    status
  ) values (
    v_organization_id,
    v_user_id,
    'owner',
    'active'
  );
end $$;

select
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

commit;
