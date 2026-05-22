-- PN OS Governance Runtime SQL Draft v0.2.1
-- MODE: SQL_DRAFT_PATCH_ONLY
-- TARGET: Supabase PostgreSQL Governance Runtime
-- STATUS: DRAFT ONLY - NOT APPLIED
-- OWNER EXPECTED: governance_runtime_owner
-- FORBIDDEN: financial/billing/pricing/VAT/wallet schema

begin;

-- Extensions
create extension if not exists pgcrypto;

-- Schemas
create schema if not exists governance_runtime;
revoke all on schema governance_runtime from public;

-- Roles are declared as draft placeholders. Create/apply only in controlled dry-run.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'governance_runtime_owner') then
    create role governance_runtime_owner noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'n8n_audit_writer') then
    create role n8n_audit_writer noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'n8n_readonly') then
    create role n8n_readonly noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'governance_verifier') then
    create role governance_verifier noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'governance_relay') then
    create role governance_relay noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'gatekeeper_readonly') then
    create role gatekeeper_readonly noinherit;
  end if;
end $$;

-- Forbidden semantic labels helper table
create table if not exists governance_runtime.forbidden_semantic_labels (
  label text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

insert into governance_runtime.forbidden_semantic_labels(label, reason) values
('PASS','approval authority label forbidden to runtime'),
('APPROVED','approval semantic forbidden to runtime'),
('APPLY','apply authority label forbidden to runtime'),
('APPLIED','apply semantic forbidden to runtime'),
('SAFE_TO_CONTINUE','runtime continuation approval semantic forbidden'),
('SAFE_TO_PROCEED','approval semantic forbidden'),
('FINALIZED_OK','finalization approval semantic forbidden'),
('EXECUTION_APPROVED','approval semantic forbidden'),
('RUNTIME_CONFIRMED','runtime authority inflation forbidden'),
('AUTO_RESOLVED','auto-resolution forbidden'),
('CANONICAL_READY','canonical authority semantic forbidden'),
('DEPLOY_READY','deployment authority semantic forbidden'),
('RECOVERY_APPROVED_FOR_RUNTIME_CONTINUATION','recovery approval semantic forbidden')
on conflict (label) do nothing;

create or replace function governance_runtime.assert_not_forbidden_label(p_label text, p_field text)
returns void
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
begin
  if p_label is null then
    return;
  end if;
  if exists (
    select 1 from governance_runtime.forbidden_semantic_labels
    where upper(label) = upper(trim(p_label))
  ) then
    raise exception 'FORBIDDEN_GOVERNANCE_LABEL: field %, value %', p_field, p_label
      using errcode = 'P0001';
  end if;
end;
$$;

-- Core append-only audit table; all event families route here.
create table if not exists governance_runtime.governance_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  immutable_event_id text not null unique,
  event_family text not null check (event_family in ('AUDIT','RUN','FINALIZATION','LOCK','ESCALATION','PROTOCOL_SNAPSHOT','VERIFICATION','RECOVERY','ACCESS','ARCHIVE')),
  event_type text not null,
  reason_code text,
  artifact_id text,
  run_id uuid,
  registry_epoch text,
  protocol_snapshot_id uuid,
  idempotency_key text not null unique,
  replay_protection_key text not null unique,
  previous_event_hash text,
  event_hash text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  constraint event_hash_hex check (event_hash ~ '^[a-f0-9]{64}$'),
  constraint previous_hash_hex check (previous_event_hash is null or previous_event_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_audit_events_artifact_id on governance_runtime.governance_audit_events(artifact_id);
create index if not exists idx_audit_events_run_id on governance_runtime.governance_audit_events(run_id);
create index if not exists idx_audit_events_created_at on governance_runtime.governance_audit_events(created_at);
create index if not exists idx_audit_events_event_type on governance_runtime.governance_audit_events(event_type);
create index if not exists idx_audit_events_registry_epoch on governance_runtime.governance_audit_events(registry_epoch);

create table if not exists governance_runtime.governance_protocol_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  protocol_artifact_id text not null,
  protocol_version text not null,
  registry_epoch text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  registry_status text not null,
  registry_validated_status text not null,
  runtime_load_allowed boolean not null default false,
  issued_at timestamptz not null default now(),
  valid_until timestamptz not null,
  max_snapshot_age_seconds integer not null check (max_snapshot_age_seconds > 0 and max_snapshot_age_seconds <= 86400),
  snapshot_hash text not null unique check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  created_by text not null,
  constraint protocol_snapshot_status_block check (
    upper(registry_status) not in ('REVOKED','SUPERSEDED','SHADOW','INVALID','REFERENCE_ONLY')
    and upper(registry_validated_status) not in ('REVOKED','SUPERSEDED','SHADOW','INVALID','REFERENCE_ONLY')
    and runtime_load_allowed = true
  ),
  constraint protocol_snapshot_valid_window check (valid_until > issued_at)
);

create index if not exists idx_protocol_snapshots_epoch on governance_runtime.governance_protocol_snapshots(registry_epoch);
create index if not exists idx_protocol_snapshots_valid_until on governance_runtime.governance_protocol_snapshots(valid_until);

create table if not exists governance_runtime.governance_workflow_runs (
  run_id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  artifact_id text not null,
  registry_epoch text not null,
  protocol_snapshot_id uuid not null references governance_runtime.governance_protocol_snapshots(snapshot_id),
  start_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  idempotency_key text not null unique,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists governance_runtime.governance_run_finalization_events (
  finalization_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references governance_runtime.governance_workflow_runs(run_id),
  audit_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  terminal_outcome text not null check (terminal_outcome in ('RUNTIME_RECHECK_REQUIRED','BLOCKED_FAIL_CLOSED','ESCALATED_FOR_REVIEW','DRY_RUN_COMPLETED','EVIDENCE_RECORDED')),
  created_at timestamptz not null default now(),
  unique(run_id)
);

create table if not exists governance_runtime.governance_artifact_lock_events (
  lock_event_id uuid primary key default gen_random_uuid(),
  artifact_id text not null,
  run_id uuid references governance_runtime.governance_workflow_runs(run_id),
  audit_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  lock_status text not null check (lock_status in ('LOCK_REQUESTED','LOCK_HELD','LOCK_RELEASED','LOCK_STALE_REVIEWED','LOCK_RELEASE_REQUESTED','LOCK_RELEASED_AFTER_AUDIT','RECOVERY_ROUTE_PREPARED','RECOVERY_BLOCK_RETAINED','RECOVERY_ESCALATED')),
  original_idempotency_key text,
  recovery_idempotency_key text,
  created_by text not null,
  created_at timestamptz not null default now(),
  constraint recovery_key_must_be_new check (
    recovery_idempotency_key is null or recovery_idempotency_key <> original_idempotency_key
  )
);

create unique index if not exists uq_active_lock_view_guard
on governance_runtime.governance_artifact_lock_events(artifact_id)
where lock_status = 'LOCK_HELD';

create table if not exists governance_runtime.governance_escalations (
  escalation_id uuid primary key default gen_random_uuid(),
  audit_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  escalation_type text not null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  artifact_id text,
  run_id uuid,
  replay_protection_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists governance_runtime.governance_audit_verification_events (
  verification_id uuid primary key default gen_random_uuid(),
  audit_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  verification_result text not null check (verification_result in ('CHAIN_VERIFIED','CHAIN_BREAK_DETECTED','CHAIN_FORK_DETECTED','VERIFICATION_INCONCLUSIVE','ESCALATION_RECORDED')),
  verified_from_hash text,
  verified_to_hash text,
  verified_event_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists governance_runtime.governance_archive_records (
  archive_id uuid primary key default gen_random_uuid(),
  audit_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  archive_scope text not null,
  archive_hash text not null check (archive_hash ~ '^[a-f0-9]{64}$'),
  retention_policy text not null,
  restore_policy text not null,
  deletion_allowed boolean not null default false check (deletion_allowed = false),
  created_at timestamptz not null default now()
);

create table if not exists governance_runtime.governance_access_audit (
  access_event_id uuid primary key default gen_random_uuid(),
  audit_event_id uuid not null unique references governance_runtime.governance_audit_events(event_id),
  actor_role text not null,
  access_type text not null check (access_type in ('SELECT','RPC_INSERT','RPC_APPEND','DENIED')),
  target_object text not null,
  request_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Append-only mutation blockers
create or replace function governance_runtime.reject_update_delete()
returns trigger
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
begin
  raise exception 'APPEND_ONLY_TABLE_MUTATION_FORBIDDEN: %', tg_table_name using errcode = 'P0001';
end;
$$;

-- Chain-head helper: previous hash must match current head for family/artifact/run scope.
create or replace function governance_runtime.current_chain_head(p_event_family text, p_artifact_id text, p_run_id uuid)
returns text
language sql
security definer
set search_path = governance_runtime, pg_catalog
as $$
  select event_hash
  from governance_runtime.governance_audit_events e
  where e.event_family = p_event_family
    and (p_artifact_id is null or e.artifact_id = p_artifact_id)
    and (p_run_id is null or e.run_id = p_run_id)
  order by e.created_at desc, e.event_id desc
  limit 1;
$$;

create or replace function governance_runtime.compute_event_hash(
  p_immutable_event_id text,
  p_event_family text,
  p_event_type text,
  p_reason_code text,
  p_artifact_id text,
  p_run_id uuid,
  p_previous_event_hash text,
  p_payload jsonb
)
returns text
language sql
security definer
set search_path = governance_runtime, pg_catalog
as $$
  select encode(digest(
    coalesce(p_immutable_event_id,'') || '|' || coalesce(p_event_family,'') || '|' || coalesce(p_event_type,'') || '|' ||
    coalesce(p_reason_code,'') || '|' || coalesce(p_artifact_id,'') || '|' || coalesce(p_run_id::text,'') || '|' ||
    coalesce(p_previous_event_hash,'') || '|' || coalesce(p_payload::text,''), 'sha256'), 'hex');
$$;

create or replace function governance_runtime.assert_protocol_snapshot_loadable(p_snapshot_id uuid, p_registry_epoch text, p_content_sha256 text)
returns void
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare s governance_runtime.governance_protocol_snapshots%rowtype;
begin
  select * into s from governance_runtime.governance_protocol_snapshots where snapshot_id = p_snapshot_id;
  if not found then
    raise exception 'PROTOCOL_SNAPSHOT_MISSING' using errcode = 'P0001';
  end if;
  if s.runtime_load_allowed is not true then
    raise exception 'PROTOCOL_SNAPSHOT_RUNTIME_LOAD_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  if upper(s.registry_status) in ('REVOKED','SUPERSEDED','SHADOW','INVALID','REFERENCE_ONLY')
     or upper(s.registry_validated_status) in ('REVOKED','SUPERSEDED','SHADOW','INVALID','REFERENCE_ONLY') then
    raise exception 'PROTOCOL_SNAPSHOT_REGISTRY_STATUS_BLOCKED' using errcode = 'P0001';
  end if;
  if s.valid_until <= now() then
    raise exception 'PROTOCOL_SNAPSHOT_EXPIRED' using errcode = 'P0001';
  end if;
  if extract(epoch from now() - s.issued_at) > s.max_snapshot_age_seconds then
    raise exception 'PROTOCOL_SNAPSHOT_MAX_AGE_EXCEEDED' using errcode = 'P0001';
  end if;
  if s.registry_epoch <> p_registry_epoch then
    raise exception 'PROTOCOL_SNAPSHOT_REGISTRY_EPOCH_MISMATCH' using errcode = 'P0001';
  end if;
  if s.content_sha256 <> p_content_sha256 then
    raise exception 'PROTOCOL_SNAPSHOT_CONTENT_SHA_MISMATCH' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function governance_runtime.append_audit_event(
  p_immutable_event_id text,
  p_event_family text,
  p_event_type text,
  p_reason_code text,
  p_artifact_id text,
  p_run_id uuid,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_idempotency_key text,
  p_replay_protection_key text,
  p_payload jsonb,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare
  v_previous_hash text;
  v_event_hash text;
  v_event_id uuid;
begin
  perform governance_runtime.assert_not_forbidden_label(p_event_type, 'event_type');
  perform governance_runtime.assert_not_forbidden_label(p_reason_code, 'reason_code');
  perform governance_runtime.assert_protocol_snapshot_loadable(p_protocol_snapshot_id, p_registry_epoch, p_protocol_content_sha256);

  v_previous_hash := governance_runtime.current_chain_head(p_event_family, p_artifact_id, p_run_id);

  v_event_hash := governance_runtime.compute_event_hash(
    p_immutable_event_id, p_event_family, p_event_type, p_reason_code,
    p_artifact_id, p_run_id, v_previous_hash, coalesce(p_payload, '{}'::jsonb)
  );

  insert into governance_runtime.governance_audit_events(
    immutable_event_id, event_family, event_type, reason_code, artifact_id, run_id,
    registry_epoch, protocol_snapshot_id, idempotency_key, replay_protection_key,
    previous_event_hash, event_hash, payload, created_by
  ) values (
    p_immutable_event_id, p_event_family, p_event_type, p_reason_code, p_artifact_id, p_run_id,
    p_registry_epoch, p_protocol_snapshot_id, p_idempotency_key, p_replay_protection_key,
    v_previous_hash, v_event_hash, coalesce(p_payload, '{}'::jsonb), p_created_by
  ) returning event_id into v_event_id;

  return v_event_id;
exception when unique_violation then
  raise exception 'IDEMPOTENCY_OR_CHAIN_UNIQUENESS_VIOLATION' using errcode = 'P0001';
end;
$$;

create or replace function governance_runtime.start_workflow_run(
  p_workflow_name text,
  p_artifact_id text,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_idempotency_key text,
  p_replay_protection_key text,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_event_id uuid;
begin
  v_event_id := governance_runtime.append_audit_event(
    'run-start-' || v_run_id::text,
    'RUN', 'WORKFLOW_RUN_STARTED', 'RUN_START_RECORDED',
    p_artifact_id, v_run_id, p_registry_epoch, p_protocol_snapshot_id, p_protocol_content_sha256,
    p_idempotency_key, p_replay_protection_key,
    jsonb_build_object('workflow_name', p_workflow_name), p_created_by
  );

  insert into governance_runtime.governance_workflow_runs(
    run_id, workflow_name, artifact_id, registry_epoch, protocol_snapshot_id, start_event_id, idempotency_key, created_by
  ) values (v_run_id, p_workflow_name, p_artifact_id, p_registry_epoch, p_protocol_snapshot_id, v_event_id, p_idempotency_key, p_created_by);

  return v_run_id;
end;
$$;

create or replace function governance_runtime.finalize_workflow_run(
  p_run_id uuid,
  p_terminal_outcome text,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_idempotency_key text,
  p_replay_protection_key text,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare
  v_artifact_id text;
  v_event_id uuid;
begin
  perform governance_runtime.assert_not_forbidden_label(p_terminal_outcome, 'terminal_outcome');
  select artifact_id into v_artifact_id from governance_runtime.governance_workflow_runs where run_id = p_run_id;
  if v_artifact_id is null then raise exception 'RUN_NOT_FOUND' using errcode='P0001'; end if;

  v_event_id := governance_runtime.append_audit_event(
    'run-finalize-' || p_run_id::text || '-' || p_idempotency_key,
    'FINALIZATION', 'WORKFLOW_RUN_FINALIZATION_RECORDED', p_terminal_outcome,
    v_artifact_id, p_run_id, p_registry_epoch, p_protocol_snapshot_id, p_protocol_content_sha256,
    p_idempotency_key, p_replay_protection_key,
    jsonb_build_object('terminal_outcome', p_terminal_outcome), p_created_by
  );

  insert into governance_runtime.governance_run_finalization_events(run_id, audit_event_id, terminal_outcome)
  values (p_run_id, v_event_id, p_terminal_outcome);
  return v_event_id;
end;
$$;

create or replace function governance_runtime.acquire_artifact_lock(
  p_artifact_id text,
  p_run_id uuid,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_idempotency_key text,
  p_replay_protection_key text,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare v_event_id uuid;
begin
  if exists (select 1 from governance_runtime.v_active_artifact_locks where artifact_id = p_artifact_id) then
    raise exception 'DUPLICATE_ACTIVE_LOCK_FAIL_CLOSED' using errcode='P0001';
  end if;
  v_event_id := governance_runtime.append_audit_event(
    'lock-held-' || p_artifact_id || '-' || p_idempotency_key,
    'LOCK', 'ARTIFACT_LOCK_EVENT_RECORDED', 'LOCK_HELD',
    p_artifact_id, p_run_id, p_registry_epoch, p_protocol_snapshot_id, p_protocol_content_sha256,
    p_idempotency_key, p_replay_protection_key,
    '{}'::jsonb, p_created_by
  );
  insert into governance_runtime.governance_artifact_lock_events(artifact_id, run_id, audit_event_id, lock_status, created_by)
  values (p_artifact_id, p_run_id, v_event_id, 'LOCK_HELD', p_created_by);
  return v_event_id;
end;
$$;

create or replace function governance_runtime.release_stale_lock_request(
  p_artifact_id text,
  p_original_idempotency_key text,
  p_recovery_idempotency_key text,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_replay_protection_key text,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare v_event_id uuid;
begin
  if p_recovery_idempotency_key is null or p_recovery_idempotency_key = p_original_idempotency_key then
    raise exception 'RECOVERY_REQUIRES_NEW_IDEMPOTENCY_KEY' using errcode='P0001';
  end if;

  v_event_id := governance_runtime.append_audit_event(
    'lock-recovery-' || p_artifact_id || '-' || p_recovery_idempotency_key,
    'RECOVERY', 'STALE_LOCK_RECOVERY_EVENT_RECORDED', 'RECOVERY_ROUTE_PREPARED',
    p_artifact_id, null, p_registry_epoch, p_protocol_snapshot_id, p_protocol_content_sha256,
    p_recovery_idempotency_key, p_replay_protection_key,
    jsonb_build_object('original_idempotency_key', p_original_idempotency_key, 'requires_reprocessing', true),
    p_created_by
  );

  insert into governance_runtime.governance_artifact_lock_events(
    artifact_id, audit_event_id, lock_status, original_idempotency_key, recovery_idempotency_key, created_by
  ) values (
    p_artifact_id, v_event_id, 'RECOVERY_ROUTE_PREPARED', p_original_idempotency_key, p_recovery_idempotency_key, p_created_by
  );
  return v_event_id;
end;
$$;

create or replace function governance_runtime.create_escalation(
  p_escalation_type text,
  p_severity text,
  p_artifact_id text,
  p_run_id uuid,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_idempotency_key text,
  p_replay_protection_key text,
  p_payload jsonb,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare v_event_id uuid; v_escalation_id uuid;
begin
  perform governance_runtime.assert_not_forbidden_label(p_escalation_type, 'escalation_type');
  v_event_id := governance_runtime.append_audit_event(
    'escalation-' || p_idempotency_key,
    'ESCALATION', 'GOVERNANCE_ESCALATION_RECORDED', p_escalation_type,
    p_artifact_id, p_run_id, p_registry_epoch, p_protocol_snapshot_id, p_protocol_content_sha256,
    p_idempotency_key, p_replay_protection_key, coalesce(p_payload,'{}'::jsonb), p_created_by
  );
  insert into governance_runtime.governance_escalations(audit_event_id, escalation_type, severity, artifact_id, run_id, replay_protection_key)
  values(v_event_id, p_escalation_type, p_severity, p_artifact_id, p_run_id, p_replay_protection_key)
  returning escalation_id into v_escalation_id;
  return v_escalation_id;
end;
$$;

create or replace function governance_runtime.record_audit_verification(
  p_verification_result text,
  p_verified_from_hash text,
  p_verified_to_hash text,
  p_verified_event_count integer,
  p_registry_epoch text,
  p_protocol_snapshot_id uuid,
  p_protocol_content_sha256 text,
  p_idempotency_key text,
  p_replay_protection_key text,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = governance_runtime, pg_catalog
as $$
declare v_event_id uuid; v_verification_id uuid;
begin
  perform governance_runtime.assert_not_forbidden_label(p_verification_result, 'verification_result');
  v_event_id := governance_runtime.append_audit_event(
    'audit-verification-' || p_idempotency_key,
    'VERIFICATION', 'AUDIT_CHAIN_VERIFICATION_RECORDED', p_verification_result,
    null, null, p_registry_epoch, p_protocol_snapshot_id, p_protocol_content_sha256,
    p_idempotency_key, p_replay_protection_key,
    jsonb_build_object('verified_from_hash', p_verified_from_hash, 'verified_to_hash', p_verified_to_hash, 'verified_event_count', p_verified_event_count),
    p_created_by
  );
  insert into governance_runtime.governance_audit_verification_events(
    audit_event_id, verification_result, verified_from_hash, verified_to_hash, verified_event_count
  ) values(v_event_id, p_verification_result, p_verified_from_hash, p_verified_to_hash, p_verified_event_count)
  returning verification_id into v_verification_id;
  return v_verification_id;
end;
$$;

-- Views / projections: rebuildable, not authority.
create or replace view governance_runtime.v_current_run_status as
select r.run_id, r.workflow_name, r.artifact_id,
       f.terminal_outcome as derived_terminal_outcome,
       f.created_at as finalized_at,
       false::boolean as projection_is_authority,
       false::boolean as governance_decision_allowed,
       false::boolean as registry_apply_allowed,
       false::boolean as relay_apply_allowed,
       true::boolean as projection_rebuildable,
       true::boolean as append_only_events_are_truth
from governance_runtime.governance_workflow_runs r
left join governance_runtime.governance_run_finalization_events f on f.run_id = r.run_id;

create or replace view governance_runtime.v_active_artifact_locks as
select l.artifact_id, l.run_id, l.lock_event_id, l.created_at,
       false::boolean as projection_is_authority
from governance_runtime.governance_artifact_lock_events l
where l.lock_status = 'LOCK_HELD'
  and not exists (
    select 1 from governance_runtime.governance_artifact_lock_events x
    where x.artifact_id = l.artifact_id
      and x.created_at > l.created_at
      and x.lock_status in ('LOCK_RELEASED','LOCK_RELEASED_AFTER_AUDIT','RECOVERY_ROUTE_PREPARED','RECOVERY_ESCALATED')
  );

create or replace view governance_runtime.v_n8n_allowed_runtime_read as
select r.run_id, r.artifact_id, r.workflow_name, r.created_at,
       s.derived_terminal_outcome,
       s.projection_is_authority
from governance_runtime.governance_workflow_runs r
left join governance_runtime.v_current_run_status s on s.run_id = r.run_id
where r.created_by = current_setting('request.jwt.claim.sub', true)
   or r.run_id::text = current_setting('request.headers.x-pn-run-id', true)
   or r.artifact_id = current_setting('request.headers.x-pn-artifact-id', true);

-- RLS
alter table governance_runtime.governance_audit_events enable row level security;
alter table governance_runtime.governance_workflow_runs enable row level security;
alter table governance_runtime.governance_run_finalization_events enable row level security;
alter table governance_runtime.governance_artifact_lock_events enable row level security;
alter table governance_runtime.governance_escalations enable row level security;
alter table governance_runtime.governance_protocol_snapshots enable row level security;
alter table governance_runtime.governance_audit_verification_events enable row level security;
alter table governance_runtime.governance_archive_records enable row level security;
alter table governance_runtime.governance_access_audit enable row level security;

-- Mutation blocker triggers
create trigger trg_no_mutate_audit_events before update or delete on governance_runtime.governance_audit_events for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_workflow_runs before update or delete on governance_runtime.governance_workflow_runs for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_finalization before update or delete on governance_runtime.governance_run_finalization_events for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_locks before update or delete on governance_runtime.governance_artifact_lock_events for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_escalations before update or delete on governance_runtime.governance_escalations for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_protocol_snapshots before update or delete on governance_runtime.governance_protocol_snapshots for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_verification before update or delete on governance_runtime.governance_audit_verification_events for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_archive before update or delete on governance_runtime.governance_archive_records for each row execute function governance_runtime.reject_update_delete();
create trigger trg_no_mutate_access before update or delete on governance_runtime.governance_access_audit for each row execute function governance_runtime.reject_update_delete();

-- Grants: no public access, no direct table mutation for n8n.
revoke all on all tables in schema governance_runtime from public;
revoke all on all functions in schema governance_runtime from public;
revoke all on schema governance_runtime from public;

grant usage on schema governance_runtime to n8n_audit_writer, governance_verifier, governance_relay, gatekeeper_readonly;
grant execute on function governance_runtime.append_audit_event(text,text,text,text,text,uuid,text,uuid,text,text,text,jsonb,text) to n8n_audit_writer, governance_relay, governance_verifier;
grant execute on function governance_runtime.start_workflow_run(text,text,text,uuid,text,text,text,text) to n8n_audit_writer, governance_relay;
grant execute on function governance_runtime.finalize_workflow_run(uuid,text,text,uuid,text,text,text,text) to n8n_audit_writer, governance_relay;
grant execute on function governance_runtime.acquire_artifact_lock(text,uuid,text,uuid,text,text,text,text) to n8n_audit_writer, governance_relay;
grant execute on function governance_runtime.release_stale_lock_request(text,text,text,text,uuid,text,text,text) to governance_relay;
grant execute on function governance_runtime.create_escalation(text,text,text,uuid,text,uuid,text,text,text,jsonb,text) to n8n_audit_writer, governance_relay;
grant execute on function governance_runtime.record_audit_verification(text,text,text,integer,text,uuid,text,text,text,text) to governance_verifier;

grant select on governance_runtime.v_n8n_allowed_runtime_read to n8n_readonly;
grant select on governance_runtime.v_current_run_status, governance_runtime.v_active_artifact_locks to gatekeeper_readonly, governance_relay;
grant select on all tables in schema governance_runtime to gatekeeper_readonly;

-- Post-migration ownership plan: must be executed by privileged migration owner in dry-run only.
-- alter schema governance_runtime owner to governance_runtime_owner;
-- alter all tables in schema governance_runtime owner to governance_runtime_owner;
-- alter all functions in schema governance_runtime owner to governance_runtime_owner;
-- alter all sequences in schema governance_runtime owner to governance_runtime_owner;

commit;
