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

create or replace view public.department_governance_claim_boundary_evidence as
with marketing_boundary_source as (
  select distinct on (ci.id)
    ci.id as content_item_id,
    ci.content_key,
    ci.owner_ref,
    ci.title,
    ci.brief,
    ci.created_at,
    ci.updated_at
  from public.phase2_content_items ci
  where lower(coalesce(ci.title, '') || ' ' || coalesce(ci.brief, '')) like '%claim boundary%'
  order by ci.id, ci.updated_at desc, ci.created_at desc
),
marketing_boundary_evidence as (
  select distinct on (qr.content_item_id)
    qr.content_item_id,
    qr.evidence_ref,
    qr.notes,
    qr.created_at,
    qr.updated_at
  from public.phase2_qa_reviews qr
  join marketing_boundary_source m
    on m.content_item_id = qr.content_item_id
  where qr.evidence_ref is not null
  order by qr.content_item_id, qr.updated_at desc, qr.created_at desc
),
media_boundary_source as (
  select distinct on (a.content_item_id)
    a.id as asset_id,
    a.content_item_id,
    a.asset_key,
    a.owner_ref,
    a.asset_uri,
    a.evidence_ref,
    a.created_at,
    a.updated_at
  from public.phase2_assets a
  where a.evidence_ref is not null
  order by a.content_item_id, a.updated_at desc, a.created_at desc
),
media_boundary_evidence as (
  select distinct on (qr.content_item_id)
    qr.content_item_id,
    qr.evidence_ref,
    qr.notes,
    qr.created_at,
    qr.updated_at
  from public.phase2_qa_reviews qr
  join media_boundary_source m
    on m.content_item_id = qr.content_item_id
  where qr.evidence_ref is not null
  order by qr.content_item_id, qr.updated_at desc, qr.created_at desc
),
marketing_to_media_handoff as (
  select distinct on (h.id)
    h.id as source_handoff_id,
    h.source_department_name,
    h.target_department_name
  from public.department_governance_handoffs h
  where h.source_department_name = 'Marketing'
    and h.target_department_name = 'Media'
    and h.relationship_type = 'HANDOFF_TARGET'
  order by h.id, h.created_at desc
),
media_to_operations_handoff as (
  select distinct on (h.id)
    h.id as source_handoff_id,
    h.source_department_name,
    h.target_department_name
  from public.department_governance_handoffs h
  where h.source_department_name = 'Media'
    and h.target_department_name = 'Operations'
    and h.relationship_type = 'HANDOFF_TARGET'
  order by h.id, h.created_at desc
)
select
  'marketing_to_media'::text as surface_key,
  'Marketing'::text as source_department_name,
  'Media'::text as target_department_name,
  h.source_handoff_id,
  m.content_key as claim_boundary,
  m.content_key as claim_boundary_ref,
  coalesce(be.evidence_ref, m.content_key) as claim_boundary_evidence_ref,
  null::text as qa_boundary_evidence_ref,
  null::text as monitoring_trace_ref,
  'public.phase2_content_items + public.phase2_qa_reviews + public.department_governance_handoffs'::text as source_of_truth,
  case
    when m.content_key is not null and be.evidence_ref is not null then 'ready'
    else 'blocked'
  end as evidence_state,
  m.created_at as source_created_at,
  m.updated_at as source_updated_at
from marketing_to_media_handoff h
left join marketing_boundary_source m
  on true
left join marketing_boundary_evidence be
  on be.content_item_id = m.content_item_id

union all

select
  'media_to_operations'::text as surface_key,
  'Media'::text as source_department_name,
  'Operations'::text as target_department_name,
  h.source_handoff_id,
  a.asset_key as claim_boundary,
  a.asset_key as claim_boundary_ref,
  coalesce(a.evidence_ref, be.evidence_ref, a.asset_key) as claim_boundary_evidence_ref,
  be.evidence_ref as qa_boundary_evidence_ref,
  null::text as monitoring_trace_ref,
  'public.phase2_assets + public.phase2_qa_reviews + public.department_governance_handoffs'::text as source_of_truth,
  case
    when a.asset_key is not null and coalesce(a.evidence_ref, be.evidence_ref) is not null then 'ready'
    else 'blocked'
  end as evidence_state,
  a.created_at as source_created_at,
  a.updated_at as source_updated_at
from media_to_operations_handoff h
left join media_boundary_source a
  on true
left join media_boundary_evidence be
  on be.content_item_id = a.content_item_id;

create or replace view public.department_governance_monitoring_trace_refs as
select
  trace_id as monitoring_trace_ref,
  receipt_ref,
  workflow_ref,
  task_ref,
  current_state,
  retry_state,
  queue_state,
  started_at,
  finished_at
from public.phase4_execution_traces;

create or replace view public.department_governance_phase066_packet_evidence as
with marketing_boundary_item as (
  select distinct on (ci.id)
    ci.id as content_item_id,
    ci.owner_ref as task_owner_ref,
    ci.content_key as claim_boundary,
    qr.evidence_ref as qa_boundary,
    ci.created_at,
    ci.updated_at
  from public.phase2_content_items ci
  left join public.phase2_qa_reviews qr
    on qr.content_item_id = ci.id
   and qr.evidence_ref is not null
  where ci.owner_ref = 'pn_media_plus'
  order by ci.id, qr.updated_at desc nulls last, ci.updated_at desc
),
media_boundary_asset as (
  select distinct on (a.content_item_id)
    a.content_item_id,
    a.owner_ref as task_owner_ref,
    coalesce(nullif(btrim(a.asset_uri), ''), a.asset_key) as claim_boundary,
    qr.evidence_ref as qa_boundary,
    a.created_at,
    a.updated_at
  from public.phase2_assets a
  left join public.phase2_qa_reviews qr
    on qr.content_item_id = a.content_item_id
   and qr.evidence_ref is not null
  where a.owner_ref = 'Media'
     or a.owner_ref = 'pn_media_plus'
  order by a.content_item_id, qr.updated_at desc nulls last, a.updated_at desc
),
operations_visibility as (
  select distinct on (t.content_item_id)
    t.content_item_id,
    t.owner_ref as task_owner_ref,
    ci.content_key as claim_boundary,
    qr.evidence_ref as qa_boundary,
    t.created_at,
    t.updated_at
  from public.phase2_agent_tasks t
  left join public.phase2_content_items ci
    on ci.id = t.content_item_id
  left join public.phase2_qa_reviews qr
    on qr.content_item_id = t.content_item_id
   and qr.evidence_ref is not null
  where t.owner_ref = 'Operations'
     or t.owner_ref = 'pn_operations'
  order by t.content_item_id, t.updated_at desc
),
latest_monitoring_trace as (
  select monitoring_trace_ref
  from public.department_governance_monitoring_trace_refs
  order by started_at desc nulls last, finished_at desc nulls last, monitoring_trace_ref desc
  limit 1
),
marketing_to_media_handoff as (
  select distinct on (h.id)
    h.id as source_handoff_id
  from public.department_governance_handoffs h
  where h.source_department_name = 'Marketing'
    and h.target_department_name = 'Media'
    and h.relationship_type = 'HANDOFF_TARGET'
  order by h.id, h.created_at desc
),
media_to_operations_handoff as (
  select distinct on (h.id)
    h.id as source_handoff_id
  from public.department_governance_handoffs h
  where h.source_department_name = 'Media'
    and h.target_department_name = 'Operations'
    and h.relationship_type = 'HANDOFF_TARGET'
  order by h.id, h.created_at desc
),
operations_intake_handoff as (
  select distinct on (h.id)
    h.id as source_handoff_id
  from public.department_governance_handoffs h
  where h.source_department_name = 'Operations'
    and h.target_department_name in ('Human', 'Governance Relay', 'department owners')
    and h.relationship_type = 'HANDOFF_TARGET'
  order by h.id, h.created_at desc
)
select
  'marketing_to_media'::text as surface_key,
  'Marketing'::text as source_department_name,
  'Media'::text as target_department_name,
  h.source_handoff_id,
  b.content_item_id,
  b.task_owner_ref,
  b.claim_boundary,
  b.qa_boundary,
  null::text as monitoring_trace_ref,
  'public.phase2_content_items + public.phase2_qa_reviews + public.department_governance_handoffs'::text as source_of_truth,
  case
    when b.content_item_id is not null
     and b.task_owner_ref is not null
     and b.claim_boundary is not null
     and b.qa_boundary is not null
    then 'ready'
    else 'blocked'
  end as evidence_state,
  b.created_at as source_created_at,
  b.updated_at as source_updated_at
from marketing_to_media_handoff h
left join marketing_boundary_item b
  on true

union all

select
  'media_to_operations'::text as surface_key,
  'Media'::text as source_department_name,
  'Operations'::text as target_department_name,
  h.source_handoff_id,
  a.content_item_id,
  a.task_owner_ref,
  a.claim_boundary,
  a.qa_boundary,
  null::text as monitoring_trace_ref,
  'public.phase2_assets + public.phase2_qa_reviews + public.department_governance_handoffs'::text as source_of_truth,
  case
    when a.content_item_id is not null
     and a.task_owner_ref is not null
     and a.claim_boundary is not null
     and a.qa_boundary is not null
    then 'ready'
    else 'blocked'
  end as evidence_state,
  a.created_at as source_created_at,
  a.updated_at as source_updated_at
from media_to_operations_handoff h
left join media_boundary_asset a
  on true

union all

select
  'operations_intake_visibility'::text as surface_key,
  'Operations'::text as source_department_name,
  'Operations'::text as target_department_name,
  h.source_handoff_id,
  o.content_item_id,
  o.task_owner_ref,
  o.claim_boundary,
  o.qa_boundary,
  l.monitoring_trace_ref,
  'public.phase2_agent_tasks + public.phase2_qa_reviews + public.phase4_execution_traces + public.department_governance_handoffs'::text as source_of_truth,
  case
    when o.content_item_id is not null
     and o.task_owner_ref is not null
     and o.claim_boundary is not null
     and o.qa_boundary is not null
     and l.monitoring_trace_ref is not null
    then 'ready'
    else 'blocked'
  end as evidence_state,
  o.created_at as source_created_at,
  o.updated_at as source_updated_at
from operations_intake_handoff h
left join operations_visibility o
  on true
left join latest_monitoring_trace l
  on true;

create or replace view public.department_governance_phase066_canonical_surface as
select
  surface_key as flow_key,
  source_department_name,
  target_department_name,
  source_handoff_id,
  content_item_id,
  task_owner_ref,
  claim_boundary,
  qa_boundary,
  monitoring_trace_ref,
  source_of_truth,
  evidence_state,
  source_created_at,
  source_updated_at
from public.department_governance_phase066_packet_evidence;

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
    ),
    'phase066_packet_evidence',
    (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.surface_key), '[]'::jsonb)
      from public.department_governance_phase066_packet_evidence p
    )
  );
$$;

create or replace function public.department_governance_phase066_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, department_governance, pg_temp
as $$
  select jsonb_build_object(
    'flow_name', 'Marketing-Media-Operations',
    'claim_boundary_evidence',
    (
      select coalesce(jsonb_agg(to_jsonb(v) order by v.surface_key), '[]'::jsonb)
      from public.department_governance_claim_boundary_evidence v
    ),
    'phase066_packet_evidence',
    (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.surface_key), '[]'::jsonb)
      from public.department_governance_phase066_packet_evidence p
    ),
    'phase066_canonical_surface',
    (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.flow_key), '[]'::jsonb)
      from public.department_governance_phase066_canonical_surface c
    ),
    'monitoring_trace_refs',
    (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.started_at desc nulls last), '[]'::jsonb)
      from public.department_governance_monitoring_trace_refs m
    )
  );
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon;
    grant select on public.department_governance_registry to anon;
    grant select on public.department_governance_packs to anon;
    grant select on public.department_governance_handoffs to anon;
    grant select on public.department_governance_claim_boundary_evidence to anon;
    grant select on public.department_governance_phase066_packet_evidence to anon;
    grant select on public.department_governance_phase066_canonical_surface to anon;
    grant select on public.department_governance_monitoring_trace_refs to anon;
    grant execute on function public.department_governance_snapshot() to anon;
    grant execute on function public.department_governance_phase066_snapshot() to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select on public.department_governance_registry to authenticated;
    grant select on public.department_governance_packs to authenticated;
    grant select on public.department_governance_handoffs to authenticated;
    grant select on public.department_governance_claim_boundary_evidence to authenticated;
    grant select on public.department_governance_phase066_packet_evidence to authenticated;
    grant select on public.department_governance_phase066_canonical_surface to authenticated;
    grant select on public.department_governance_monitoring_trace_refs to authenticated;
    grant execute on function public.department_governance_snapshot() to authenticated;
    grant execute on function public.department_governance_phase066_snapshot() to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select on public.department_governance_registry to service_role;
    grant select on public.department_governance_packs to service_role;
    grant select on public.department_governance_handoffs to service_role;
    grant select on public.department_governance_claim_boundary_evidence to service_role;
    grant select on public.department_governance_phase066_packet_evidence to service_role;
    grant select on public.department_governance_phase066_canonical_surface to service_role;
    grant select on public.department_governance_monitoring_trace_refs to service_role;
    grant execute on function public.department_governance_snapshot() to service_role;
    grant execute on function public.department_governance_phase066_snapshot() to service_role;
  end if;
end $$;

commit;
