begin;

create extension if not exists pgcrypto;

create schema if not exists governance_runtime;
revoke all on schema governance_runtime from public;

create or replace function governance_runtime.runtime_payload_contains_secret_material(p_value jsonb)
returns boolean
language plpgsql
security definer
set search_path = governance_runtime, pg_temp
as $$
declare
  k text;
  v jsonb;
  scalar_text text;
begin
  if p_value is null then
    return false;
  end if;

  case jsonb_typeof(p_value)
    when 'string' then
      scalar_text := coalesce(p_value #>> '{}', '');
      return scalar_text ~* '^\s*Bearer\s+' or scalar_text ~* '^sk-[A-Za-z0-9_-]{12,}';
    when 'array' then
      for v in select value from jsonb_array_elements(p_value) as value loop
        if governance_runtime.runtime_payload_contains_secret_material(v) then
          return true;
        end if;
      end loop;
      return false;
    when 'object' then
      for k, v in select key, value from jsonb_each(p_value) as object_entry(key, value) loop
        if lower(k) in (
          'authorization',
          'api_key',
          'apikey',
          'access_token',
          'refresh_token',
          'secret',
          'password',
          'private_key',
          'raw_key',
          'lease_token',
          'reference_token'
        ) then
          return true;
        end if;

        if governance_runtime.runtime_payload_contains_secret_material(v) then
          return true;
        end if;
      end loop;
      return false;
    else
      return false;
  end case;
end;
$$;

create table if not exists governance_runtime.runtime_execution_facts (
  runtime_execution_fact_id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  idempotency_key text not null unique,
  trace_id text not null,
  workflow_run_id text not null,
  n8n_execution_id text,
  workflow_ref text not null,
  request_ref text,
  task_ref text,
  event_type text not null,
  execution_state text not null,
  retry_state text not null default 'not_applicable',
  actor_type text not null,
  actor_ref text not null,
  latency_ms numeric(18,4),
  error_summary text,
  payload jsonb not null default '{}'::jsonb,
  emitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runtime_execution_facts_event_type_check
    check (
      event_type in (
        'EXECUTION_REQUESTED',
        'EXECUTION_ACCEPTED',
        'EXECUTION_STARTED',
        'NODE_STARTED',
        'NODE_SUCCEEDED',
        'NODE_FAILED',
        'RETRY_SCHEDULED',
        'RETRY_EXHAUSTED',
        'EXECUTION_SUCCEEDED',
        'EXECUTION_FAILED',
        'EXECUTION_BLOCKED',
        'RECEIPT_ISSUED',
        'AUDIT_EVENT_RECORDED',
        'METRICS_SNAPSHOT_CAPTURED'
      )
    ),
  constraint runtime_execution_facts_execution_state_check
    check (execution_state in ('pending', 'queued', 'running', 'succeeded', 'failed', 'blocked')),
  constraint runtime_execution_facts_retry_state_check
    check (retry_state in ('not_applicable', 'retry_available', 'retry_scheduled', 'retry_exhausted', 'blocked')),
  constraint runtime_execution_facts_actor_type_check
    check (actor_type in ('N8N', 'SYSTEM', 'SERVICE')),
  constraint runtime_execution_facts_actor_ref_check
    check (length(btrim(actor_ref)) > 0),
  constraint runtime_execution_facts_latency_ms_check
    check (latency_ms is null or latency_ms >= 0),
  constraint runtime_execution_facts_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint runtime_execution_facts_emitted_at_check
    check (emitted_at <= now() + interval '5 minutes')
);

create index if not exists runtime_execution_facts_trace_id_idx
  on governance_runtime.runtime_execution_facts (trace_id, created_at desc);

create index if not exists runtime_execution_facts_workflow_run_id_idx
  on governance_runtime.runtime_execution_facts (workflow_run_id, created_at desc);

create index if not exists runtime_execution_facts_event_type_idx
  on governance_runtime.runtime_execution_facts (event_type, created_at desc);

create index if not exists runtime_execution_facts_actor_type_idx
  on governance_runtime.runtime_execution_facts (actor_type, created_at desc);

create index if not exists runtime_execution_facts_emitted_at_idx
  on governance_runtime.runtime_execution_facts (emitted_at desc);

create or replace function governance_runtime.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = governance_runtime, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function governance_runtime.reject_update_delete()
returns trigger
language plpgsql
security definer
set search_path = governance_runtime, pg_temp
as $$
begin
  raise exception 'APPEND_ONLY_TABLE_MUTATION_FORBIDDEN: %', tg_table_name
    using errcode = 'P0001';
end;
$$;

drop trigger if exists runtime_execution_facts_touch_updated_at on governance_runtime.runtime_execution_facts;
create trigger runtime_execution_facts_touch_updated_at
before update on governance_runtime.runtime_execution_facts
for each row execute function governance_runtime.touch_updated_at();

drop trigger if exists runtime_execution_facts_reject_update_delete on governance_runtime.runtime_execution_facts;
create trigger runtime_execution_facts_reject_update_delete
before update or delete on governance_runtime.runtime_execution_facts
for each row execute function governance_runtime.reject_update_delete();

alter table governance_runtime.runtime_execution_facts enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'governance_runtime'
        and tablename = 'runtime_execution_facts'
        and policyname = 'runtime_execution_facts_deny_anon'
    ) then
      create policy runtime_execution_facts_deny_anon
        on governance_runtime.runtime_execution_facts
        for all
        to anon
        using (false)
        with check (false);
    end if;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'governance_runtime'
        and tablename = 'runtime_execution_facts'
        and policyname = 'runtime_execution_facts_deny_authenticated'
    ) then
      create policy runtime_execution_facts_deny_authenticated
        on governance_runtime.runtime_execution_facts
        for all
        to authenticated
        using (false)
        with check (false);
    end if;
  end if;
end $$;

do $$
begin
  revoke all on table governance_runtime.runtime_execution_facts from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table governance_runtime.runtime_execution_facts from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table governance_runtime.runtime_execution_facts from authenticated;
  end if;
end $$;

create or replace function governance_runtime.append_runtime_execution_event(p_event jsonb)
returns table (
  event_id text,
  idempotency_key text,
  trace_id text,
  workflow_run_id text,
  event_type text,
  execution_state text,
  retry_state text,
  created_at timestamptz,
  write_surface text
)
language plpgsql
security definer
set search_path = governance_runtime, pg_temp
as $$
declare
  v_event_id text;
  v_idempotency_key text;
  v_trace_id text;
  v_workflow_run_id text;
  v_n8n_execution_id text;
  v_workflow_ref text;
  v_request_ref text;
  v_task_ref text;
  v_event_type text;
  v_execution_state text;
  v_retry_state text;
  v_actor_type text;
  v_actor_ref text;
  v_latency_ms numeric(18,4);
  v_error_summary text;
  v_payload jsonb;
  v_emitted_at timestamptz;
  v_inserted governance_runtime.runtime_execution_facts%rowtype;
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'RUNTIME_EVENT_INVALID_PAYLOAD' using errcode = 'P0001';
  end if;

  if governance_runtime.runtime_payload_contains_secret_material(p_event) then
    raise exception 'RUNTIME_EVENT_SECRET_MATERIAL_REJECTED' using errcode = 'P0001';
  end if;

  v_event_id := btrim(coalesce(p_event->>'event_id', ''));
  v_idempotency_key := btrim(coalesce(p_event->>'idempotency_key', ''));
  v_trace_id := btrim(coalesce(p_event->>'trace_id', ''));
  v_workflow_run_id := btrim(coalesce(p_event->>'workflow_run_id', ''));
  v_n8n_execution_id := nullif(btrim(coalesce(p_event->>'n8n_execution_id', '')), '');
  v_workflow_ref := btrim(coalesce(p_event->>'workflow_ref', ''));
  v_request_ref := nullif(btrim(coalesce(p_event->>'request_ref', '')), '');
  v_task_ref := nullif(btrim(coalesce(p_event->>'task_ref', '')), '');
  v_event_type := btrim(coalesce(p_event->>'event_type', ''));
  v_execution_state := btrim(coalesce(p_event->>'execution_state', ''));
  v_retry_state := coalesce(nullif(btrim(coalesce(p_event->>'retry_state', '')), ''), 'not_applicable');
  v_actor_type := upper(btrim(coalesce(p_event->>'actor_type', '')));
  v_actor_ref := btrim(coalesce(p_event->>'actor_ref', ''));
  v_error_summary := nullif(btrim(coalesce(p_event->>'error_summary', '')), '');

  if v_event_id = ''
     or v_idempotency_key = ''
     or v_trace_id = ''
     or v_workflow_run_id = ''
     or v_workflow_ref = ''
     or v_event_type = ''
     or v_execution_state = ''
     or v_actor_type = ''
     or v_actor_ref = ''
     or coalesce(nullif(btrim(coalesce(p_event->>'emitted_at', '')), ''), '') = '' then
    raise exception 'RUNTIME_EVENT_MISSING_REQUIRED_REFS' using errcode = 'P0001';
  end if;

  begin
    v_emitted_at := (p_event->>'emitted_at')::timestamptz;
  exception when others then
    raise exception 'RUNTIME_EVENT_INVALID_EMITTED_AT' using errcode = 'P0001';
  end;

  if abs(extract(epoch from (now() - v_emitted_at))) > 300 then
    raise exception 'RUNTIME_EVENT_EMITTED_AT_STALE' using errcode = 'P0001';
  end if;

  if v_event_type not in (
    'EXECUTION_REQUESTED',
    'EXECUTION_ACCEPTED',
    'EXECUTION_STARTED',
    'NODE_STARTED',
    'NODE_SUCCEEDED',
    'NODE_FAILED',
    'RETRY_SCHEDULED',
    'RETRY_EXHAUSTED',
    'EXECUTION_SUCCEEDED',
    'EXECUTION_FAILED',
    'EXECUTION_BLOCKED',
    'RECEIPT_ISSUED',
    'AUDIT_EVENT_RECORDED',
    'METRICS_SNAPSHOT_CAPTURED'
  ) then
    raise exception 'RUNTIME_EVENT_UNKNOWN_TYPE' using errcode = 'P0001';
  end if;

  if v_execution_state not in ('pending', 'queued', 'running', 'succeeded', 'failed', 'blocked') then
    raise exception 'RUNTIME_EVENT_INVALID_EXECUTION_STATE' using errcode = 'P0001';
  end if;

  if v_retry_state not in ('not_applicable', 'retry_available', 'retry_scheduled', 'retry_exhausted', 'blocked') then
    raise exception 'RUNTIME_EVENT_INVALID_RETRY_STATE' using errcode = 'P0001';
  end if;

  if v_actor_type not in ('N8N', 'SYSTEM', 'SERVICE') then
    raise exception 'RUNTIME_EVENT_FORBIDDEN_ACTOR' using errcode = 'P0001';
  end if;

  if p_event ? 'payload' then
    if p_event->'payload' is null then
      v_payload := '{}'::jsonb;
    elsif jsonb_typeof(p_event->'payload') <> 'object' then
      raise exception 'RUNTIME_EVENT_INVALID_PAYLOAD' using errcode = 'P0001';
    else
      if governance_runtime.runtime_payload_contains_secret_material(p_event->'payload') then
        raise exception 'RUNTIME_EVENT_SECRET_MATERIAL_REJECTED' using errcode = 'P0001';
      end if;
      v_payload := p_event->'payload';
    end if;
  else
    v_payload := '{}'::jsonb;
  end if;

  if p_event ? 'latency_ms' then
    begin
      v_latency_ms := nullif(btrim(coalesce(p_event->>'latency_ms', '')), '')::numeric(18,4);
    exception when others then
      raise exception 'RUNTIME_EVENT_INVALID_LATENCY' using errcode = 'P0001';
    end;

    if v_latency_ms is not null and v_latency_ms < 0 then
      raise exception 'RUNTIME_EVENT_INVALID_LATENCY' using errcode = 'P0001';
    end if;
  end if;

  insert into governance_runtime.runtime_execution_facts (
    event_id,
    idempotency_key,
    trace_id,
    workflow_run_id,
    n8n_execution_id,
    workflow_ref,
    request_ref,
    task_ref,
    event_type,
    execution_state,
    retry_state,
    actor_type,
    actor_ref,
    latency_ms,
    error_summary,
    payload,
    emitted_at
  ) values (
    v_event_id,
    v_idempotency_key,
    v_trace_id,
    v_workflow_run_id,
    v_n8n_execution_id,
    v_workflow_ref,
    v_request_ref,
    v_task_ref,
    v_event_type,
    v_execution_state,
    v_retry_state,
    v_actor_type,
    v_actor_ref,
    v_latency_ms,
    v_error_summary,
    v_payload,
    v_emitted_at
  )
  returning * into v_inserted;

  return query
  select
    v_inserted.event_id,
    v_inserted.idempotency_key,
    v_inserted.trace_id,
    v_inserted.workflow_run_id,
    v_inserted.event_type,
    v_inserted.execution_state,
    v_inserted.retry_state,
    v_inserted.created_at,
    'public.runtime_append_only_ingest'::text;

exception
  when unique_violation then
    raise exception 'RUNTIME_EVENT_DUPLICATE_IDEMPOTENCY_KEY' using errcode = '23505';
end;
$$;

create or replace function public.runtime_append_only_ingest(p_event jsonb)
returns table (
  event_id text,
  idempotency_key text,
  trace_id text,
  workflow_run_id text,
  event_type text,
  execution_state text,
  retry_state text,
  created_at timestamptz,
  write_surface text
)
language plpgsql
security definer
set search_path = governance_runtime, pg_temp
as $$
begin
  return query
  select *
  from governance_runtime.append_runtime_execution_event(p_event);
end;
$$;

do $$
begin
  revoke all on function governance_runtime.runtime_payload_contains_secret_material(jsonb) from public;
  revoke all on function governance_runtime.append_runtime_execution_event(jsonb) from public;
  revoke all on function public.runtime_append_only_ingest(jsonb) from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function governance_runtime.runtime_payload_contains_secret_material(jsonb) from anon;
    revoke all on function governance_runtime.append_runtime_execution_event(jsonb) from anon;
    revoke all on function public.runtime_append_only_ingest(jsonb) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function governance_runtime.runtime_payload_contains_secret_material(jsonb) from authenticated;
    revoke all on function governance_runtime.append_runtime_execution_event(jsonb) from authenticated;
    revoke all on function public.runtime_append_only_ingest(jsonb) from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function governance_runtime.append_runtime_execution_event(jsonb) from service_role;
    revoke all on function public.runtime_append_only_ingest(jsonb) from service_role;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.runtime_append_only_ingest(jsonb) to service_role;
  end if;
end $$;

commit;

-- Verification queries

select table_schema, table_name
from information_schema.tables
where table_schema = 'governance_runtime'
  and table_name = 'runtime_execution_facts';

select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema in ('governance_runtime', 'public')
  and routine_name in ('runtime_payload_contains_secret_material', 'append_runtime_execution_event', 'runtime_append_only_ingest')
order by routine_schema, routine_name;

select routine_schema, routine_name, privilege_type, grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'runtime_append_only_ingest'
order by grantee, privilege_type;

select n.nspname as schema_name, p.proname, pg_get_functiondef(p.oid) as function_def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'governance_runtime' and p.proname in ('append_runtime_execution_event', 'runtime_payload_contains_secret_material'))
   or (n.nspname = 'public' and p.proname = 'runtime_append_only_ingest')
order by schema_name, proname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'governance_runtime'
  and table_name = 'runtime_execution_facts'
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

select trigger_name, event_object_schema, event_object_table
from information_schema.triggers
where event_object_schema = 'governance_runtime'
  and event_object_table = 'runtime_execution_facts'
  and trigger_name in ('runtime_execution_facts_touch_updated_at', 'runtime_execution_facts_reject_update_delete');

select column_name
from information_schema.columns
where table_schema = 'governance_runtime'
  and table_name = 'runtime_execution_facts'
  and column_name in (
    'event_id',
    'idempotency_key',
    'trace_id',
    'workflow_run_id',
    'n8n_execution_id',
    'workflow_ref',
    'request_ref',
    'task_ref',
    'event_type',
    'execution_state',
    'retry_state',
    'actor_type',
    'actor_ref',
    'latency_ms',
    'error_summary',
    'payload',
    'emitted_at',
    'created_at',
    'updated_at'
  )
order by column_name;

select indexname
from pg_indexes
where schemaname = 'governance_runtime'
  and tablename = 'runtime_execution_facts'
  and indexname in (
    'runtime_execution_facts_trace_id_idx',
    'runtime_execution_facts_workflow_run_id_idx',
    'runtime_execution_facts_event_type_idx',
    'runtime_execution_facts_actor_type_idx',
    'runtime_execution_facts_emitted_at_idx'
  )
order by indexname;
