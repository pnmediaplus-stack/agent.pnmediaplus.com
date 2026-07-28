-- PN OS AI Department Phase 1 App Schema
-- Derived from __reference/database/DATABASE SYSTEM ARCHITECT v1.7.txt
-- Purpose: additive Supabase/Postgres package for the current Phase 1 app needs
-- Scope: local / internal / mock-first friendly, with frontend contract views
-- Notes:
-- - No RLS enabled here.
-- - No runtime orchestration is implemented here.
-- - This package is meant to be run in a clean database or reviewed as a dry-run migration.

begin;

create extension if not exists pgcrypto;

create schema if not exists pn_os_ai_department;
revoke all on schema pn_os_ai_department from public;

create type pn_os_ai_department.lifecycle_state as enum (
  'NOT_STARTED',
  'DRAFT',
  'PARTIAL',
  'REVIEW',
  'HOLD',
  'BLOCKED',
  'READY_FOR_RECHECK',
  'PASS',
  'APPROVED',
  'DEPRECATED'
);

create type pn_os_ai_department.verdict_enum as enum (
  'PASS',
  'PASS_WITH_CONDITIONS',
  'HOLD',
  'BLOCKED',
  'REJECT',
  'NEEDS_PATCH',
  'READY_FOR_RECHECK'
);

create type pn_os_ai_department.actor_type_enum as enum (
  'HUMAN',
  'AGENT',
  'SYSTEM',
  'N8N',
  'SERVICE'
);

create type pn_os_ai_department.entity_type_enum as enum (
  'DEPARTMENT',
  'AGENT',
  'TASK',
  'ARTIFACT',
  'ARTIFACT_VERSION',
  'QA_REVIEW',
  'GATE',
  'APPROVAL',
  'WORKFLOW_RUN',
  'CHAT_THREAD',
  'CHAT_MESSAGE',
  'AUDIT_LOG',
  'HANDOFF_PACKET'
);

create type pn_os_ai_department.gate_kind_enum as enum (
  'REVIEW',
  'APPROVAL',
  'RUNTIME',
  'REGISTRY'
);

create type pn_os_ai_department.ui_agent_status_enum as enum (
  'ONLINE',
  'IDLE',
  'BLOCKED'
);

create type pn_os_ai_department.workflow_run_status_enum as enum (
  'QUEUED',
  'RUNNING',
  'WAITING_ON_HUMAN',
  'SUCCEEDED',
  'FAILED'
);

create type pn_os_ai_department.chat_thread_status_enum as enum (
  'ACTIVE',
  'WAITING_ON_HUMAN',
  'CLOSED'
);

create type pn_os_ai_department.approval_status_enum as enum (
  'PENDING',
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED'
);

create type pn_os_ai_department.media_stage_status_enum as enum (
  'READY',
  'IN_PROGRESS',
  'HOLD',
  'BLOCKED',
  'DONE'
);

create or replace function pn_os_ai_department.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function pn_os_ai_department.reject_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'APPEND_ONLY_TABLE_MUTATION_FORBIDDEN: %', tg_table_name
    using errcode = 'P0001';
end;
$$;

create table pn_os_ai_department.departments (
  id uuid primary key default gen_random_uuid(),
  department_key text not null unique,
  canonical_name text not null,
  owner_label text not null default 'Human Founder',
  purpose text not null,
  description text,
  state pn_os_ai_department.lifecycle_state not null default 'DRAFT',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_department_key_format
    check (department_key ~ '^[a-z0-9_]+$')
);

create trigger departments_touch_updated_at
before update on pn_os_ai_department.departments
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.agents (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  agent_key text not null unique,
  canonical_name text not null,
  role_code text not null,
  role_label text not null,
  authority_scope text not null,
  operational_status pn_os_ai_department.ui_agent_status_enum not null default 'IDLE',
  focus_label text not null default '',
  state pn_os_ai_department.lifecycle_state not null default 'DRAFT',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_agent_key_format
    check (agent_key ~ '^[a-z0-9_]+$'),
  constraint agents_role_code_format
    check (role_code ~ '^[a-z0-9_]+$'),
  constraint agents_authority_scope_allowed
    check (authority_scope in ('READ_ONLY','REVIEW_ONLY','TASK_OWNER','DEPARTMENT_OWNER','SERVICE'))
);

create index agents_department_id_state_created_at_idx
  on pn_os_ai_department.agents (department_id, state, created_at);

create trigger agents_touch_updated_at
before update on pn_os_ai_department.agents
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.gates (
  id uuid primary key default gen_random_uuid(),
  gate_key text not null unique,
  canonical_name text not null,
  gate_kind pn_os_ai_department.gate_kind_enum not null,
  owner_department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  applies_to_entity_type pn_os_ai_department.entity_type_enum not null,
  required_verdicts pn_os_ai_department.verdict_enum[] not null default array['PASS'::pn_os_ai_department.verdict_enum],
  is_blocking boolean not null default true,
  state pn_os_ai_department.lifecycle_state not null default 'DRAFT',
  rule_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gates_gate_key_format
    check (gate_key ~ '^[a-z0-9_]+$')
);

create index gates_owner_department_id_state_created_at_idx
  on pn_os_ai_department.gates (owner_department_id, state, created_at);

create trigger gates_touch_updated_at
before update on pn_os_ai_department.gates
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.tasks (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  task_key text not null unique,
  title text not null,
  summary text,
  intent_type text not null default 'unknown',
  owner_label text not null default 'Human Founder',
  state pn_os_ai_department.lifecycle_state not null default 'NOT_STARTED',
  priority smallint not null default 50,
  gate_id uuid references pn_os_ai_department.gates(id) on delete set null,
  requester_actor_type pn_os_ai_department.actor_type_enum not null,
  requester_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  requester_external_ref text,
  owner_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  blocked_reason text,
  resolution_ref text,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_task_key_format
    check (task_key ~ '^[a-z0-9_]+$'),
  constraint tasks_priority_range
    check (priority between 1 and 100),
  constraint tasks_requester_ref_check
    check (
      (requester_actor_type = 'AGENT' and requester_agent_id is not null and requester_external_ref is null)
      or
      (requester_actor_type <> 'AGENT' and requester_external_ref is not null and requester_agent_id is null)
    )
);

create index tasks_department_id_state_priority_created_at_idx
  on pn_os_ai_department.tasks (department_id, state, priority, created_at);

create index tasks_owner_agent_id_state_created_at_idx
  on pn_os_ai_department.tasks (owner_agent_id, state, created_at);

create index tasks_gate_id_idx
  on pn_os_ai_department.tasks (gate_id);

create trigger tasks_touch_updated_at
before update on pn_os_ai_department.tasks
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.artifacts (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  task_id uuid references pn_os_ai_department.tasks(id) on delete set null,
  artifact_key text not null unique,
  canonical_name text not null,
  artifact_type text not null,
  version_label text not null default 'v1.0',
  state pn_os_ai_department.lifecycle_state not null default 'DRAFT',
  creator_actor_type pn_os_ai_department.actor_type_enum not null,
  creator_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  creator_external_ref text,
  qa_owner_id uuid references pn_os_ai_department.agents(id) on delete set null,
  final_authority_type pn_os_ai_department.actor_type_enum,
  final_authority_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  final_authority_external_ref text,
  parent_artifact_id uuid references pn_os_ai_department.artifacts(id) on delete set null,
  evidence_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artifacts_artifact_key_format
    check (artifact_key ~ '^[a-z0-9_]+$'),
  constraint artifacts_creator_ref_check
    check (
      (creator_actor_type = 'AGENT' and creator_agent_id is not null and creator_external_ref is null)
      or
      (creator_actor_type <> 'AGENT' and creator_external_ref is not null and creator_agent_id is null)
    ),
  constraint artifacts_final_authority_ref_check
    check (
      final_authority_type is null
      or
      (final_authority_type = 'AGENT' and final_authority_agent_id is not null and final_authority_external_ref is null)
      or
      (final_authority_type <> 'AGENT' and final_authority_external_ref is not null and final_authority_agent_id is null)
    )
);

create index artifacts_department_id_state_created_at_idx
  on pn_os_ai_department.artifacts (department_id, state, created_at);

create index artifacts_task_id_idx
  on pn_os_ai_department.artifacts (task_id);

create index artifacts_parent_artifact_id_idx
  on pn_os_ai_department.artifacts (parent_artifact_id);

create trigger artifacts_touch_updated_at
before update on pn_os_ai_department.artifacts
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references pn_os_ai_department.artifacts(id) on delete restrict,
  version_number integer not null,
  state pn_os_ai_department.lifecycle_state not null default 'DRAFT',
  created_by_actor_type pn_os_ai_department.actor_type_enum not null,
  created_by_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  created_by_external_ref text,
  parent_artifact_version_id uuid references pn_os_ai_department.artifact_versions(id) on delete set null,
  source_task_id uuid references pn_os_ai_department.tasks(id) on delete set null,
  content_ref text not null,
  content_sha256 char(64) not null,
  dependency_artifact_ids uuid[] not null default '{}'::uuid[],
  dependency_version_ids uuid[] not null default '{}'::uuid[],
  evidence_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artifact_versions_version_number_positive
    check (version_number > 0),
  constraint artifact_versions_content_sha256_format
    check (content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint artifact_versions_creator_ref_check
    check (
      (created_by_actor_type = 'AGENT' and created_by_agent_id is not null and created_by_external_ref is null)
      or
      (created_by_actor_type <> 'AGENT' and created_by_external_ref is not null and created_by_agent_id is null)
    ),
  constraint artifact_versions_unique_per_artifact
    unique (artifact_id, version_number)
);

create index artifact_versions_artifact_id_created_at_idx
  on pn_os_ai_department.artifact_versions (artifact_id, created_at);

create index artifact_versions_parent_artifact_version_id_idx
  on pn_os_ai_department.artifact_versions (parent_artifact_version_id);

create index artifact_versions_dependency_artifact_ids_gin_idx
  on pn_os_ai_department.artifact_versions using gin (dependency_artifact_ids);

create index artifact_versions_dependency_version_ids_gin_idx
  on pn_os_ai_department.artifact_versions using gin (dependency_version_ids);

create trigger artifact_versions_touch_updated_at
before update on pn_os_ai_department.artifact_versions
for each row execute function pn_os_ai_department.touch_updated_at();

alter table pn_os_ai_department.artifacts
  add column current_version_id uuid;

alter table pn_os_ai_department.artifacts
  add constraint artifacts_current_version_fk
  foreign key (current_version_id)
  references pn_os_ai_department.artifact_versions(id)
  on delete set null;

create index artifacts_current_version_id_idx
  on pn_os_ai_department.artifacts (current_version_id);

create table pn_os_ai_department.qa_reviews (
  id uuid primary key default gen_random_uuid(),
  artifact_version_id uuid not null references pn_os_ai_department.artifact_versions(id) on delete restrict,
  task_id uuid references pn_os_ai_department.tasks(id) on delete set null,
  reviewer_actor_type pn_os_ai_department.actor_type_enum not null,
  reviewer_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  reviewer_external_ref text,
  verdict pn_os_ai_department.verdict_enum not null,
  notes text,
  evidence_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qa_reviews_reviewer_ref_check
    check (
      (reviewer_actor_type = 'AGENT' and reviewer_agent_id is not null and reviewer_external_ref is null)
      or
      (reviewer_actor_type <> 'AGENT' and reviewer_external_ref is not null and reviewer_agent_id is null)
    )
);

create index qa_reviews_artifact_version_id_created_at_idx
  on pn_os_ai_department.qa_reviews (artifact_version_id, created_at);

create index qa_reviews_task_id_idx
  on pn_os_ai_department.qa_reviews (task_id);

create trigger qa_reviews_append_only
before update or delete on pn_os_ai_department.qa_reviews
for each row execute function pn_os_ai_department.reject_append_only_mutation();

create table pn_os_ai_department.approvals (
  id uuid primary key default gen_random_uuid(),
  gate_id uuid not null references pn_os_ai_department.gates(id) on delete restrict,
  entity_type pn_os_ai_department.entity_type_enum not null,
  entity_id uuid not null,
  approval_status pn_os_ai_department.approval_status_enum not null default 'REQUESTED',
  verdict pn_os_ai_department.verdict_enum,
  requested_by_actor_type pn_os_ai_department.actor_type_enum not null,
  requested_by_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  requested_by_external_ref text,
  requested_at timestamptz not null default now(),
  approver_actor_type pn_os_ai_department.actor_type_enum,
  approver_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  approver_external_ref text,
  decided_at timestamptz,
  evidence_ref text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approvals_requester_ref_check
    check (
      (requested_by_actor_type = 'AGENT' and requested_by_agent_id is not null and requested_by_external_ref is null)
      or
      (requested_by_actor_type <> 'AGENT' and requested_by_external_ref is not null and requested_by_agent_id is null)
    ),
  constraint approvals_approver_ref_check
    check (
      approver_actor_type is null
      or
      (approver_actor_type = 'AGENT' and approver_agent_id is not null and approver_external_ref is null)
      or
      (approver_actor_type <> 'AGENT' and approver_external_ref is not null and approver_agent_id is null)
    )
);

create index approvals_gate_id_entity_type_entity_id_created_at_idx
  on pn_os_ai_department.approvals (gate_id, entity_type, entity_id, created_at);

create index approvals_gate_id_created_at_idx
  on pn_os_ai_department.approvals (gate_id, created_at);

create trigger approvals_append_only
before update or delete on pn_os_ai_department.approvals
for each row execute function pn_os_ai_department.reject_append_only_mutation();

create table pn_os_ai_department.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  task_id uuid references pn_os_ai_department.tasks(id) on delete set null,
  workflow_key text not null unique,
  workflow_name text not null,
  n8n_execution_id text,
  idempotency_key text not null unique,
  external_run_id text unique,
  run_status pn_os_ai_department.workflow_run_status_enum not null default 'QUEUED',
  state pn_os_ai_department.lifecycle_state not null default 'NOT_STARTED',
  target_label text not null default 'n8n',
  duration_label text not null default '0s',
  started_at timestamptz,
  finished_at timestamptz,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb not null default '{}'::jsonb,
  created_by_actor_type pn_os_ai_department.actor_type_enum not null,
  created_by_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  created_by_external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_runs_workflow_key_format
    check (workflow_key ~ '^[a-z0-9_]+$'),
  constraint workflow_runs_created_by_ref_check
    check (
      (created_by_actor_type = 'AGENT' and created_by_agent_id is not null and created_by_external_ref is null)
      or
      (created_by_actor_type <> 'AGENT' and created_by_external_ref is not null and created_by_agent_id is null)
    )
);

create index workflow_runs_department_id_state_created_at_idx
  on pn_os_ai_department.workflow_runs (department_id, state, created_at);

create index workflow_runs_task_id_idx
  on pn_os_ai_department.workflow_runs (task_id);

create index workflow_runs_n8n_execution_id_idx
  on pn_os_ai_department.workflow_runs (n8n_execution_id);

create trigger workflow_runs_touch_updated_at
before update on pn_os_ai_department.workflow_runs
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.chat_threads (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  task_id uuid references pn_os_ai_department.tasks(id) on delete set null,
  thread_key text not null unique,
  subject text,
  purpose text,
  state pn_os_ai_department.lifecycle_state not null default 'NOT_STARTED',
  thread_status pn_os_ai_department.chat_thread_status_enum not null default 'ACTIVE',
  opened_by_actor_type pn_os_ai_department.actor_type_enum not null,
  opened_by_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  opened_by_external_ref text,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_thread_key_format
    check (thread_key ~ '^[a-z0-9_]+$'),
  constraint chat_threads_opened_by_ref_check
    check (
      (opened_by_actor_type = 'AGENT' and opened_by_agent_id is not null and opened_by_external_ref is null)
      or
      (opened_by_actor_type <> 'AGENT' and opened_by_external_ref is not null and opened_by_agent_id is null)
    )
);

create index chat_threads_department_id_state_created_at_idx
  on pn_os_ai_department.chat_threads (department_id, state, created_at);

create index chat_threads_task_id_idx
  on pn_os_ai_department.chat_threads (task_id);

create trigger chat_threads_touch_updated_at
before update on pn_os_ai_department.chat_threads
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references pn_os_ai_department.chat_threads(id) on delete restrict,
  message_seq integer not null,
  actor_type pn_os_ai_department.actor_type_enum not null,
  actor_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  actor_external_ref text,
  message_kind text not null,
  content text not null,
  content_format text not null default 'markdown',
  intent_type text,
  target_department_id uuid references pn_os_ai_department.departments(id) on delete set null,
  target_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_messages_message_seq_positive
    check (message_seq > 0),
  constraint chat_messages_kind_allowed
    check (message_kind in ('COMMAND','RESPONSE','SYSTEM','NOTE','QUESTION')),
  constraint chat_messages_format_allowed
    check (content_format in ('plain_text','markdown','json')),
  constraint chat_messages_actor_ref_check
    check (
      (actor_type = 'AGENT' and actor_agent_id is not null and actor_external_ref is null)
      or
      (actor_type <> 'AGENT' and actor_external_ref is not null and actor_agent_id is null)
    ),
  constraint chat_messages_thread_seq_unique
    unique (thread_id, message_seq)
);

create index chat_messages_thread_id_created_at_idx
  on pn_os_ai_department.chat_messages (thread_id, created_at);

create trigger chat_messages_append_only
before update or delete on pn_os_ai_department.chat_messages
for each row execute function pn_os_ai_department.reject_append_only_mutation();

create table pn_os_ai_department.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type pn_os_ai_department.actor_type_enum not null,
  actor_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  actor_external_ref text,
  action text not null,
  entity_type pn_os_ai_department.entity_type_enum not null,
  entity_id uuid not null,
  before_state pn_os_ai_department.lifecycle_state,
  after_state pn_os_ai_department.lifecycle_state,
  reason text not null,
  evidence_ref text,
  request_id uuid not null,
  event_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audit_logs_actor_ref_check
    check (
      (actor_type = 'AGENT' and actor_agent_id is not null and actor_external_ref is null)
      or
      (actor_type <> 'AGENT' and actor_external_ref is not null and actor_agent_id is null)
    ),
  constraint audit_logs_event_hash_format
    check (event_hash ~ '^[a-f0-9]{64}$'),
  constraint audit_logs_state_pair_check
    check (before_state is not null or after_state is not null)
);

create index audit_logs_entity_type_entity_id_created_at_idx
  on pn_os_ai_department.audit_logs (entity_type, entity_id, created_at);

create index audit_logs_actor_type_created_at_idx
  on pn_os_ai_department.audit_logs (actor_type, created_at);

create trigger audit_logs_append_only
before update or delete on pn_os_ai_department.audit_logs
for each row execute function pn_os_ai_department.reject_append_only_mutation();

create trigger audit_logs_touch_updated_at
before update on pn_os_ai_department.audit_logs
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.handoff_packets (
  id uuid primary key default gen_random_uuid(),
  handoff_key text not null unique,
  from_department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  to_department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  source_task_id uuid references pn_os_ai_department.tasks(id) on delete set null,
  source_artifact_ids uuid[] not null default '{}'::uuid[],
  source_artifact_version_ids uuid[] not null default '{}'::uuid[],
  source_thread_id uuid references pn_os_ai_department.chat_threads(id) on delete set null,
  owner_role text not null,
  requested_decision pn_os_ai_department.verdict_enum not null,
  state pn_os_ai_department.lifecycle_state not null default 'DRAFT',
  reviewed_scope text not null,
  verified_facts text not null,
  assumptions text not null,
  risks text not null,
  blocking_conditions text not null,
  next_actions text not null,
  registry_refs text[] not null default '{}'::text[],
  created_by_actor_type pn_os_ai_department.actor_type_enum not null,
  created_by_agent_id uuid references pn_os_ai_department.agents(id) on delete set null,
  created_by_external_ref text,
  evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handoff_packets_handoff_key_format
    check (handoff_key ~ '^[a-z0-9_]+$'),
  constraint handoff_packets_created_by_ref_check
    check (
      (created_by_actor_type = 'AGENT' and created_by_agent_id is not null and created_by_external_ref is null)
      or
      (created_by_actor_type <> 'AGENT' and created_by_external_ref is not null and created_by_agent_id is null)
    )
);

create index handoff_packets_from_department_id_to_department_id_state_created_at_idx
  on pn_os_ai_department.handoff_packets (from_department_id, to_department_id, state, created_at);

create index handoff_packets_source_task_id_idx
  on pn_os_ai_department.handoff_packets (source_task_id);

create index handoff_packets_source_artifact_ids_gin_idx
  on pn_os_ai_department.handoff_packets using gin (source_artifact_ids);

create index handoff_packets_source_artifact_version_ids_gin_idx
  on pn_os_ai_department.handoff_packets using gin (source_artifact_version_ids);

create trigger handoff_packets_touch_updated_at
before update on pn_os_ai_department.handoff_packets
for each row execute function pn_os_ai_department.touch_updated_at();

create table pn_os_ai_department.media_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references pn_os_ai_department.departments(id) on delete restrict,
  stage_key text not null unique,
  stage_name text not null,
  status pn_os_ai_department.media_stage_status_enum not null default 'READY',
  owner_label text not null,
  note text not null,
  sort_order integer not null default 0,
  state pn_os_ai_department.lifecycle_state not null default 'PARTIAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_pipeline_stage_key_format
    check (stage_key ~ '^[a-z0-9_]+$')
);

create index media_pipeline_stages_department_id_sort_order_idx
  on pn_os_ai_department.media_pipeline_stages (department_id, sort_order);

create trigger media_pipeline_stages_touch_updated_at
before update on pn_os_ai_department.media_pipeline_stages
for each row execute function pn_os_ai_department.touch_updated_at();

create trigger artifact_versions_append_only
before update or delete on pn_os_ai_department.artifact_versions
for each row execute function pn_os_ai_department.reject_append_only_mutation();

create trigger chat_messages_touch_updated_at
before update on pn_os_ai_department.chat_messages
for each row execute function pn_os_ai_department.touch_updated_at();

create trigger qa_reviews_touch_updated_at
before update on pn_os_ai_department.qa_reviews
for each row execute function pn_os_ai_department.touch_updated_at();

create trigger approvals_touch_updated_at
before update on pn_os_ai_department.approvals
for each row execute function pn_os_ai_department.touch_updated_at();

insert into pn_os_ai_department.departments (
  department_key,
  canonical_name,
  owner_label,
  purpose,
  description,
  state
) values
  (
    'governance_core',
    'Marketing/Governance Core',
    'Human Founder',
    'Approval, governance, command intake, and state supervision.',
    'Canonical governance and policy authority',
    'APPROVED'
  ),
  (
    'pn_media_plus',
    'PN MEDIA PLUS Media Execution Department',
    'Media Lead',
    'Content operations, production coordination, and media pipeline monitoring.',
    'PN MEDIA PLUS operating department',
    'APPROVED'
  )
on conflict (department_key) do nothing;

insert into pn_os_ai_department.agents (
  department_id,
  agent_key,
  canonical_name,
  role_code,
  role_label,
  authority_scope,
  operational_status,
  focus_label,
  state,
  metadata
)
select
  d.id,
  v.agent_key,
  v.canonical_name,
  v.role_code,
  v.role_label,
  v.authority_scope,
  v.operational_status::pn_os_ai_department.ui_agent_status_enum,
  v.focus_label,
  'APPROVED'::pn_os_ai_department.lifecycle_state,
  '{}'::jsonb
from (
  values
    ('governance_core', 'governance_core_seed_registry_observer', 'Governance Core Seed Registry Observer', 'registry_observer', 'Command triage and safety checks', 'READ_ONLY', 'ONLINE', 'Human chat intake and approval routing'),
    ('governance_core', 'governance_core_seed_review_proxy', 'Governance Core Seed Review Proxy', 'review_proxy', 'Review reviewer notes', 'REVIEW_ONLY', 'IDLE', 'Artifact and gate validation'),
    ('pn_media_plus', 'pn_media_plus_seed_registry_observer', 'PN MEDIA PLUS Seed Registry Observer', 'registry_observer', 'Route media tasks', 'READ_ONLY', 'ONLINE', 'Campaign and asset task intake'),
    ('pn_media_plus', 'pn_media_plus_seed_pipeline_watcher', 'PN MEDIA PLUS Pipeline Watcher', 'pipeline_watcher', 'Monitor workflow runs', 'SERVICE', 'BLOCKED', 'n8n run health and handoffs')
) as v(department_key, agent_key, canonical_name, role_code, role_label, authority_scope, operational_status, focus_label)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
on conflict (agent_key) do nothing;

insert into pn_os_ai_department.gates (
  gate_key,
  canonical_name,
  gate_kind,
  owner_department_id,
  applies_to_entity_type,
  required_verdicts,
  is_blocking,
  state,
  rule_summary
)
select
  v.gate_key,
  v.canonical_name,
  v.gate_kind::pn_os_ai_department.gate_kind_enum,
  d.id,
  v.applies_to_entity_type::pn_os_ai_department.entity_type_enum,
  v.required_verdicts::pn_os_ai_department.verdict_enum[],
  v.is_blocking,
  v.state::pn_os_ai_department.lifecycle_state,
  v.rule_summary
from (
  values
    ('human_approval_gate', 'Human Approval Gate', 'APPROVAL', 'governance_core', 'TASK', array['PASS']::text[], true, 'REVIEW', 'No publish or launch action is allowed without explicit approval.'),
    ('qa_state_gate', 'QA State Gate', 'REVIEW', 'governance_core', 'ARTIFACT_VERSION', array['PASS']::text[], true, 'APPROVED', 'State transitions are guarded by the local state machine.'),
    ('media_release_gate', 'Media Release Gate', 'RUNTIME', 'pn_media_plus', 'TASK', array['PASS']::text[], true, 'BLOCKED', 'Media pipeline is internal only in Phase 1.')
) as v(gate_key, canonical_name, gate_kind, department_key, applies_to_entity_type, required_verdicts, is_blocking, state, rule_summary)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
on conflict (gate_key) do nothing;

insert into pn_os_ai_department.tasks (
  department_id,
  task_key,
  title,
  summary,
  intent_type,
  owner_label,
  state,
  priority,
  gate_id,
  requester_actor_type,
  requester_agent_id,
  requester_external_ref,
  owner_agent_id,
  blocked_reason,
  resolution_ref,
  due_at,
  started_at,
  completed_at,
  metadata
)
select
  d.id,
  v.task_key,
  v.title,
  v.summary,
  v.intent_type,
  v.owner_label,
  v.state::pn_os_ai_department.lifecycle_state,
  v.priority,
  g.id,
  v.requester_actor_type::pn_os_ai_department.actor_type_enum,
  ra.id,
  v.requester_external_ref,
  oa.id,
  v.blocked_reason,
  v.resolution_ref,
  v.due_at,
  v.started_at,
  v.completed_at,
  '{}'::jsonb
from (
  values
    -- Bổ sung giá trị `null` cho requester_agent_key (cột thứ 11) vì requester là HUMAN
    ('governance_core', 'task_001', 'Prepare launch-safe campaign summary', 'Draft a concise, launch-safe campaign summary for human review.', 'create_content', 'Human Founder', 'DRAFT', 20, 'human_approval_gate', 'HUMAN', null, 'Human Founder', 'governance_core_seed_registry_observer', null, null, null::timestamptz, null::timestamptz, null::timestamptz),
    ('pn_media_plus', 'task_002', 'Audit media pipeline state', 'Check the media pipeline board and identify current blockers.', 'request_status', 'Media Lead', 'REVIEW', 50, 'media_release_gate', 'HUMAN', null, 'Media Lead', 'pn_media_plus_seed_pipeline_watcher', null, null, null::timestamptz, null::timestamptz, null::timestamptz),
    ('governance_core', 'task_003', 'Review governance gate checklist', 'Confirm the gate checklist before any state promotion.', 'check_governance', 'Human Founder', 'HOLD', 10, 'qa_state_gate', 'HUMAN', null, 'Human Founder', null, 'Needs blocker resolution before recheck.', null, null::timestamptz, null::timestamptz, null::timestamptz)
) as v(department_key, task_key, title, summary, intent_type, owner_label, state, priority, gate_key, requester_actor_type, requester_agent_key, requester_external_ref, owner_agent_key, blocked_reason, resolution_ref, due_at, started_at, completed_at)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
left join pn_os_ai_department.gates g
  on g.gate_key = v.gate_key
left join pn_os_ai_department.agents ra
  on ra.agent_key = v.requester_agent_key -- Đã sửa lỗi hardcode
left join pn_os_ai_department.agents oa
  on oa.agent_key = v.owner_agent_key
on conflict (task_key) do nothing;

insert into pn_os_ai_department.artifacts (
  department_id,
  task_id,
  artifact_key,
  canonical_name,
  artifact_type,
  version_label,
  state,
  creator_actor_type,
  creator_agent_id,
  creator_external_ref,
  qa_owner_id,
  final_authority_type,
  final_authority_agent_id,
  final_authority_external_ref,
  parent_artifact_id,
  evidence_notes,
  metadata
)
select
  d.id,
  t.id,
  v.artifact_key,
  v.canonical_name,
  v.artifact_type,
  v.version_label,
  v.state::pn_os_ai_department.lifecycle_state,
  v.creator_actor_type::pn_os_ai_department.actor_type_enum,
  ca.id,
  v.creator_external_ref,
  qa.id,
  v.final_authority_type::pn_os_ai_department.actor_type_enum,
  fa.id,
  v.final_authority_external_ref,
  parent.id,
  v.evidence_notes,
  '{}'::jsonb
from (
  values
    -- Bổ sung giá trị `null` cho creator_agent_key (cột thứ 9) vì creator là HUMAN
    ('governance_core', 'task_001', 'artifact_001', 'Phase 1 Scaffold Plan', 'brief', 'v1.0', 'APPROVED', 'HUMAN', null, 'Human Founder', 'governance_core_seed_review_proxy', 'AGENT', 'governance_core_seed_review_proxy', null, null, 'Approved as a registry sample.'),
    ('pn_media_plus', 'task_002', 'artifact_002', 'Media Pipeline Board Draft', 'workflow', 'v0.8', 'REVIEW', 'HUMAN', null, 'Media Lead', 'pn_media_plus_seed_registry_observer', 'AGENT', 'pn_media_plus_seed_registry_observer', null, null, 'Needs media-owner confirmation before state promotion.'),
    ('governance_core', 'task_003', 'artifact_003', 'Governance Prompt Patch', 'prompt', 'v1.1', 'PASS', 'HUMAN', null, 'Human Founder', 'governance_core_seed_review_proxy', 'AGENT', 'governance_core_seed_review_proxy', null, null, 'Prompt patch references launch semantics and must stay gated.')
) as v(department_key, task_key, artifact_key, canonical_name, artifact_type, version_label, state, creator_actor_type, creator_agent_key, creator_external_ref, qa_owner_agent_key, final_authority_type, final_authority_agent_key, final_authority_external_ref, parent_artifact_key, evidence_notes)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
left join pn_os_ai_department.tasks t
  on t.task_key = v.task_key
left join pn_os_ai_department.agents ca
  on ca.agent_key = v.creator_agent_key -- Đã sửa lỗi hardcode
left join pn_os_ai_department.agents qa
  on qa.agent_key = v.qa_owner_agent_key
left join pn_os_ai_department.agents fa
  on fa.agent_key = v.final_authority_agent_key
left join pn_os_ai_department.artifacts parent
  on parent.artifact_key = v.parent_artifact_key
on conflict (artifact_key) do nothing;

insert into pn_os_ai_department.artifact_versions (
  artifact_id,
  version_number,
  state,
  created_by_actor_type,
  created_by_agent_id,
  created_by_external_ref,
  parent_artifact_version_id,
  source_task_id,
  content_ref,
  content_sha256,
  dependency_artifact_ids,
  dependency_version_ids,
  evidence_notes
)
select
  a.id,
  1,
  a.state,
  'HUMAN'::pn_os_ai_department.actor_type_enum,
  null,
  'Human Founder',
  null,
  t.id,
  'registry://artifact/' || a.artifact_key || '/v1',
  encode(digest(a.artifact_key::text, 'sha256'), 'hex'),
  '{}'::uuid[],
  '{}'::uuid[],
  a.evidence_notes
from pn_os_ai_department.artifacts a
left join pn_os_ai_department.tasks t
  on t.id = a.task_id
on conflict (artifact_id, version_number) do nothing;

update pn_os_ai_department.artifacts a
set current_version_id = av.id
from pn_os_ai_department.artifact_versions av
where av.artifact_id = a.id
  and av.version_number = 1
  and a.current_version_id is null;

insert into pn_os_ai_department.qa_reviews (
  artifact_version_id,
  task_id,
  reviewer_actor_type,
  reviewer_agent_id,
  reviewer_external_ref,
  verdict,
  notes,
  evidence_ref
)
select
  av.id,
  t.id,
  'AGENT'::pn_os_ai_department.actor_type_enum,
  r.id,
  null,
  v.verdict::pn_os_ai_department.verdict_enum,
  v.notes,
  'evidence://' || v.review_key
from (
  values
    ('artifact_001', 'task_001', 'governance_core_seed_review_proxy', 'PASS', 'Scope is aligned and launch-safe.', 'qa_001'),
    ('artifact_002', 'task_002', 'governance_core_seed_registry_observer', 'READY_FOR_RECHECK', 'Needs media-owner confirmation before state promotion.', 'qa_002'),
    ('artifact_003', 'task_003', 'governance_core_seed_review_proxy', 'BLOCKED', 'Prompt patch references launch semantics and must stay gated.', 'qa_003')
) as v(artifact_key, task_key, reviewer_agent_key, verdict, notes, review_key)
join pn_os_ai_department.artifacts a
  on a.artifact_key = v.artifact_key
join pn_os_ai_department.artifact_versions av
  on av.artifact_id = a.id and av.version_number = 1
left join pn_os_ai_department.tasks t
  on t.task_key = v.task_key
join pn_os_ai_department.agents r
  on r.agent_key = v.reviewer_agent_key
on conflict do nothing;

insert into pn_os_ai_department.approvals (
  gate_id,
  entity_type,
  entity_id,
  approval_status,
  verdict,
  requested_by_actor_type,
  requested_by_agent_id,
  requested_by_external_ref,
  requested_at,
  approver_actor_type,
  approver_agent_id,
  approver_external_ref,
  decided_at,
  evidence_ref,
  notes
)
select
  g.id,
  v.entity_type::pn_os_ai_department.entity_type_enum,
  entity_lookup.entity_id, -- ĐÃ SỬA LỖI TYPO ALIAS Ở ĐÂY
  v.approval_status::pn_os_ai_department.approval_status_enum,
  v.verdict::pn_os_ai_department.verdict_enum,
  v.requested_by_actor_type::pn_os_ai_department.actor_type_enum,
  req.id,
  v.requested_by_external_ref,
  v.requested_at,
  v.approver_actor_type::pn_os_ai_department.actor_type_enum,
  appr.id,
  v.approver_external_ref,
  v.decided_at,
  v.evidence_ref,
  v.notes
from (
  values
    ('human_approval_gate', 'TASK', 'task_003', 'REQUESTED', null, 'HUMAN', null, 'Governance Intake', now(), null, null, null, null, 'evidence://approval/approval_001', 'Task moved to approval request status.'),
    ('qa_state_gate', 'ARTIFACT', 'artifact_001', 'APPROVED', 'PASS', 'AGENT', 'governance_core_seed_review_proxy', null, now(), 'HUMAN', null, 'Human Founder', now(), 'evidence://approval/approval_002', 'Approved after QA review.')
) as v(gate_key, entity_type, entity_key, approval_status, verdict, requested_by_actor_type, requested_by_agent_key, requested_by_external_ref, requested_at, approver_actor_type, approver_agent_key, approver_external_ref, decided_at, evidence_ref, notes)
join pn_os_ai_department.gates g
  on g.gate_key = v.gate_key
left join pn_os_ai_department.tasks t
  on v.entity_type = 'TASK' and t.task_key = v.entity_key
left join pn_os_ai_department.artifacts a
  on v.entity_type = 'ARTIFACT' and a.artifact_key = v.entity_key
left join pn_os_ai_department.agents req
  on req.agent_key = v.requested_by_agent_key
left join pn_os_ai_department.agents appr
  on appr.agent_key = v.approver_agent_key
cross join lateral (
  select coalesce(t.id, a.id) as entity_id
) entity_lookup
where entity_lookup.entity_id is not null
on conflict do nothing;

insert into pn_os_ai_department.workflow_runs (
  department_id,
  task_id,
  workflow_key,
  workflow_name,
  n8n_execution_id,
  idempotency_key,
  external_run_id,
  run_status,
  state,
  target_label,
  duration_label,
  started_at,
  finished_at,
  input_payload,
  output_payload,
  error_payload,
  created_by_actor_type,
  created_by_agent_id,
  created_by_external_ref
)
select
  d.id,
  t.id,
  v.workflow_key,
  v.workflow_name,
  v.n8n_execution_id,
  v.idempotency_key,
  v.external_run_id,
  v.run_status::pn_os_ai_department.workflow_run_status_enum,
  v.state::pn_os_ai_department.lifecycle_state,
  v.target_label,
  v.duration_label,
  v.started_at,
  v.finished_at,
  v.input_payload,
  v.output_payload,
  v.error_payload,
  v.created_by_actor_type::pn_os_ai_department.actor_type_enum,
  ca.id,
  v.created_by_external_ref
from (
  values
    ('governance_core', 'task_001', 'human_task_intake', 'Human task intake', null, 'idt-human-task-intake', 'n8n-exec-001', 'RUNNING', 'PARTIAL', 'n8n', '42s', now(), null, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'HUMAN', null, 'Human Founder'),
    ('governance_core', 'task_003', 'state_update_request', 'State update request', null, 'idt-state-update-request', 'n8n-exec-002', 'WAITING_ON_HUMAN', 'HOLD', 'approval-console', '2m 11s', now(), null, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'AGENT', 'governance_core_seed_registry_observer', null),
    ('pn_media_plus', 'task_002', 'audit_log_append', 'Audit append', null, 'idt-audit-append', 'n8n-exec-003', 'SUCCEEDED', 'PASS', 'registry', '12s', now(), now(), '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'AGENT', 'pn_media_plus_seed_registry_observer', null)
) as v(department_key, task_key, workflow_key, workflow_name, n8n_execution_id, idempotency_key, external_run_id, run_status, state, target_label, duration_label, started_at, finished_at, input_payload, output_payload, error_payload, created_by_actor_type, created_by_agent_key, created_by_external_ref)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
left join pn_os_ai_department.tasks t
  on t.task_key = v.task_key
left join pn_os_ai_department.agents ca
  on ca.agent_key = v.created_by_agent_key
on conflict (workflow_key) do nothing;

insert into pn_os_ai_department.chat_threads (
  department_id,
  task_id,
  thread_key,
  subject,
  purpose,
  state,
  thread_status,
  opened_by_actor_type,
  opened_by_agent_id,
  opened_by_external_ref,
  last_activity_at
)
select
  d.id,
  t.id,
  v.thread_key,
  v.subject,
  v.purpose,
  v.state::pn_os_ai_department.lifecycle_state,
  v.thread_status::pn_os_ai_department.chat_thread_status_enum,
  v.opened_by_actor_type::pn_os_ai_department.actor_type_enum,
  oa.id,
  v.opened_by_external_ref,
  v.last_activity_at
from (
  values
    ('governance_core', 'task_001', 'thread_001', 'Human command intake', 'Capture commands, route tasks, and request clarifications.', 'NOT_STARTED', 'ACTIVE', 'HUMAN', null, 'Human Founder', now())
) as v(department_key, task_key, thread_key, subject, purpose, state, thread_status, opened_by_actor_type, opened_by_agent_key, opened_by_external_ref, last_activity_at)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
left join pn_os_ai_department.tasks t
  on t.task_key = v.task_key
left join pn_os_ai_department.agents oa
  on oa.agent_key = v.opened_by_agent_key
on conflict (thread_key) do nothing;

insert into pn_os_ai_department.chat_messages (
  thread_id,
  message_seq,
  actor_type,
  actor_agent_id,
  actor_external_ref,
  message_kind,
  content,
  content_format,
  intent_type,
  target_department_id,
  target_agent_id
)
select
  th.id,
  v.message_seq,
  v.actor_type::pn_os_ai_department.actor_type_enum,
  aa.id,
  v.actor_external_ref,
  v.message_kind, -- CỘT ĐÃ ĐƯỢC BỔ SUNG
  v.content,
  v.content_format,
  v.intent_type,
  td.id,
  ta.id
from (
  values
    -- Bổ sung giá trị message_kind (cột thứ 6) cho mỗi dòng
    ('thread_001', 1, 'SYSTEM', null, 'SYSTEM', 'SYSTEM', 'Phase 1 chat is ready and compatibility views are active.', 'markdown', null, null, null),
    ('thread_001', 2, 'HUMAN', null, 'Human Founder', 'COMMAND', 'Please prepare the governance summary and route it to the right department.', 'markdown', 'create_content', 'governance_core', null),
    ('thread_001', 3, 'AGENT', 'governance_core_seed_registry_observer', null, 'RESPONSE', 'Task created and awaiting human review for promotion.', 'markdown', null, null, null)
) as v(thread_key, message_seq, actor_type, actor_agent_key, actor_external_ref, message_kind, content, content_format, intent_type, target_department_key, target_agent_key) -- ĐÃ BỔ SUNG ALIAS message_kind
join pn_os_ai_department.chat_threads th
  on th.thread_key = v.thread_key
left join pn_os_ai_department.agents aa
  on aa.agent_key = v.actor_agent_key
left join pn_os_ai_department.departments td
  on td.department_key = v.target_department_key
left join pn_os_ai_department.agents ta
  on ta.agent_key = v.target_agent_key
on conflict (thread_id, message_seq) do nothing;

update pn_os_ai_department.chat_threads th
set last_activity_at = (
  select max(cm.created_at)
  from pn_os_ai_department.chat_messages cm
  where cm.thread_id = th.id
)
where exists (
  select 1
  from pn_os_ai_department.chat_messages cm
  where cm.thread_id = th.id
);

insert into pn_os_ai_department.audit_logs (
  actor_type,
  actor_agent_id,
  actor_external_ref,
  action,
  entity_type,
  entity_id,
  before_state,
  after_state,
  reason,
  evidence_ref,
  request_id,
  event_hash
)
select
  v.actor_type::pn_os_ai_department.actor_type_enum,
  aa.id,
  v.actor_external_ref,
  v.action,
  v.entity_type::pn_os_ai_department.entity_type_enum,
  entity_lookup.entity_id, -- ĐÃ SỬA LỖI TYPO ALIAS Ở ĐÂY
  v.before_state::pn_os_ai_department.lifecycle_state,
  v.after_state::pn_os_ai_department.lifecycle_state,
  v.reason,
  v.evidence_ref,
  v.request_id,
  v.event_hash
from (
  values
    ('HUMAN', null, 'Human Founder', 'message_received', 'CHAT_THREAD', 'thread_001', null, 'DRAFT', 'Command intake created a review-ready task request.', null, gen_random_uuid(), repeat('a', 64)),
    ('AGENT', 'governance_core_seed_registry_observer', null, 'approval_requested', 'TASK', 'task_003', 'DRAFT', 'HOLD', 'Task moved to approval request status.', null, gen_random_uuid(), repeat('b', 64)),
    ('AGENT', 'pn_media_plus_seed_registry_observer', null, 'waiting_on_human', 'WORKFLOW_RUN', 'state_update_request', 'NOT_STARTED', 'HOLD', 'State update request is parked at the human gate.', null, gen_random_uuid(), repeat('c', 64))
) as v(actor_type, actor_agent_key, actor_external_ref, action, entity_type, entity_key, before_state, after_state, reason, evidence_ref, request_id, event_hash)
left join pn_os_ai_department.agents aa
  on aa.agent_key = v.actor_agent_key
left join pn_os_ai_department.tasks t
  on v.entity_type = 'TASK' and t.task_key = v.entity_key
left join pn_os_ai_department.chat_threads th
  on v.entity_type = 'CHAT_THREAD' and th.thread_key = v.entity_key
left join pn_os_ai_department.workflow_runs wr
  on v.entity_type = 'WORKFLOW_RUN' and wr.workflow_key = v.entity_key
cross join lateral (
  select coalesce(t.id, th.id, wr.id) as entity_id
) entity_lookup
where entity_lookup.entity_id is not null
on conflict (event_hash) do nothing;

insert into pn_os_ai_department.media_pipeline_stages (
  department_id,
  stage_key,
  stage_name,
  status,
  owner_label,
  note,
  sort_order,
  state
)
select
  d.id,
  v.stage_key,
  v.stage_name,
  v.status::pn_os_ai_department.media_stage_status_enum,
  v.owner_label,
  v.note,
  v.sort_order,
  v.state::pn_os_ai_department.lifecycle_state
from (
  values
    ('pn_media_plus', 'media_intake', 'Intake', 'READY', 'Media Dispatcher', 'Awaiting task assignment', 1, 'PARTIAL'),
    ('pn_media_plus', 'media_editing', 'Editing', 'IN_PROGRESS', 'Producer', 'Using approved assets only', 2, 'PARTIAL'),
    ('pn_media_plus', 'media_qa', 'QA', 'HOLD', 'QA Sentinel', 'Needs human check before promotion', 3, 'HOLD')
) as v(department_key, stage_key, stage_name, status, owner_label, note, sort_order, state)
join pn_os_ai_department.departments d
  on d.department_key = v.department_key
on conflict (stage_key) do nothing;

create or replace view pn_os_ai_department.department_dashboard_v1 as
with agent_counts as (
  select department_id, count(*)::integer as active_agents
  from pn_os_ai_department.agents
  where state <> 'DEPRECATED'
  group by department_id
),
task_counts as (
  select department_id, count(*)::integer as open_tasks
  from pn_os_ai_department.tasks
  where state not in ('APPROVED', 'DEPRECATED')
  group by department_id
)
select
  d.id,
  d.department_key,
  d.canonical_name as name,
  d.owner_label as owner,
  d.purpose,
  d.state,
  coalesce(ac.active_agents, 0) as "activeAgents",
  coalesce(tc.open_tasks, 0) as "openTasks",
  d.created_at,
  d.updated_at
from pn_os_ai_department.departments d
left join agent_counts ac on ac.department_id = d.id
left join task_counts tc on tc.department_id = d.id;

create or replace view pn_os_ai_department.agent_directory_v1 as
select
  a.id,
  a.department_id as "departmentId",
  a.canonical_name as name,
  a.role_label as role,
  a.operational_status::text as status,
  a.state,
  a.focus_label as focus,
  a.created_at,
  a.updated_at
from pn_os_ai_department.agents a;

create or replace view pn_os_ai_department.task_inbox_v1 as
select
  t.id,
  t.title,
  t.department_id as "departmentId",
  t.owner_agent_id as "agentId",
  t.state as status,
  t.intent_type as "intentType",
  t.created_at as "createdAt",
  t.updated_at as "updatedAt",
  t.owner_label as owner,
  case
    when t.priority <= 33 then 'High'
    when t.priority <= 66 then 'Medium'
    else 'Low'
  end as priority
from pn_os_ai_department.tasks t;

create or replace view pn_os_ai_department.artifact_registry_v1 as
select
  a.id,
  a.canonical_name as title,
  a.artifact_type as type,
  a.department_id as "departmentId",
  a.state,
  a.updated_at as "updatedAt",
  a.version_label as version
from pn_os_ai_department.artifacts a;

create or replace view pn_os_ai_department.workflow_run_monitor_v1 as
select
  w.id,
  w.workflow_name as name,
  w.workflow_key as "workflowKey",
  w.run_status::text as status,
  w.started_at as "startedAt",
  w.duration_label as duration,
  w.target_label as target
from pn_os_ai_department.workflow_runs w;

create or replace view pn_os_ai_department.qa_review_panel_v1 as
select
  qr.id,
  av.artifact_id as "artifactId",
  coalesce(r.canonical_name, qr.reviewer_external_ref) as reviewer,
  qr.verdict::text as status,
  qr.notes,
  qr.created_at as "reviewedAt"
from pn_os_ai_department.qa_reviews qr
join pn_os_ai_department.artifact_versions av
  on av.id = qr.artifact_version_id
left join pn_os_ai_department.agents r
  on r.id = qr.reviewer_agent_id;

create or replace view pn_os_ai_department.gate_console_v1 as
select
  g.id,
  g.canonical_name as name,
  g.state,
  d.canonical_name as owner,
  g.rule_summary as rationale
from pn_os_ai_department.gates g
join pn_os_ai_department.departments d
  on d.id = g.owner_department_id;

create or replace view pn_os_ai_department.approval_console_v1 as
select
  a.id,
  lower(a.entity_type::text) as "targetType",
  a.entity_id as "targetId",
  a.approval_status::text as status,
  coalesce(req.canonical_name, a.requested_by_external_ref) as "requestedBy",
  a.requested_at as "requestedAt",
  coalesce(appr.canonical_name, a.approver_external_ref) as "decidedBy"
from pn_os_ai_department.approvals a
left join pn_os_ai_department.agents req
  on req.id = a.requested_by_agent_id
left join pn_os_ai_department.agents appr
  on appr.id = a.approver_agent_id;

create or replace view pn_os_ai_department.chat_thread_inbox_v1 as
select
  c.id,
  c.subject as title,
  coalesce(c.purpose, '') as purpose,
  c.last_activity_at as "lastActivityAt",
  c.thread_status::text as status
from pn_os_ai_department.chat_threads c;

create or replace view pn_os_ai_department.chat_message_feed_v1 as
select
  m.id,
  m.thread_id as "threadId",
  lower(m.actor_type::text) as sender,
  m.content as body,
  m.intent_type as "intentType",
  m.target_department_id as "targetDepartmentId",
  m.target_agent_id as "targetAgentId",
  m.created_at as "createdAt"
from pn_os_ai_department.chat_messages m;

create or replace view pn_os_ai_department.audit_log_feed_v1 as
select
  a.id,
  lower(a.entity_type::text) as "entityType",
  a.entity_id as "entityId",
  a.action,
  coalesce(ag.canonical_name, a.actor_external_ref) as actor,
  a.reason as details,
  a.created_at as "createdAt"
from pn_os_ai_department.audit_logs a
left join pn_os_ai_department.agents ag
  on ag.id = a.actor_agent_id;

create or replace view pn_os_ai_department.media_pipeline_board_v1 as
select
  m.id,
  m.stage_name as stage,
  m.status::text as status,
  m.owner_label as owner,
  m.note
from pn_os_ai_department.media_pipeline_stages m;

commit;
