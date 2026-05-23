-- Department Governance additive migration
-- Scope: isolated namespace for the canonical Department Governance bundle
-- Note: does not modify pn_os_ai_department tables or handoff_packets

begin;

create extension if not exists pgcrypto;

create schema if not exists department_governance;
revoke all on schema department_governance from public;

create or replace function department_governance.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function department_governance.reject_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'append-only table cannot be updated or deleted';
end;
$$;

create table if not exists department_governance.department_registries (
  id uuid primary key default gen_random_uuid(),
  registry_id text not null unique,
  registry_schema_version text not null,
  registry_name text not null,
  registry_status text not null,
  registry_mode text not null,
  registry_version text not null,
  source_of_truth text not null,
  owner_role text not null,
  source_bundle_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_registries_registry_id_format
    check (registry_id ~ '^[a-z0-9_]+$'),
  constraint department_registries_status_check
    check (registry_status in ('DRAFT_SEED', 'ACTIVE', 'DEPRECATED'))
);

create table if not exists department_governance.department_packs (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references department_governance.department_registries(id) on delete restrict,
  pack_key text not null unique,
  pack_name text not null unique,
  qa_expectation text not null,
  source_pack_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_packs_pack_key_format
    check (pack_key ~ '^[a-z0-9_]+$')
);

create table if not exists department_governance.department_registry_entries (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references department_governance.department_registries(id) on delete restrict,
  department_id text not null unique,
  department_name text not null unique,
  department_pack_key text not null references department_governance.department_packs(pack_key) on delete restrict,
  department_pack_name text not null,
  owner_role text not null,
  owner_team text not null,
  primary_purpose text not null,
  canonical_truth_source text not null,
  current_state text not null,
  handoff_required boolean not null default true,
  qa_required boolean not null default true,
  human_review_required boolean not null default true,
  notes text not null default '',
  source_record_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_registry_entries_department_id_format
    check (department_id ~ '^dept-[a-z0-9-]+$'),
  constraint department_registry_entries_current_state_check
    check (current_state in ('active-governance', 'partial-operational', 'planned'))
);

create table if not exists department_governance.department_registry_entry_actions (
  id uuid primary key default gen_random_uuid(),
  registry_entry_id uuid not null references department_governance.department_registry_entries(id) on delete restrict,
  action_kind text not null,
  action_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_registry_entry_actions_kind_check
    check (action_kind in ('ALLOWED', 'MUST_NOT')),
  constraint department_registry_entry_actions_unique
    unique (registry_entry_id, action_kind, action_text)
);

create table if not exists department_governance.department_registry_entry_dependencies (
  id uuid primary key default gen_random_uuid(),
  registry_entry_id uuid not null references department_governance.department_registry_entries(id) on delete restrict,
  dependency_department_name text not null,
  dependency_department_entry_id uuid references department_governance.department_registry_entries(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_registry_entry_dependencies_unique
    unique (registry_entry_id, dependency_department_name),
  constraint department_registry_entry_dependencies_target_check
    check (dependency_department_name <> '')
);

create table if not exists department_governance.department_registry_entry_recipients (
  id uuid primary key default gen_random_uuid(),
  registry_entry_id uuid not null references department_governance.department_registry_entries(id) on delete restrict,
  recipient_department_name text not null,
  recipient_department_entry_id uuid references department_governance.department_registry_entries(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_registry_entry_recipients_unique
    unique (registry_entry_id, recipient_department_name),
  constraint department_registry_entry_recipients_target_check
    check (recipient_department_name <> '')
);

create table if not exists department_governance.department_pack_owners (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references department_governance.department_packs(id) on delete restrict,
  owner_label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_pack_owners_unique
    unique (pack_id, owner_label)
);

create table if not exists department_governance.department_pack_truth_sources (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references department_governance.department_packs(id) on delete restrict,
  truth_source_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_pack_truth_sources_unique
    unique (pack_id, truth_source_text)
);

create table if not exists department_governance.department_pack_actions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references department_governance.department_packs(id) on delete restrict,
  action_kind text not null,
  action_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_pack_actions_kind_check
    check (action_kind in ('ALLOWED', 'MUST_NOT')),
  constraint department_pack_actions_unique
    unique (pack_id, action_kind, action_text)
);

create table if not exists department_governance.department_pack_dependencies (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references department_governance.department_packs(id) on delete restrict,
  dependency_department_name text not null,
  dependency_department_entry_id uuid references department_governance.department_registry_entries(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_pack_dependencies_unique
    unique (pack_id, dependency_department_name),
  constraint department_pack_dependencies_target_check
    check (dependency_department_name <> '')
);

create table if not exists department_governance.department_pack_handoff_targets (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references department_governance.department_packs(id) on delete restrict,
  target_department_name text not null,
  target_department_entry_id uuid references department_governance.department_registry_entries(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_pack_handoff_targets_unique
    unique (pack_id, target_department_name),
  constraint department_pack_handoff_targets_target_check
    check (target_department_name <> '')
);

create table if not exists department_governance.cross_department_handoffs (
  id uuid primary key default gen_random_uuid(),
  source_department_entry_id uuid not null references department_governance.department_registry_entries(id) on delete restrict,
  target_department_name text not null,
  target_department_entry_id uuid references department_governance.department_registry_entries(id) on delete restrict,
  relationship_type text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cross_department_handoffs_relationship_type_check
    check (relationship_type in ('DEPENDENCY', 'HANDOFF_TARGET')),
  constraint cross_department_handoffs_unique
    unique (source_department_entry_id, target_department_name, relationship_type),
  constraint cross_department_handoffs_target_check
    check (target_department_name <> '')
);

create table if not exists department_governance.handoff_audit_log (
  id uuid primary key default gen_random_uuid(),
  cross_department_handoff_id uuid not null references department_governance.cross_department_handoffs(id) on delete restrict,
  lineage_parent_audit_id uuid references department_governance.handoff_audit_log(id) on delete set null,
  event_type text not null,
  actor_type text not null,
  actor_ref text not null,
  before_state text,
  after_state text,
  reason text not null,
  evidence_ref text,
  request_id uuid not null,
  event_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  constraint handoff_audit_log_event_type_check
    check (event_type in ('IMPORT', 'VALIDATION', 'STATE_CHANGE', 'LINK_UPDATE', 'ARCHIVE')),
  constraint handoff_audit_log_actor_type_check
    check (actor_type in ('HUMAN', 'AGENT', 'SYSTEM', 'N8N', 'SERVICE')),
  constraint handoff_audit_log_event_hash_format
    check (event_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists department_registries_registry_status_idx
  on department_governance.department_registries (registry_status, registry_version);

create index if not exists department_packs_registry_id_idx
  on department_governance.department_packs (registry_id, pack_key);

create index if not exists department_registry_entries_registry_id_idx
  on department_governance.department_registry_entries (registry_id, department_name);

create index if not exists department_registry_entry_actions_registry_entry_id_idx
  on department_governance.department_registry_entry_actions (registry_entry_id, action_kind, sort_order);

create index if not exists department_registry_entry_dependencies_registry_entry_id_idx
  on department_governance.department_registry_entry_dependencies (registry_entry_id, sort_order);

create index if not exists department_registry_entry_recipients_registry_entry_id_idx
  on department_governance.department_registry_entry_recipients (registry_entry_id, sort_order);

create index if not exists department_pack_owners_pack_id_idx
  on department_governance.department_pack_owners (pack_id, sort_order);

create index if not exists department_pack_truth_sources_pack_id_idx
  on department_governance.department_pack_truth_sources (pack_id, sort_order);

create index if not exists department_pack_actions_pack_id_idx
  on department_governance.department_pack_actions (pack_id, action_kind, sort_order);

create index if not exists department_pack_dependencies_pack_id_idx
  on department_governance.department_pack_dependencies (pack_id, sort_order);

create index if not exists department_pack_handoff_targets_pack_id_idx
  on department_governance.department_pack_handoff_targets (pack_id, sort_order);

create index if not exists cross_department_handoffs_source_target_idx
  on department_governance.cross_department_handoffs (source_department_entry_id, relationship_type, target_department_name);

create index if not exists cross_department_handoffs_target_idx
  on department_governance.cross_department_handoffs (target_department_name, relationship_type);

create index if not exists handoff_audit_log_cross_handoff_created_at_idx
  on department_governance.handoff_audit_log (cross_department_handoff_id, created_at);

create trigger department_registries_touch_updated_at
before update on department_governance.department_registries
for each row execute function department_governance.touch_updated_at();

create trigger department_packs_touch_updated_at
before update on department_governance.department_packs
for each row execute function department_governance.touch_updated_at();

create trigger department_registry_entries_touch_updated_at
before update on department_governance.department_registry_entries
for each row execute function department_governance.touch_updated_at();

create trigger department_registry_entry_actions_touch_updated_at
before update on department_governance.department_registry_entry_actions
for each row execute function department_governance.touch_updated_at();

create trigger department_registry_entry_dependencies_touch_updated_at
before update on department_governance.department_registry_entry_dependencies
for each row execute function department_governance.touch_updated_at();

create trigger department_registry_entry_recipients_touch_updated_at
before update on department_governance.department_registry_entry_recipients
for each row execute function department_governance.touch_updated_at();

create trigger department_pack_owners_touch_updated_at
before update on department_governance.department_pack_owners
for each row execute function department_governance.touch_updated_at();

create trigger department_pack_truth_sources_touch_updated_at
before update on department_governance.department_pack_truth_sources
for each row execute function department_governance.touch_updated_at();

create trigger department_pack_actions_touch_updated_at
before update on department_governance.department_pack_actions
for each row execute function department_governance.touch_updated_at();

create trigger department_pack_dependencies_touch_updated_at
before update on department_governance.department_pack_dependencies
for each row execute function department_governance.touch_updated_at();

create trigger department_pack_handoff_targets_touch_updated_at
before update on department_governance.department_pack_handoff_targets
for each row execute function department_governance.touch_updated_at();

create trigger cross_department_handoffs_touch_updated_at
before update on department_governance.cross_department_handoffs
for each row execute function department_governance.touch_updated_at();

create trigger handoff_audit_log_append_only
before update or delete on department_governance.handoff_audit_log
for each row execute function department_governance.reject_append_only_mutation();

commit;
