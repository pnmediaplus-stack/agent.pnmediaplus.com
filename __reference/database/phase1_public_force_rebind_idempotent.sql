-- Phase 1 public compatibility rebind, idempotent and data-safe
-- Purpose:
-- - Rebind public.phase1_* surfaces to pn_os_ai_department SSOT
-- - Preserve legacy data by renaming old objects when needed
-- - Avoid DROP CASCADE and avoid data loss

begin;

create extension if not exists pgcrypto;
create schema if not exists pn_os_ai_department;
revoke all on schema pn_os_ai_department from public;

create or replace function public.safe_uuid(input text)
returns uuid
language plpgsql
immutable
as $$
begin
  if input is null or btrim(input) = '' then
    return null;
  end if;

  return input::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

do $$
declare
  relkind char;
begin
  select c.relkind into relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'phase1_chat_threads';

  if relkind in ('r', 'p') then
    if to_regclass('public.phase1_chat_threads_legacy') is null then
      execute 'alter table public.phase1_chat_threads rename to phase1_chat_threads_legacy';
    elsif to_regclass('public.phase1_chat_threads_legacy_conflict') is null then
      execute 'alter table public.phase1_chat_threads rename to phase1_chat_threads_legacy_conflict';
    end if;
  elsif relkind = 'v' then
    if to_regclass('public.phase1_chat_threads_legacy') is null then
      execute 'alter view public.phase1_chat_threads rename to phase1_chat_threads_legacy';
    end if;
  end if;

  select c.relkind into relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'phase1_chat_messages';

  if relkind in ('r', 'p') then
    if to_regclass('public.phase1_chat_messages_legacy') is null then
      execute 'alter table public.phase1_chat_messages rename to phase1_chat_messages_legacy';
    elsif to_regclass('public.phase1_chat_messages_legacy_conflict') is null then
      execute 'alter table public.phase1_chat_messages rename to phase1_chat_messages_legacy_conflict';
    end if;
  elsif relkind = 'v' then
    if to_regclass('public.phase1_chat_messages_legacy') is null then
      execute 'alter view public.phase1_chat_messages rename to phase1_chat_messages_legacy';
    end if;
  end if;

  select c.relkind into relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'phase1_audit_logs';

  if relkind in ('r', 'p') then
    if to_regclass('public.phase1_audit_logs_legacy') is null then
      execute 'alter table public.phase1_audit_logs rename to phase1_audit_logs_legacy';
    elsif to_regclass('public.phase1_audit_logs_legacy_conflict') is null then
      execute 'alter table public.phase1_audit_logs rename to phase1_audit_logs_legacy_conflict';
    end if;
  elsif relkind = 'v' then
    if to_regclass('public.phase1_audit_logs_legacy') is null then
      execute 'alter view public.phase1_audit_logs rename to phase1_audit_logs_legacy';
    end if;
  end if;
end
$$;

create or replace function public.phase1_chat_threads_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pn_os_ai_department, pg_temp
as $$
declare
  v_department_id uuid;
  v_task_id uuid;
  v_id uuid;
  v_created_at timestamptz;
  v_last_activity_at timestamptz;
begin
  select id into v_department_id
  from pn_os_ai_department.departments
  where department_key = 'governance_core'
  limit 1;

  if v_department_id is null then
    raise exception 'DEFAULT_DEPARTMENT_MISSING: governance_core';
  end if;

  select id into v_task_id
  from pn_os_ai_department.tasks
  where task_key = 'task_001'
  limit 1;

  v_id := coalesce(new.id, gen_random_uuid());
  v_created_at := coalesce(new."createdAt", now());
  v_last_activity_at := coalesce(new."lastActivityAt", v_created_at);

  insert into pn_os_ai_department.chat_threads (
    id,
    department_id,
    task_id,
    thread_key,
    subject,
    purpose,
    state,
    thread_status,
    opened_by_actor_type,
    opened_by_external_ref,
    last_activity_at,
    created_at
  ) values (
    v_id,
    v_department_id,
    v_task_id,
    'thread_' || replace(v_id::text, '-', '_'),
    coalesce(nullif(new.title, ''), 'Human Command Center'),
    coalesce(new.purpose, ''),
    'NOT_STARTED',
    case upper(coalesce(new.status, 'ACTIVE'))
      when 'WAITING_ON_HUMAN' then 'WAITING_ON_HUMAN'::pn_os_ai_department.chat_thread_status_enum
      when 'CLOSED' then 'CLOSED'::pn_os_ai_department.chat_thread_status_enum
      else 'ACTIVE'::pn_os_ai_department.chat_thread_status_enum
    end,
    'HUMAN',
    'Human Founder',
    v_last_activity_at,
    v_created_at
  );

  new.id := v_id;
  new.title := coalesce(nullif(new.title, ''), 'Human Command Center');
  new.purpose := coalesce(new.purpose, '');
  new."lastActivityAt" := v_last_activity_at;
  new.status := case upper(coalesce(new.status, 'ACTIVE'))
    when 'WAITING_ON_HUMAN' then 'WAITING_ON_HUMAN'
    when 'CLOSED' then 'CLOSED'
    else 'ACTIVE'
  end;
  new."createdAt" := v_created_at;
  return new;
end;
$$;

create or replace function public.phase1_chat_messages_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pn_os_ai_department, pg_temp
as $$
declare
  v_thread_id uuid;
  v_seq integer;
  v_actor_type pn_os_ai_department.actor_type_enum;
  v_actor_agent_id uuid;
  v_actor_external_ref text;
  v_target_department_id uuid;
  v_target_agent_id uuid;
  v_created_at timestamptz;
  v_id uuid;
  v_message_kind text;
begin
  v_thread_id := public.safe_uuid(new."threadId"::text);
  if v_thread_id is null then
    raise exception 'PHASE1_CHAT_THREAD_ID_INVALID';
  end if;

  select coalesce(max(message_seq), 0) + 1
    into v_seq
  from pn_os_ai_department.chat_messages
  where thread_id = v_thread_id;

  v_id := coalesce(new.id, gen_random_uuid());
  v_created_at := coalesce(new."createdAt", now());
  v_target_department_id := public.safe_uuid(coalesce(new."targetDepartmentId", null));
  v_target_agent_id := public.safe_uuid(coalesce(new."targetAgentId", null));

  case lower(coalesce(new.sender, 'human'))
    when 'agent' then
      v_actor_type := 'AGENT';
      select id into v_actor_agent_id
      from pn_os_ai_department.agents
      where agent_key = 'governance_core_seed_registry_observer'
      limit 1;
      if v_actor_agent_id is null then
        select id into v_actor_agent_id
        from pn_os_ai_department.agents
        order by created_at
        limit 1;
      end if;
      if v_actor_agent_id is null then
        raise exception 'PHASE1_CHAT_AGENT_FALLBACK_MISSING';
      end if;
      v_actor_external_ref := null;
      v_message_kind := 'RESPONSE';
    when 'system' then
      v_actor_type := 'SYSTEM';
      v_actor_agent_id := null;
      v_actor_external_ref := 'SYSTEM';
      v_message_kind := 'SYSTEM';
    else
      v_actor_type := 'HUMAN';
      v_actor_agent_id := null;
      v_actor_external_ref := 'Human Founder';
      v_message_kind := 'COMMAND';
  end case;

  insert into pn_os_ai_department.chat_messages (
    id,
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
    target_agent_id,
    created_at
  ) values (
    v_id,
    v_thread_id,
    v_seq,
    v_actor_type,
    v_actor_agent_id,
    v_actor_external_ref,
    v_message_kind,
    coalesce(new.body, ''),
    'markdown',
    new."intentType",
    v_target_department_id,
    v_target_agent_id,
    v_created_at
  );

  new.id := v_id;
  new."threadId" := v_thread_id;
  new.sender := lower(v_actor_type::text);
  new.body := coalesce(new.body, '');
  new."intentType" := new."intentType";
  new."targetDepartmentId" := v_target_department_id;
  new."targetAgentId" := v_target_agent_id;
  new."createdAt" := v_created_at;
  return new;
end;
$$;

create or replace function public.phase1_audit_logs_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pn_os_ai_department, pg_temp
as $$
declare
  v_entity_type pn_os_ai_department.entity_type_enum;
  v_entity_id uuid;
  v_actor_type pn_os_ai_department.actor_type_enum := 'HUMAN';
  v_actor_external_ref text := 'Human Founder';
  v_created_at timestamptz;
  v_id uuid;
  v_event_hash text;
  v_before_state pn_os_ai_department.lifecycle_state := 'NOT_STARTED';
  v_after_state pn_os_ai_department.lifecycle_state := 'PARTIAL';
begin
  v_entity_type := upper(coalesce(new."entityType", 'CHAT_THREAD'))::pn_os_ai_department.entity_type_enum;
  v_entity_id := public.safe_uuid(coalesce(new."entityId", null));
  v_created_at := coalesce(new."createdAt", now());
  v_id := coalesce(new.id, gen_random_uuid());

  v_event_hash := encode(
    digest(
      concat_ws(
        '|',
        v_actor_type::text,
        v_actor_external_ref,
        coalesce(new.action, ''),
        v_entity_type::text,
        v_entity_id::text,
        coalesce(new.details, ''),
        v_created_at::text
      ),
      'sha256'::text
    ),
    'hex'
  );

  insert into pn_os_ai_department.audit_logs (
    id,
    actor_type,
    actor_external_ref,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    reason,
    evidence_ref,
    request_id,
    event_hash,
    created_at
  ) values (
    v_id,
    v_actor_type,
    v_actor_external_ref,
    coalesce(new.action, 'message_received'),
    v_entity_type,
    v_entity_id,
    v_before_state,
    v_after_state,
    coalesce(new.details, ''),
    null,
    gen_random_uuid(),
    v_event_hash,
    v_created_at
  );

  new.id := v_id;
  new."entityType" := lower(v_entity_type::text);
  new."entityId" := v_entity_id::text;
  new.actor := v_actor_external_ref;
  new.details := coalesce(new.details, '');
  new."createdAt" := v_created_at;
  return new;
end;
$$;

drop view if exists public.phase1_chat_threads;
create view public.phase1_chat_threads as
select
  c.id,
  coalesce(c.subject, 'Human Command Center') as title,
  coalesce(c.purpose, '') as purpose,
  c.last_activity_at as "lastActivityAt",
  c.last_activity_at as last_activity_at,
  c.thread_status::text as status,
  c.created_at as "createdAt",
  c.created_at as created_at
from pn_os_ai_department.chat_threads c;

grant select, insert on public.phase1_chat_threads to anon, authenticated, service_role;

drop trigger if exists phase1_chat_threads_insert_instead on public.phase1_chat_threads;
create trigger phase1_chat_threads_insert_instead
instead of insert on public.phase1_chat_threads
for each row execute function public.phase1_chat_threads_insert();

drop view if exists public.phase1_chat_messages;
create view public.phase1_chat_messages as
select
  m.id,
  m.thread_id as "threadId",
  m.thread_id as thread_id,
  lower(m.actor_type::text) as sender,
  m.content as body,
  m.intent_type as "intentType",
  m.intent_type as intent_type,
  m.target_department_id as "targetDepartmentId",
  m.target_department_id as target_department_id,
  m.target_agent_id as "targetAgentId",
  m.target_agent_id as target_agent_id,
  m.created_at as "createdAt",
  m.created_at as created_at
from pn_os_ai_department.chat_messages m
where coalesce(m.content, '') not ilike '%mock-data mode%'
  and coalesce(m.content, '') not ilike '%SSOT compatibility mode%'
  and coalesce(m.content, '') not ilike '%production chat tables are promoted%';

grant select, insert on public.phase1_chat_messages to anon, authenticated, service_role;

drop trigger if exists phase1_chat_messages_insert_instead on public.phase1_chat_messages;
create trigger phase1_chat_messages_insert_instead
instead of insert on public.phase1_chat_messages
for each row execute function public.phase1_chat_messages_insert();

drop view if exists public.phase1_audit_logs;
create view public.phase1_audit_logs as
select
  a.id,
  case
    when a.entity_type = 'CHAT_THREAD' then 'chat'
    else lower(a.entity_type::text)
  end as "entityType",
  a.entity_id::text as "entityId",
  a.entity_id::text as entity_id,
  a.action,
  coalesce(ag.canonical_name, a.actor_external_ref) as actor,
  a.reason as details,
  a.created_at as "createdAt",
  a.created_at as created_at
from pn_os_ai_department.audit_logs a
left join pn_os_ai_department.agents ag
  on ag.id = a.actor_agent_id;

grant select, insert on public.phase1_audit_logs to anon, authenticated, service_role;

drop trigger if exists phase1_audit_logs_insert_instead on public.phase1_audit_logs;
create trigger phase1_audit_logs_insert_instead
instead of insert on public.phase1_audit_logs
for each row execute function public.phase1_audit_logs_insert();

commit;
