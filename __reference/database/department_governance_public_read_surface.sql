-- Department Governance public read surface
-- Read-only exposure for Supabase/PostgREST
-- No write path, no schema exposure, no source-of-truth changes

begin;

create or replace view public.department_governance_registry as
select
  r.registry_id,
  r.registry_schema_version,
  r.registry_name,
  r.registry_status,
  r.registry_mode,
  r.registry_version,
  r.source_of_truth,
  r.owner_role,
  count(distinct p.id)::integer as pack_count,
  count(distinct e.id)::integer as department_count,
  count(distinct h.id)::integer as handoff_count,
  r.created_at,
  r.updated_at
from department_governance.department_registries r
left join department_governance.department_packs p
  on p.registry_id = r.id
left join department_governance.department_registry_entries e
  on e.registry_id = r.id
left join department_governance.cross_department_handoffs h
  on h.source_department_entry_id = e.id
group by
  r.registry_id,
  r.registry_schema_version,
  r.registry_name,
  r.registry_status,
  r.registry_mode,
  r.registry_version,
  r.source_of_truth,
  r.owner_role,
  r.created_at,
  r.updated_at;

create or replace view public.department_governance_packs as
select
  p.pack_key,
  p.pack_name,
  r.registry_id,
  p.qa_expectation,
  coalesce(o.owner_count, 0)::integer as owner_count,
  coalesce(t.truth_source_count, 0)::integer as truth_source_count,
  coalesce(a.allowed_action_count, 0)::integer as allowed_action_count,
  coalesce(a.must_not_action_count, 0)::integer as must_not_action_count,
  coalesce(d.dependency_count, 0)::integer as dependency_count,
  coalesce(ht.handoff_target_count, 0)::integer as handoff_target_count,
  p.created_at,
  p.updated_at
from department_governance.department_packs p
join department_governance.department_registries r
  on r.id = p.registry_id
left join (
  select pack_id, count(*) as owner_count
  from department_governance.department_pack_owners
  group by pack_id
) o on o.pack_id = p.id
left join (
  select pack_id, count(*) as truth_source_count
  from department_governance.department_pack_truth_sources
  group by pack_id
) t on t.pack_id = p.id
left join (
  select
    pack_id,
    count(*) filter (where action_kind = 'ALLOWED') as allowed_action_count,
    count(*) filter (where action_kind = 'MUST_NOT') as must_not_action_count
  from department_governance.department_pack_actions
  group by pack_id
) a on a.pack_id = p.id
left join (
  select pack_id, count(*) as dependency_count
  from department_governance.department_pack_dependencies
  group by pack_id
) d on d.pack_id = p.id
left join (
  select pack_id, count(*) as handoff_target_count
  from department_governance.department_pack_handoff_targets
  group by pack_id
) ht on ht.pack_id = p.id;

create or replace view public.department_governance_handoffs as
select
  h.id,
  src.department_id as source_department_id,
  src.department_name as source_department_name,
  src.department_pack_key as source_department_pack_key,
  src.department_pack_name as source_department_pack_name,
  h.relationship_type,
  h.target_department_name,
  tgt.department_id as target_department_id,
  tgt.department_name as target_department_name_resolved,
  h.is_active,
  h.sort_order,
  h.created_at,
  h.updated_at
from department_governance.cross_department_handoffs h
join department_governance.department_registry_entries src
  on src.id = h.source_department_entry_id
left join department_governance.department_registry_entries tgt
  on tgt.id = h.target_department_entry_id;

create or replace function public.department_governance_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, department_governance, pg_temp
as $$
  select jsonb_build_object(
    'registry',
    (
      select to_jsonb(r)
      from public.department_governance_registry r
      order by r.registry_id
      limit 1
    ),
    'packs',
    (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.pack_key), '[]'::jsonb)
      from public.department_governance_packs p
    ),
    'handoffs',
    (
      select coalesce(jsonb_agg(to_jsonb(h) order by h.source_department_name, h.relationship_type, h.target_department_name), '[]'::jsonb)
      from public.department_governance_handoffs h
    )
  );
$$;

grant usage on schema public to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon;
    grant select on public.department_governance_registry to anon;
    grant select on public.department_governance_packs to anon;
    grant select on public.department_governance_handoffs to anon;
    grant execute on function public.department_governance_snapshot() to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select on public.department_governance_registry to authenticated;
    grant select on public.department_governance_packs to authenticated;
    grant select on public.department_governance_handoffs to authenticated;
    grant execute on function public.department_governance_snapshot() to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select on public.department_governance_registry to service_role;
    grant select on public.department_governance_packs to service_role;
    grant select on public.department_governance_handoffs to service_role;
    grant execute on function public.department_governance_snapshot() to service_role;
  end if;
end $$;

commit;
