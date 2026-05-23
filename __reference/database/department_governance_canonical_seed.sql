-- Department Governance canonical seed
-- Additive + idempotent

begin;

create extension if not exists pgcrypto;

insert into department_governance.department_registries (
  registry_id,
  registry_schema_version,
  registry_name,
  registry_status,
  registry_mode,
  registry_version,
  source_of_truth,
  owner_role,
  source_bundle_json
)
values (
  'department_registry_v1',
  'v1',
  'PN OS Department Registry',
  'DRAFT_SEED',
  'governance_only',
  '1.0.0',
  'canonical registry bundle',
  'Human / Executive + Governance Relay',
  jsonb_build_object(
    'source', 'department-governance bundle',
    'registry_file', 'department_registry.json',
    'registry_packs_file', 'department_packs.json',
    'handoff_contract_file', 'handoff_contract.json'
  )
)
on conflict (registry_id) do update
set
  registry_schema_version = excluded.registry_schema_version,
  registry_name = excluded.registry_name,
  registry_status = excluded.registry_status,
  registry_mode = excluded.registry_mode,
  registry_version = excluded.registry_version,
  source_of_truth = excluded.source_of_truth,
  owner_role = excluded.owner_role,
  source_bundle_json = excluded.source_bundle_json;

insert into department_governance.department_packs (
  registry_id,
  pack_key,
  pack_name,
  qa_expectation,
  source_pack_json
)
select
  r.id,
  v.pack_key,
  v.pack_name,
  v.qa_expectation,
  jsonb_build_object(
    'source', 'department-governance bundle',
    'pack_key', v.pack_key,
    'pack_name', v.pack_name
  )
from department_governance.department_registries r
join (
  values
    ('core_governance', 'Core Governance Pack', 'evidence-backed and state-gated'),
    ('business_truth', 'Business Truth Pack', 'explicit truth source and ownership'),
    ('marketing', 'Marketing Pack', 'GTM packet has claim boundary, proof direction, and approval state'),
    ('media', 'Media Pack', 'assets remain inside the approved claim boundary'),
    ('operations', 'Operations Pack', 'traceable and fail-closed runs'),
    ('customer', 'Customer Pack', 'sensitive incidents escalated with complete evidence')
) as v(pack_key, pack_name, qa_expectation)
  on true
where r.registry_id = 'department_registry_v1'
on conflict (pack_key) do update
set
  registry_id = excluded.registry_id,
  pack_name = excluded.pack_name,
  qa_expectation = excluded.qa_expectation,
  source_pack_json = excluded.source_pack_json;

insert into department_governance.department_registry_entries (
  registry_id,
  department_id,
  department_name,
  department_pack_key,
  department_pack_name,
  owner_role,
  owner_team,
  primary_purpose,
  canonical_truth_source,
  current_state,
  handoff_required,
  qa_required,
  human_review_required,
  notes,
  source_record_json
)
select
  r.id,
  v.department_id,
  v.department_name,
  v.department_pack_key,
  v.department_pack_name,
  v.owner_role,
  v.owner_team,
  v.primary_purpose,
  v.canonical_truth_source,
  v.current_state,
  v.handoff_required,
  v.qa_required,
  v.human_review_required,
  v.notes,
  jsonb_build_object(
    'source', 'department-governance bundle',
    'department_id', v.department_id,
    'department_name', v.department_name
  )
from department_governance.department_registries r
join (
  values
    ('dept-core-gov', 'Core Governance', 'core_governance', 'Core Governance Pack', 'Human / Executive + Governance Relay', 'Executive Governance Layer', 'Human finality, routing, apply-gate, state reconciliation', 'core constitution + protocol authority', 'active-governance', true, true, true, 'Top routing layer for multi-department governance.'),
    ('dept-business-truth', 'Business Truth', 'business_truth', 'Business Truth Pack', 'Finance / Billing + Auth / Identity + Product / Offer Governance', 'Business Truth Layer', 'Own offer, pricing, billing, identity, and package truth', 'billing services + auth services + product truth sources', 'active-governance', true, true, true, 'Protects system truth for money and identity.'),
    ('dept-marketing', 'Marketing', 'marketing', 'Marketing Pack', 'Chief Marketing Agent', 'Marketing Governance Layer', 'Positioning, GTM translation, campaign orchestration, claim boundary', 'approved product/business truth + market signals + proof references', 'active-governance', true, true, true, 'Owns governed truth translation, not final launch authority.'),
    ('dept-media', 'Media', 'media', 'Media Pack', 'Media Lead', 'Media Execution Layer', 'Asset production, prompt architecture, motion, caption packaging, publish readiness', 'marketing brief + QA-approved boundary + asset references', 'active-governance', true, true, true, 'Execution, not truth creation.'),
    ('dept-operations', 'Operations', 'operations', 'Operations Pack', 'Runtime / N8N + Ops Lead', 'Operations Layer', 'Workflow execution, routing, monitoring, run visibility', 'approved handoffs + runtime registry + execution logs', 'partial-operational', true, true, true, 'Becomes live only after read-only validation and rollout gate.'),
    ('dept-customer', 'Customer', 'customer', 'Customer Pack', 'CS / Support Lead', 'Customer Support Layer', 'Support intake, issue triage, escalation tracking, feedback loop', 'customer tickets + resolved issue logs + approved product truth', 'planned', true, true, true, 'Governed feedback loop-back channel.')
) as v(
  department_id,
  department_name,
  department_pack_key,
  department_pack_name,
  owner_role,
  owner_team,
  primary_purpose,
  canonical_truth_source,
  current_state,
  handoff_required,
  qa_required,
  human_review_required,
  notes
)
  on true
where r.registry_id = 'department_registry_v1'
on conflict (department_id) do update
set
  registry_id = excluded.registry_id,
  department_name = excluded.department_name,
  department_pack_key = excluded.department_pack_key,
  department_pack_name = excluded.department_pack_name,
  owner_role = excluded.owner_role,
  owner_team = excluded.owner_team,
  primary_purpose = excluded.primary_purpose,
  canonical_truth_source = excluded.canonical_truth_source,
  current_state = excluded.current_state,
  handoff_required = excluded.handoff_required,
  qa_required = excluded.qa_required,
  human_review_required = excluded.human_review_required,
  notes = excluded.notes,
  source_record_json = excluded.source_record_json;

insert into department_governance.department_registry_entry_actions (
  registry_entry_id,
  action_kind,
  action_text,
  sort_order
)
select
  e.id,
  v.action_kind,
  v.action_text,
  v.sort_order
from department_governance.department_registry_entries e
join (
  values
    ('dept-core-gov', 'ALLOWED', 'route', 1),
    ('dept-core-gov', 'ALLOWED', 'normalize', 2),
    ('dept-core-gov', 'ALLOWED', 'reconcile', 3),
    ('dept-core-gov', 'ALLOWED', 'block', 4),
    ('dept-core-gov', 'ALLOWED', 'escalate', 5),
    ('dept-core-gov', 'MUST_NOT', 'implement code', 1),
    ('dept-core-gov', 'MUST_NOT', 'self-approve', 2),
    ('dept-core-gov', 'MUST_NOT', 'mutate runtime truth', 3),
    ('dept-core-gov', 'MUST_NOT', 'choose canonical truth by convenience', 4),
    ('dept-business-truth', 'ALLOWED', 'validate truth', 1),
    ('dept-business-truth', 'ALLOWED', 'expose sanitized read models', 2),
    ('dept-business-truth', 'ALLOWED', 'enforce ownership boundaries', 3),
    ('dept-business-truth', 'ALLOWED', 'emit canonical package records', 4),
    ('dept-business-truth', 'MUST_NOT', 'let marketing set price', 1),
    ('dept-business-truth', 'MUST_NOT', 'let UI compute money truth', 2),
    ('dept-business-truth', 'MUST_NOT', 'let marketing infer identity', 3),
    ('dept-business-truth', 'MUST_NOT', 'let runtime decide financial truth', 4),
    ('dept-marketing', 'ALLOWED', 'analyze', 1),
    ('dept-marketing', 'ALLOWED', 'translate', 2),
    ('dept-marketing', 'ALLOWED', 'brief', 3),
    ('dept-marketing', 'ALLOWED', 'sequence', 4),
    ('dept-marketing', 'ALLOWED', 'coordinate', 5),
    ('dept-marketing', 'ALLOWED', 'escalate', 6),
    ('dept-marketing', 'MUST_NOT', 'mutate billing truth', 1),
    ('dept-marketing', 'MUST_NOT', 'mutate auth truth', 2),
    ('dept-marketing', 'MUST_NOT', 'mutate runtime truth', 3),
    ('dept-marketing', 'MUST_NOT', 'self-launch', 4),
    ('dept-marketing', 'MUST_NOT', 'fabricate proof', 5),
    ('dept-media', 'ALLOWED', 'produce', 1),
    ('dept-media', 'ALLOWED', 'adapt', 2),
    ('dept-media', 'ALLOWED', 'package', 3),
    ('dept-media', 'ALLOWED', 'QA', 4),
    ('dept-media', 'ALLOWED', 'prepare publish-ready assets', 5),
    ('dept-media', 'ALLOWED', 'capture performance after publish', 6),
    ('dept-media', 'MUST_NOT', 'change offer truth', 1),
    ('dept-media', 'MUST_NOT', 'widen claims', 2),
    ('dept-media', 'MUST_NOT', 'publish without QA', 3),
    ('dept-media', 'MUST_NOT', 'rewrite strategy', 4),
    ('dept-operations', 'ALLOWED', 'execute approved flows', 1),
    ('dept-operations', 'ALLOWED', 'monitor queues', 2),
    ('dept-operations', 'ALLOWED', 'report status', 3),
    ('dept-operations', 'ALLOWED', 'route escalation', 4),
    ('dept-operations', 'MUST_NOT', 'decide canonical truth', 1),
    ('dept-operations', 'MUST_NOT', 'self-approve', 2),
    ('dept-operations', 'MUST_NOT', 'mutate policy', 3),
    ('dept-operations', 'MUST_NOT', 'bypass registry', 4),
    ('dept-customer', 'ALLOWED', 'intake', 1),
    ('dept-customer', 'ALLOWED', 'triage', 2),
    ('dept-customer', 'ALLOWED', 'escalate', 3),
    ('dept-customer', 'ALLOWED', 'summarize feedback', 4),
    ('dept-customer', 'MUST_NOT', 'rewrite offer truth', 1),
    ('dept-customer', 'MUST_NOT', 'invent resolutions', 2),
    ('dept-customer', 'MUST_NOT', 'bypass escalation', 3),
    ('dept-customer', 'MUST_NOT', 'mutate pricing or identity', 4)
) as v(department_id, action_kind, action_text, sort_order)
  on e.department_id = v.department_id
on conflict (registry_entry_id, action_kind, action_text) do update
set sort_order = excluded.sort_order;

insert into department_governance.department_registry_entry_dependencies (
  registry_entry_id,
  dependency_department_name,
  dependency_department_entry_id,
  sort_order
)
select
  source_entry.id,
  v.dependency_department_name,
  target_entry.id,
  v.sort_order
from department_governance.department_registry_entries source_entry
join (
  values
    ('dept-business-truth', 'Core Governance', 1),
    ('dept-marketing', 'Core Governance', 1),
    ('dept-marketing', 'Business Truth', 2),
    ('dept-media', 'Marketing', 1),
    ('dept-media', 'Core Governance', 2),
    ('dept-operations', 'Core Governance', 1),
    ('dept-operations', 'Business Truth', 2),
    ('dept-customer', 'Core Governance', 1),
    ('dept-customer', 'Business Truth', 2),
    ('dept-customer', 'Marketing', 3)
) as v(department_id, dependency_department_name, sort_order)
  on source_entry.department_id = v.department_id
join department_governance.department_registry_entries target_entry
  on target_entry.department_name = v.dependency_department_name
on conflict (registry_entry_id, dependency_department_name) do update
set
  dependency_department_entry_id = excluded.dependency_department_entry_id,
  sort_order = excluded.sort_order;

insert into department_governance.department_registry_entry_recipients (
  registry_entry_id,
  recipient_department_name,
  recipient_department_entry_id,
  sort_order
)
select
  source_entry.id,
  v.recipient_department_name,
  target_entry.id,
  v.sort_order
from department_governance.department_registry_entries source_entry
join (
  values
    ('dept-core-gov', 'all departments', 1),
    ('dept-business-truth', 'Marketing', 1),
    ('dept-business-truth', 'Media', 2),
    ('dept-business-truth', 'Operations', 3),
    ('dept-business-truth', 'Customer', 4),
    ('dept-marketing', 'Media', 1),
    ('dept-marketing', 'Operations', 2),
    ('dept-marketing', 'Human', 3),
    ('dept-media', 'QA', 1),
    ('dept-media', 'Distribution', 2),
    ('dept-media', 'Performance Memory', 3),
    ('dept-operations', 'Human', 1),
    ('dept-operations', 'Governance Relay', 2),
    ('dept-operations', 'department owners', 3),
    ('dept-customer', 'Marketing', 1),
    ('dept-customer', 'Product', 2),
    ('dept-customer', 'Operations', 3),
    ('dept-customer', 'Human', 4)
) as v(department_id, recipient_department_name, sort_order)
  on source_entry.department_id = v.department_id
left join department_governance.department_registry_entries target_entry
  on target_entry.department_name = v.recipient_department_name
on conflict (registry_entry_id, recipient_department_name) do update
set
  recipient_department_entry_id = excluded.recipient_department_entry_id,
  sort_order = excluded.sort_order;

insert into department_governance.department_pack_owners (
  pack_id,
  owner_label,
  sort_order
)
select
  p.id,
  v.owner_label,
  v.sort_order
from department_governance.department_packs p
join (
  values
    ('core_governance', 'Human / Executive', 1),
    ('core_governance', 'Governance Relay', 2),
    ('business_truth', 'Finance / Billing', 1),
    ('business_truth', 'Auth / Identity', 2),
    ('business_truth', 'Product / Offer Governance', 3),
    ('marketing', 'Chief Marketing Agent', 1),
    ('media', 'Media Lead', 1),
    ('operations', 'Runtime / N8N', 1),
    ('operations', 'Ops Lead', 2),
    ('customer', 'CS / Support Lead', 1)
) as v(pack_key, owner_label, sort_order)
  on p.pack_key = v.pack_key
on conflict (pack_id, owner_label) do update
set sort_order = excluded.sort_order;

insert into department_governance.department_pack_truth_sources (
  pack_id,
  truth_source_text,
  sort_order
)
select
  p.id,
  v.truth_source_text,
  v.sort_order
from department_governance.department_packs p
join (
  values
    ('core_governance', 'constitution', 1),
    ('core_governance', 'protocol', 2),
    ('core_governance', 'registry', 3),
    ('business_truth', 'billing services', 1),
    ('business_truth', 'auth services', 2),
    ('business_truth', 'product truth', 3),
    ('business_truth', 'package truth', 4),
    ('marketing', 'approved product/business truth', 1),
    ('marketing', 'market signals', 2),
    ('marketing', 'proof references', 3),
    ('media', 'marketing brief', 1),
    ('media', 'QA-approved boundary', 2),
    ('media', 'asset references', 3),
    ('operations', 'approved handoffs', 1),
    ('operations', 'runtime registry', 2),
    ('operations', 'execution logs', 3),
    ('customer', 'customer tickets', 1),
    ('customer', 'resolved issue logs', 2),
    ('customer', 'approved product truth', 3)
) as v(pack_key, truth_source_text, sort_order)
  on p.pack_key = v.pack_key
on conflict (pack_id, truth_source_text) do update
set sort_order = excluded.sort_order;

insert into department_governance.department_pack_actions (
  pack_id,
  action_kind,
  action_text,
  sort_order
)
select
  p.id,
  v.action_kind,
  v.action_text,
  v.sort_order
from department_governance.department_packs p
join (
  values
    ('core_governance', 'ALLOWED', 'route', 1),
    ('core_governance', 'ALLOWED', 'normalize', 2),
    ('core_governance', 'ALLOWED', 'reconcile', 3),
    ('core_governance', 'ALLOWED', 'block', 4),
    ('core_governance', 'ALLOWED', 'escalate', 5),
    ('core_governance', 'MUST_NOT', 'implement code', 1),
    ('core_governance', 'MUST_NOT', 'self-approve', 2),
    ('core_governance', 'MUST_NOT', 'mutate runtime truth', 3),
    ('business_truth', 'ALLOWED', 'validate truth', 1),
    ('business_truth', 'ALLOWED', 'expose sanitized read models', 2),
    ('business_truth', 'ALLOWED', 'enforce ownership boundaries', 3),
    ('business_truth', 'ALLOWED', 'emit canonical package records', 4),
    ('business_truth', 'MUST_NOT', 'let marketing set price', 1),
    ('business_truth', 'MUST_NOT', 'let UI compute money truth', 2),
    ('business_truth', 'MUST_NOT', 'let marketing infer identity', 3),
    ('business_truth', 'MUST_NOT', 'let runtime decide financial truth', 4),
    ('marketing', 'ALLOWED', 'analyze', 1),
    ('marketing', 'ALLOWED', 'position', 2),
    ('marketing', 'ALLOWED', 'translate', 3),
    ('marketing', 'ALLOWED', 'sequence', 4),
    ('marketing', 'ALLOWED', 'brief', 5),
    ('marketing', 'ALLOWED', 'coordinate', 6),
    ('marketing', 'ALLOWED', 'escalate', 7),
    ('marketing', 'MUST_NOT', 'mutate billing/auth/runtime truth', 1),
    ('marketing', 'MUST_NOT', 'self-launch', 2),
    ('marketing', 'MUST_NOT', 'fabricate proof', 3),
    ('marketing', 'MUST_NOT', 'widen claim boundaries', 4),
    ('marketing', 'MUST_NOT', 'bypass approval gate', 5),
    ('media', 'ALLOWED', 'produce', 1),
    ('media', 'ALLOWED', 'adapt', 2),
    ('media', 'ALLOWED', 'package', 3),
    ('media', 'ALLOWED', 'QA', 4),
    ('media', 'ALLOWED', 'prepare publish-ready assets', 5),
    ('media', 'ALLOWED', 'capture performance after publish', 6),
    ('media', 'MUST_NOT', 'change offer truth', 1),
    ('media', 'MUST_NOT', 'widen claims', 2),
    ('media', 'MUST_NOT', 'publish without QA', 3),
    ('media', 'MUST_NOT', 'rewrite strategy', 4),
    ('operations', 'ALLOWED', 'execute approved flows', 1),
    ('operations', 'ALLOWED', 'monitor queues', 2),
    ('operations', 'ALLOWED', 'report status', 3),
    ('operations', 'ALLOWED', 'route escalation', 4),
    ('operations', 'MUST_NOT', 'decide canonical truth', 1),
    ('operations', 'MUST_NOT', 'self-approve', 2),
    ('operations', 'MUST_NOT', 'mutate policy', 3),
    ('operations', 'MUST_NOT', 'bypass registry', 4),
    ('customer', 'ALLOWED', 'intake', 1),
    ('customer', 'ALLOWED', 'triage', 2),
    ('customer', 'ALLOWED', 'escalate', 3),
    ('customer', 'ALLOWED', 'summarize feedback', 4),
    ('customer', 'MUST_NOT', 'rewrite offer truth', 1),
    ('customer', 'MUST_NOT', 'invent resolutions', 2),
    ('customer', 'MUST_NOT', 'bypass escalation', 3),
    ('customer', 'MUST_NOT', 'mutate pricing or identity', 4)
) as v(pack_key, action_kind, action_text, sort_order)
  on p.pack_key = v.pack_key
on conflict (pack_id, action_kind, action_text) do update
set sort_order = excluded.sort_order;

insert into department_governance.department_pack_dependencies (
  pack_id,
  dependency_department_name,
  dependency_department_entry_id,
  sort_order
)
select
  p.id,
  v.dependency_department_name,
  dep.id,
  v.sort_order
from department_governance.department_packs p
join (
  values
    ('business_truth', 'Core Governance', 1),
    ('marketing', 'Core Governance', 1),
    ('marketing', 'Business Truth', 2),
    ('media', 'Marketing', 1),
    ('media', 'Core Governance', 2),
    ('operations', 'Core Governance', 1),
    ('operations', 'Business Truth', 2),
    ('customer', 'Core Governance', 1),
    ('customer', 'Business Truth', 2),
    ('customer', 'Marketing', 3)
) as v(pack_key, dependency_department_name, sort_order)
  on p.pack_key = v.pack_key
join department_governance.department_registry_entries dep
  on dep.department_name = v.dependency_department_name
on conflict (pack_id, dependency_department_name) do update
set
  dependency_department_entry_id = excluded.dependency_department_entry_id,
  sort_order = excluded.sort_order;

insert into department_governance.department_pack_handoff_targets (
  pack_id,
  target_department_name,
  target_department_entry_id,
  sort_order
)
select
  p.id,
  v.target_department_name,
  tgt.id,
  v.sort_order
from department_governance.department_packs p
join (
  values
    ('core_governance', 'all departments', 1),
    ('business_truth', 'Marketing', 1),
    ('business_truth', 'Media', 2),
    ('business_truth', 'Operations', 3),
    ('business_truth', 'Customer', 4),
    ('marketing', 'Media', 1),
    ('marketing', 'Operations', 2),
    ('marketing', 'Human review when required', 3),
    ('media', 'QA', 1),
    ('media', 'Distribution', 2),
    ('media', 'Performance Memory', 3),
    ('media', 'Operations', 4),
    ('operations', 'Human', 1),
    ('operations', 'Governance Relay', 2),
    ('operations', 'department owners', 3),
    ('operations', 'Media', 4),
    ('customer', 'Marketing', 1),
    ('customer', 'Product', 2),
    ('customer', 'Operations', 3),
    ('customer', 'Human', 4)
) as v(pack_key, target_department_name, sort_order)
  on p.pack_key = v.pack_key
left join department_governance.department_registry_entries tgt
  on tgt.department_name = v.target_department_name
on conflict (pack_id, target_department_name) do update
set
  target_department_entry_id = excluded.target_department_entry_id,
  sort_order = excluded.sort_order;

insert into department_governance.cross_department_handoffs (
  source_department_entry_id,
  target_department_name,
  target_department_entry_id,
  relationship_type,
  is_active,
  sort_order
)
select
  src.id,
  v.target_department_name,
  tgt.id,
  v.relationship_type,
  true,
  v.sort_order
from department_governance.department_registry_entries src
join (
  values
    ('Business Truth', 'DEPENDENCY', 'Core Governance', 1),
    ('Marketing', 'DEPENDENCY', 'Core Governance', 1),
    ('Marketing', 'DEPENDENCY', 'Business Truth', 2),
    ('Media', 'DEPENDENCY', 'Marketing', 1),
    ('Media', 'DEPENDENCY', 'Core Governance', 2),
    ('Operations', 'DEPENDENCY', 'Core Governance', 1),
    ('Operations', 'DEPENDENCY', 'Business Truth', 2),
    ('Customer', 'DEPENDENCY', 'Core Governance', 1),
    ('Customer', 'DEPENDENCY', 'Business Truth', 2),
    ('Customer', 'DEPENDENCY', 'Marketing', 3),
    ('Core Governance', 'HANDOFF_TARGET', 'all departments', 1),
    ('Business Truth', 'HANDOFF_TARGET', 'Marketing', 1),
    ('Business Truth', 'HANDOFF_TARGET', 'Media', 2),
    ('Business Truth', 'HANDOFF_TARGET', 'Operations', 3),
    ('Business Truth', 'HANDOFF_TARGET', 'Customer', 4),
    ('Marketing', 'HANDOFF_TARGET', 'Media', 1),
    ('Marketing', 'HANDOFF_TARGET', 'Operations', 2),
    ('Marketing', 'HANDOFF_TARGET', 'Human', 3),
    ('Media', 'HANDOFF_TARGET', 'QA', 1),
    ('Media', 'HANDOFF_TARGET', 'Distribution', 2),
    ('Media', 'HANDOFF_TARGET', 'Performance Memory', 3),
    ('Media', 'HANDOFF_TARGET', 'Operations', 4),
    ('Operations', 'HANDOFF_TARGET', 'Human', 1),
    ('Operations', 'HANDOFF_TARGET', 'Governance Relay', 2),
    ('Operations', 'HANDOFF_TARGET', 'department owners', 3),
    ('Operations', 'HANDOFF_TARGET', 'Media', 4),
    ('Customer', 'HANDOFF_TARGET', 'Marketing', 1),
    ('Customer', 'HANDOFF_TARGET', 'Product', 2),
    ('Customer', 'HANDOFF_TARGET', 'Operations', 3),
    ('Customer', 'HANDOFF_TARGET', 'Human', 4)
) as v(source_department_name, relationship_type, target_department_name, sort_order)
  on src.department_name = v.source_department_name
left join department_governance.department_registry_entries tgt
  on tgt.department_name = v.target_department_name
on conflict (source_department_entry_id, target_department_name, relationship_type) do update
set
  target_department_entry_id = excluded.target_department_entry_id,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into department_governance.handoff_audit_log (
  cross_department_handoff_id,
  lineage_parent_audit_id,
  event_type,
  actor_type,
  actor_ref,
  before_state,
  after_state,
  reason,
  evidence_ref,
  request_id,
  event_hash
)
select
  h.id,
  null,
  'IMPORT',
  'SYSTEM',
  'department_governance_seed',
  null,
  'SEEDED',
  'canonical seed import',
  'department_governance bundle',
  gen_random_uuid(),
  encode(
    digest(
      concat_ws(
        '|',
        'department_governance_seed',
        src.department_name,
        h.relationship_type,
        h.target_department_name
      ),
      'sha256'
    ),
    'hex'
  )
from department_governance.cross_department_handoffs h
join department_governance.department_registry_entries src
  on src.id = h.source_department_entry_id
on conflict (event_hash) do nothing;

commit;
