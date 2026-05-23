-- Department Governance verification queries
-- Run after the additive migration and after loading the canonical bundle rows

-- 1) Registry completeness
with expected_registry as (
  select *
  from (
    values
      ('Core Governance', 'dept-core-gov', 'core_governance', 'Core Governance Pack', 'active-governance', 5, 4, 0, 1),
      ('Business Truth', 'dept-business-truth', 'business_truth', 'Business Truth Pack', 'active-governance', 4, 4, 1, 4),
      ('Marketing', 'dept-marketing', 'marketing', 'Marketing Pack', 'active-governance', 6, 5, 2, 3),
      ('Media', 'dept-media', 'media', 'Media Pack', 'active-governance', 6, 4, 2, 3),
      ('Operations', 'dept-operations', 'operations', 'Operations Pack', 'partial-operational', 4, 4, 2, 3),
      ('Customer', 'dept-customer', 'customer', 'Customer Pack', 'planned', 4, 4, 3, 4)
  ) as t(
    department_name,
    department_id,
    pack_key,
    pack_name,
    current_state,
    allowed_count,
    must_not_count,
    dependency_count,
    recipient_count
  )
),
actual_registry as (
  select
    e.department_name,
    e.department_id,
    e.department_pack_key as pack_key,
    e.department_pack_name as pack_name,
    e.current_state,
    e.handoff_required,
    e.qa_required,
    e.human_review_required,
    (
      select count(*)
      from department_governance.department_registry_entry_actions a
      where a.registry_entry_id = e.id
        and a.action_kind = 'ALLOWED'
    ) as allowed_count,
    (
      select count(*)
      from department_governance.department_registry_entry_actions a
      where a.registry_entry_id = e.id
        and a.action_kind = 'MUST_NOT'
    ) as must_not_count,
    (
      select count(*)
      from department_governance.department_registry_entry_dependencies d
      where d.registry_entry_id = e.id
    ) as dependency_count,
    (
      select count(*)
      from department_governance.department_registry_entry_recipients r
      where r.registry_entry_id = e.id
    ) as recipient_count
  from department_governance.department_registry_entries e
)
select
  coalesce(e.department_name, a.department_name) as department_name,
  case
    when a.department_name is not null
     and e.department_name is not null
     and a.department_id = e.department_id
     and a.pack_key = e.pack_key
     and a.pack_name = e.pack_name
     and a.current_state = e.current_state
     and a.allowed_count = e.allowed_count
     and a.must_not_count = e.must_not_count
     and a.dependency_count = e.dependency_count
     and a.recipient_count = e.recipient_count
     and a.handoff_required
     and a.qa_required
     and a.human_review_required
    then 'PASS'
    else 'FAIL'
  end as status,
  e.department_id as expected_department_id,
  a.department_id as actual_department_id,
  e.pack_key as expected_pack_key,
  a.pack_key as actual_pack_key,
  e.current_state as expected_current_state,
  a.current_state as actual_current_state,
  e.allowed_count as expected_allowed_count,
  a.allowed_count as actual_allowed_count,
  e.must_not_count as expected_must_not_count,
  a.must_not_count as actual_must_not_count,
  e.dependency_count as expected_dependency_count,
  a.dependency_count as actual_dependency_count,
  e.recipient_count as expected_recipient_count,
  a.recipient_count as actual_recipient_count
from expected_registry e
full outer join actual_registry a using (department_name)
order by coalesce(e.department_name, a.department_name);

-- 2) Pack completeness
with expected_packs as (
  select *
  from (
    values
      ('core_governance', 'Core Governance Pack', 2, 3, 5, 3, 0, 1),
      ('business_truth', 'Business Truth Pack', 3, 4, 4, 4, 1, 4),
      ('marketing', 'Marketing Pack', 1, 3, 7, 5, 2, 3),
      ('media', 'Media Pack', 1, 3, 6, 4, 2, 4),
      ('operations', 'Operations Pack', 2, 3, 4, 4, 2, 4),
      ('customer', 'Customer Pack', 1, 3, 4, 4, 3, 4)
  ) as t(
    pack_key,
    pack_name,
    owner_count,
    truth_source_count,
    allowed_count,
    must_not_count,
    dependency_count,
    handoff_target_count
  )
),
actual_packs as (
  select
    p.pack_key,
    p.pack_name,
    (
      select count(*)
      from department_governance.department_pack_owners o
      where o.pack_id = p.id
    ) as owner_count,
    (
      select count(*)
      from department_governance.department_pack_truth_sources s
      where s.pack_id = p.id
    ) as truth_source_count,
    (
      select count(*)
      from department_governance.department_pack_actions a
      where a.pack_id = p.id
        and a.action_kind = 'ALLOWED'
    ) as allowed_count,
    (
      select count(*)
      from department_governance.department_pack_actions a
      where a.pack_id = p.id
        and a.action_kind = 'MUST_NOT'
    ) as must_not_count,
    (
      select count(*)
      from department_governance.department_pack_dependencies d
      where d.pack_id = p.id
    ) as dependency_count,
    (
      select count(*)
      from department_governance.department_pack_handoff_targets h
      where h.pack_id = p.id
    ) as handoff_target_count
  from department_governance.department_packs p
)
select
  coalesce(e.pack_key, a.pack_key) as pack_key,
  case
    when a.pack_key is not null
     and e.pack_key is not null
     and a.pack_name = e.pack_name
     and a.owner_count = e.owner_count
     and a.truth_source_count = e.truth_source_count
     and a.allowed_count = e.allowed_count
     and a.must_not_count = e.must_not_count
     and a.dependency_count = e.dependency_count
     and a.handoff_target_count = e.handoff_target_count
    then 'PASS'
    else 'FAIL'
  end as status,
  e.pack_name as expected_pack_name,
  a.pack_name as actual_pack_name,
  e.owner_count as expected_owner_count,
  a.owner_count as actual_owner_count,
  e.truth_source_count as expected_truth_source_count,
  a.truth_source_count as actual_truth_source_count,
  e.allowed_count as expected_allowed_count,
  a.allowed_count as actual_allowed_count,
  e.must_not_count as expected_must_not_count,
  a.must_not_count as actual_must_not_count,
  e.dependency_count as expected_dependency_count,
  a.dependency_count as actual_dependency_count,
  e.handoff_target_count as expected_handoff_target_count,
  a.handoff_target_count as actual_handoff_target_count
from expected_packs e
full outer join actual_packs a using (pack_key)
order by coalesce(e.pack_key, a.pack_key);

-- 3) Handoff completeness
with expected_handoffs as (
  select *
  from (
    values
      ('Business Truth', 'DEPENDENCY', 'Core Governance'),
      ('Marketing', 'DEPENDENCY', 'Core Governance'),
      ('Marketing', 'DEPENDENCY', 'Business Truth'),
      ('Media', 'DEPENDENCY', 'Marketing'),
      ('Media', 'DEPENDENCY', 'Core Governance'),
      ('Operations', 'DEPENDENCY', 'Core Governance'),
      ('Operations', 'DEPENDENCY', 'Business Truth'),
      ('Customer', 'DEPENDENCY', 'Core Governance'),
      ('Customer', 'DEPENDENCY', 'Business Truth'),
      ('Customer', 'DEPENDENCY', 'Marketing'),
      ('Core Governance', 'HANDOFF_TARGET', 'all departments'),
      ('Business Truth', 'HANDOFF_TARGET', 'Marketing'),
      ('Business Truth', 'HANDOFF_TARGET', 'Media'),
      ('Business Truth', 'HANDOFF_TARGET', 'Operations'),
      ('Business Truth', 'HANDOFF_TARGET', 'Customer'),
      ('Marketing', 'HANDOFF_TARGET', 'Media'),
      ('Marketing', 'HANDOFF_TARGET', 'Operations'),
      ('Marketing', 'HANDOFF_TARGET', 'Human'),
      ('Media', 'HANDOFF_TARGET', 'QA'),
      ('Media', 'HANDOFF_TARGET', 'Distribution'),
      ('Media', 'HANDOFF_TARGET', 'Performance Memory'),
      ('Media', 'HANDOFF_TARGET', 'Operations'),
      ('Operations', 'HANDOFF_TARGET', 'Human'),
      ('Operations', 'HANDOFF_TARGET', 'Governance Relay'),
      ('Operations', 'HANDOFF_TARGET', 'department owners'),
      ('Operations', 'HANDOFF_TARGET', 'Media'),
      ('Customer', 'HANDOFF_TARGET', 'Marketing'),
      ('Customer', 'HANDOFF_TARGET', 'Product'),
      ('Customer', 'HANDOFF_TARGET', 'Operations'),
      ('Customer', 'HANDOFF_TARGET', 'Human')
  ) as t(
    source_department_name,
    relationship_type,
    target_department_name
  )
),
actual_handoffs as (
  select
    s.department_name as source_department_name,
    h.relationship_type,
    h.target_department_name
  from department_governance.cross_department_handoffs h
  join department_governance.department_registry_entries s
    on s.id = h.source_department_entry_id
)
select
  coalesce(e.source_department_name, a.source_department_name) as source_department_name,
  coalesce(e.relationship_type, a.relationship_type) as relationship_type,
  coalesce(e.target_department_name, a.target_department_name) as target_department_name,
  case
    when e.source_department_name is not null
     and a.source_department_name is not null
    then 'PASS'
    else 'FAIL'
  end as status
from expected_handoffs e
full outer join actual_handoffs a
  on a.source_department_name = e.source_department_name
 and a.relationship_type = e.relationship_type
 and a.target_department_name = e.target_department_name
order by 1, 2, 3;

with actual_handoffs as (
  select
    s.department_name as source_department_name,
    h.relationship_type,
    h.target_department_name
  from department_governance.cross_department_handoffs h
  join department_governance.department_registry_entries s
    on s.id = h.source_department_entry_id
)
select
  source_department_name,
  relationship_type,
  target_department_name,
  count(*) as duplicate_rows
from actual_handoffs
group by 1, 2, 3
having count(*) > 1
order by 1, 2, 3;

-- 4) FK / dependency integrity
with canonical_departments as (
  select *
  from (values
    ('Core Governance'),
    ('Business Truth'),
    ('Marketing'),
    ('Media'),
    ('Operations'),
    ('Customer')
  ) as t(department_name)
)
select
  'registry_entry_pack_fk' as check_name,
  count(*) as invalid_rows
from department_governance.department_registry_entries e
left join department_governance.department_packs p
  on p.pack_key = e.department_pack_key
where p.id is null
   or p.pack_name <> e.department_pack_name

union all

select
  'registry_dependency_resolution' as check_name,
  count(*) as invalid_rows
from department_governance.department_registry_entry_dependencies d
left join department_governance.department_registry_entries dep
  on dep.id = d.dependency_department_entry_id
left join canonical_departments c
  on c.department_name = d.dependency_department_name
where c.department_name is not null
  and (dep.id is null or dep.department_name <> d.dependency_department_name)

union all

select
  'registry_recipient_resolution' as check_name,
  count(*) as invalid_rows
from department_governance.department_registry_entry_recipients r
left join department_governance.department_registry_entries rec
  on rec.id = r.recipient_department_entry_id
left join canonical_departments c
  on c.department_name = r.recipient_department_name
where c.department_name is not null
  and (rec.id is null or rec.department_name <> r.recipient_department_name)

union all

select
  'pack_dependency_resolution' as check_name,
  count(*) as invalid_rows
from department_governance.department_pack_dependencies d
left join department_governance.department_registry_entries dep
  on dep.id = d.dependency_department_entry_id
left join canonical_departments c
  on c.department_name = d.dependency_department_name
where c.department_name is not null
  and (dep.id is null or dep.department_name <> d.dependency_department_name)

union all

select
  'pack_handoff_target_resolution' as check_name,
  count(*) as invalid_rows
from department_governance.department_pack_handoff_targets h
left join department_governance.department_registry_entries tgt
  on tgt.id = h.target_department_entry_id
left join canonical_departments c
  on c.department_name = h.target_department_name
where c.department_name is not null
  and (tgt.id is null or tgt.department_name <> h.target_department_name)

union all

select
  'cross_handoff_target_resolution' as check_name,
  count(*) as invalid_rows
from department_governance.cross_department_handoffs h
left join department_governance.department_registry_entries tgt
  on tgt.id = h.target_department_entry_id
left join canonical_departments c
  on c.department_name = h.target_department_name
where c.department_name is not null
  and (tgt.id is null or tgt.department_name <> h.target_department_name)

union all

select
  'handoff_audit_log_fk' as check_name,
  count(*) as invalid_rows
from department_governance.handoff_audit_log l
left join department_governance.cross_department_handoffs h
  on h.id = l.cross_department_handoff_id
where h.id is null;

-- 5) Missing required fields
select
  'department_registries' as table_name,
  count(*) as missing_required_rows
from department_governance.department_registries
where registry_id is null
   or btrim(registry_id) = ''
   or registry_schema_version is null
   or btrim(registry_schema_version) = ''
   or registry_name is null
   or btrim(registry_name) = ''
   or registry_status is null
   or registry_mode is null
   or registry_version is null
   or source_of_truth is null
   or owner_role is null

union all

select
  'department_packs' as table_name,
  count(*) as missing_required_rows
from department_governance.department_packs
where registry_id is null
   or pack_key is null
   or btrim(pack_key) = ''
   or pack_name is null
   or btrim(pack_name) = ''
   or qa_expectation is null
   or btrim(qa_expectation) = ''

union all

select
  'department_registry_entries' as table_name,
  count(*) as missing_required_rows
from department_governance.department_registry_entries
where registry_id is null
   or department_id is null
   or btrim(department_id) = ''
   or department_name is null
   or btrim(department_name) = ''
   or department_pack_key is null
   or btrim(department_pack_key) = ''
   or department_pack_name is null
   or btrim(department_pack_name) = ''
   or owner_role is null
   or owner_team is null
   or primary_purpose is null
   or canonical_truth_source is null
   or current_state is null
   or notes is null

union all

select
  'department_registry_entry_actions' as table_name,
  count(*) as missing_required_rows
from department_governance.department_registry_entry_actions
where registry_entry_id is null
   or action_kind is null
   or action_text is null
   or btrim(action_text) = ''

union all

select
  'department_registry_entry_dependencies' as table_name,
  count(*) as missing_required_rows
from department_governance.department_registry_entry_dependencies
where registry_entry_id is null
   or dependency_department_name is null
   or btrim(dependency_department_name) = ''

union all

select
  'department_registry_entry_recipients' as table_name,
  count(*) as missing_required_rows
from department_governance.department_registry_entry_recipients
where registry_entry_id is null
   or recipient_department_name is null
   or btrim(recipient_department_name) = ''

union all

select
  'department_pack_owners' as table_name,
  count(*) as missing_required_rows
from department_governance.department_pack_owners
where pack_id is null
   or owner_label is null
   or btrim(owner_label) = ''

union all

select
  'department_pack_truth_sources' as table_name,
  count(*) as missing_required_rows
from department_governance.department_pack_truth_sources
where pack_id is null
   or truth_source_text is null
   or btrim(truth_source_text) = ''

union all

select
  'department_pack_actions' as table_name,
  count(*) as missing_required_rows
from department_governance.department_pack_actions
where pack_id is null
   or action_kind is null
   or action_text is null
   or btrim(action_text) = ''

union all

select
  'department_pack_dependencies' as table_name,
  count(*) as missing_required_rows
from department_governance.department_pack_dependencies
where pack_id is null
   or dependency_department_name is null
   or btrim(dependency_department_name) = ''

union all

select
  'department_pack_handoff_targets' as table_name,
  count(*) as missing_required_rows
from department_governance.department_pack_handoff_targets
where pack_id is null
   or target_department_name is null
   or btrim(target_department_name) = ''

union all

select
  'cross_department_handoffs' as table_name,
  count(*) as missing_required_rows
from department_governance.cross_department_handoffs
where source_department_entry_id is null
   or target_department_name is null
   or btrim(target_department_name) = ''
   or relationship_type is null

union all

select
  'handoff_audit_log' as table_name,
  count(*) as missing_required_rows
from department_governance.handoff_audit_log
where cross_department_handoff_id is null
   or event_type is null
   or actor_type is null
   or actor_ref is null
   or btrim(actor_ref) = ''
   or reason is null
   or btrim(reason) = ''
   or request_id is null
   or event_hash is null
   or length(event_hash) <> 64;

-- 6) Namespace isolation
with expected_tables as (
  select *
  from (values
    ('department_registries'),
    ('department_packs'),
    ('department_registry_entries'),
    ('department_registry_entry_actions'),
    ('department_registry_entry_dependencies'),
    ('department_registry_entry_recipients'),
    ('department_pack_owners'),
    ('department_pack_truth_sources'),
    ('department_pack_actions'),
    ('department_pack_dependencies'),
    ('department_pack_handoff_targets'),
    ('cross_department_handoffs'),
    ('handoff_audit_log')
  ) as t(table_name)
),
actual_governance_tables as (
  select table_name
  from information_schema.tables
  where table_schema = 'department_governance'
),
unexpected_phase1_tables as (
  select table_name
  from information_schema.tables
  where table_schema = 'pn_os_ai_department'
    and table_name in (
      select table_name
      from expected_tables
    )
)
select
  case
    when not exists (
      select 1
      from expected_tables e
      left join actual_governance_tables a using (table_name)
      where a.table_name is null
    )
    and not exists (
      select 1 from unexpected_phase1_tables
    )
    then 'PASS'
    else 'FAIL'
  end as status,
  (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from expected_tables e
    left join actual_governance_tables a using (table_name)
    where a.table_name is null
  ) as missing_governance_tables,
  (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from unexpected_phase1_tables
  ) as unexpected_phase1_tables;
