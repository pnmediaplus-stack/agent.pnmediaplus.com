-- PN OS AI Department chat SSOT migration-safe patch
-- Scope:
-- - Keep canonical chat data in pn_os_ai_department
-- - Preserve existing public.phase1_* surfaces if they already exist
-- - Create compatibility views/triggers only when phase1_* is missing
-- - Avoid breaking the current chat UI contract

begin;

create extension if not exists pgcrypto;

create schema if not exists pn_os_ai_department;
revoke all on schema pn_os_ai_department from public;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'pn_os_ai_department' and t.typname = 'lifecycle_state'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'pn_os_ai_department' and t.typname = 'actor_type_enum'
  ) then
    create type pn_os_ai_department.actor_type_enum as enum (
      'HUMAN',
      'AGENT',
      'SYSTEM',
      'N8N',
      'SERVICE'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'pn_os_ai_department' and t.typname = 'entity_type_enum'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'pn_os_ai_department' and t.typname = 'chat_thread_status_enum'
  ) then
    create type pn_os_ai_department.chat_thread_status_enum as enum (
      'ACTIVE',
      'WAITING_ON_HUMAN',
      'CLOSED'
    );
  end if;
end
$$;

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

create table if not exists pn_os_ai_department.chat_threads (
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

create table if not exists pn_os_ai_department.chat_messages (
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
    check (message_kind in ('COMMAND', 'RESPONSE', 'SYSTEM', 'NOTE', 'QUESTION')),
  constraint chat_messages_format_allowed
    check (content_format in ('plain_text', 'markdown', 'json')),
  constraint chat_messages_actor_ref_check
    check (
      (actor_type = 'AGENT' and actor_agent_id is not null and actor_external_ref is null)
      or
      (actor_type <> 'AGENT' and actor_external_ref is not null and actor_agent_id is null)
    ),
  constraint chat_messages_thread_seq_unique
    unique (thread_id, message_seq)
);

create table if not exists pn_os_ai_department.audit_logs (
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

create index if not exists chat_threads_department_id_state_created_at_idx
  on pn_os_ai_department.chat_threads (department_id, state, created_at);

create index if not exists chat_threads_task_id_idx
  on pn_os_ai_department.chat_threads (task_id);

create index if not exists chat_messages_thread_id_created_at_idx
  on pn_os_ai_department.chat_messages (thread_id, created_at);

create index if not exists audit_logs_entity_type_entity_id_created_at_idx
  on pn_os_ai_department.audit_logs (entity_type, entity_id, created_at);

create index if not exists audit_logs_actor_type_created_at_idx
  on pn_os_ai_department.audit_logs (actor_type, created_at);

drop trigger if exists chat_threads_touch_updated_at on pn_os_ai_department.chat_threads;
create trigger chat_threads_touch_updated_at
before update on pn_os_ai_department.chat_threads
for each row execute function pn_os_ai_department.touch_updated_at();

drop trigger if exists chat_messages_append_only on pn_os_ai_department.chat_messages;
create trigger chat_messages_append_only
before update or delete on pn_os_ai_department.chat_messages
for each row execute function pn_os_ai_department.reject_append_only_mutation();

drop trigger if exists chat_messages_touch_updated_at on pn_os_ai_department.chat_messages;
create trigger chat_messages_touch_updated_at
before update on pn_os_ai_department.chat_messages
for each row execute function pn_os_ai_department.touch_updated_at();

drop trigger if exists audit_logs_append_only on pn_os_ai_department.audit_logs;
create trigger audit_logs_append_only
before update or delete on pn_os_ai_department.audit_logs
for each row execute function pn_os_ai_department.reject_append_only_mutation();

drop trigger if exists audit_logs_touch_updated_at on pn_os_ai_department.audit_logs;
create trigger audit_logs_touch_updated_at
before update on pn_os_ai_department.audit_logs
for each row execute function pn_os_ai_department.touch_updated_at();

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
  case
    when a.entity_type = 'CHAT_THREAD' then 'chat'
    else lower(a.entity_type::text)
  end as "entityType",
  a.entity_id as "entityId",
  a.action,
  coalesce(ag.canonical_name, a.actor_external_ref) as actor,
  a.reason as details,
  a.created_at as "createdAt"
from pn_os_ai_department.audit_logs a
left join pn_os_ai_department.agents ag
  on ag.id = a.actor_agent_id;

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
  v_target_department_id := public.safe_uuid(coalesce(new."targetDepartmentId"::text, null));
  v_target_agent_id := public.safe_uuid(coalesce(new."targetAgentId"::text, null));

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
  v_actor_external_ref text := coalesce(nullif(new.actor, ''), 'Human Founder');
  v_request_id uuid := gen_random_uuid();
  v_event_hash text;
  v_before_state pn_os_ai_department.lifecycle_state := 'NOT_STARTED';
  v_after_state pn_os_ai_department.lifecycle_state := 'PARTIAL';
  v_created_at timestamptz := coalesce(new."createdAt", now());
  v_id uuid := coalesce(new.id, gen_random_uuid());
begin
  if lower(coalesce(new."entityType", 'chat')) = 'chat' then
    v_entity_type := 'CHAT_THREAD';
  else
    v_entity_type := upper(coalesce(new."entityType", 'CHAT_THREAD'))::pn_os_ai_department.entity_type_enum;
  end if;

  v_entity_id := public.safe_uuid(new."entityId");
  if v_entity_id is null then
    raise exception 'PHASE1_AUDIT_LOG_ENTITY_ID_INVALID';
  end if;

  v_event_hash := encode(
    extensions.digest(
      convert_to(concat_ws(
        '|',
        v_actor_type::text,
        v_actor_external_ref,
        coalesce(new.action, ''),
        v_entity_type::text,
        v_entity_id::text,
        coalesce(new.details, ''),
        v_created_at::text
      ), 'utf8'),
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
    coalesce(new.action, 'unknown'),
    v_entity_type,
    v_entity_id,
    v_before_state,
    v_after_state,
    coalesce(new.details, ''),
    null,
    v_request_id,
    v_event_hash,
    v_created_at
  );

  new.id := v_id;
  new."entityType" := case
    when v_entity_type = 'CHAT_THREAD' then 'chat'
    else lower(v_entity_type::text)
  end;
  new."entityId" := v_entity_id::text;
  new.action := coalesce(new.action, 'unknown');
  new.actor := v_actor_external_ref;
  new.details := coalesce(new.details, '');
  new."createdAt" := v_created_at;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.phase1_chat_threads') is null then
    execute $v$
      create view public.phase1_chat_threads as
      select
        id,
        coalesce(subject, 'Human Command Center') as title,
        coalesce(purpose, '') as purpose,
        last_activity_at as "lastActivityAt",
        last_activity_at as last_activity_at,
        thread_status::text as status,
        created_at as "createdAt",
        created_at as created_at
      from pn_os_ai_department.chat_threads
    $v$;

    execute 'grant select, insert on public.phase1_chat_threads to anon, authenticated, service_role';

    execute $t$
      create trigger phase1_chat_threads_insert_instead
      instead of insert on public.phase1_chat_threads
      for each row execute function public.phase1_chat_threads_insert()
    $t$;
  end if;

  if to_regclass('public.phase1_chat_messages') is null then
    execute $v$
      create view public.phase1_chat_messages as
      select
        id,
        thread_id as "threadId",
        thread_id as thread_id,
        lower(actor_type::text) as sender,
        content as body,
        intent_type as "intentType",
        intent_type as intent_type,
        target_department_id as "targetDepartmentId",
        target_department_id as target_department_id,
        target_agent_id as "targetAgentId",
        target_agent_id as target_agent_id,
        created_at as "createdAt",
        created_at as created_at
      from pn_os_ai_department.chat_messages
    $v$;

    execute 'grant select, insert on public.phase1_chat_messages to anon, authenticated, service_role';

    execute $t$
      create trigger phase1_chat_messages_insert_instead
      instead of insert on public.phase1_chat_messages
      for each row execute function public.phase1_chat_messages_insert()
    $t$;
  end if;

  if to_regclass('public.phase1_audit_logs') is null then
    execute $v$
      create view public.phase1_audit_logs as
      select
        id,
        case
          when entity_type = 'CHAT_THREAD' then 'chat'
          else lower(entity_type::text)
        end as "entityType",
        entity_id::text as "entityId",
        entity_id::text as entity_id,
        action,
        coalesce(actor_external_ref, actor_type::text) as actor,
        reason as details,
        created_at as "createdAt",
        created_at as created_at
      from pn_os_ai_department.audit_logs
    $v$;

    execute 'grant select, insert on public.phase1_audit_logs to anon, authenticated, service_role';

    execute $t$
      create trigger phase1_audit_logs_insert_instead
      instead of insert on public.phase1_audit_logs
      for each row execute function public.phase1_audit_logs_insert()
    $t$;
  end if;
end
$$;

insert into pn_os_ai_department.chat_threads (
  department_id,
  task_id,
  thread_key,
  subject,
  purpose,
  state,
  thread_status,
  opened_by_actor_type,
  opened_by_external_ref,
  last_activity_at
)
select
  d.id,
  t.id,
  'thread_001',
  'Human Command Center',
  'Nhập lệnh điều khiển hệ thống',
  'NOT_STARTED',
  'ACTIVE',
  'HUMAN',
  'Human Founder',
  now()
from pn_os_ai_department.departments d
left join pn_os_ai_department.tasks t
  on t.task_key = 'task_001'
where d.department_key = 'governance_core'
  and not exists (
    select 1
    from pn_os_ai_department.chat_threads
    where thread_key = 'thread_001'
  );

insert into pn_os_ai_department.chat_messages (
  thread_id,
  message_seq,
  actor_type,
  actor_external_ref,
  message_kind,
  content,
  content_format,
  intent_type,
  created_at
)
select
  th.id,
  v.message_seq,
  v.actor_type::pn_os_ai_department.actor_type_enum,
  v.actor_external_ref,
  v.message_kind,
  v.content,
  v.content_format,
  v.intent_type,
  now()
from (
  values
    ('thread_001', 1, 'SYSTEM', 'SYSTEM', 'SYSTEM', 'Phase 1 chat is ready and compatibility views are active.', 'markdown', null),
    ('thread_001', 2, 'HUMAN', 'Human Founder', 'COMMAND', 'Please prepare the governance summary and route it to the right department.', 'markdown', 'create_content')
) as v(thread_key, message_seq, actor_type, actor_external_ref, message_kind, content, content_format, intent_type)
join pn_os_ai_department.chat_threads th
  on th.thread_key = v.thread_key
where not exists (
  select 1
  from pn_os_ai_department.chat_messages cm
  where cm.thread_id = th.id
    and cm.message_seq = v.message_seq
);

insert into pn_os_ai_department.audit_logs (
  actor_type,
  actor_external_ref,
  action,
  entity_type,
  entity_id,
  before_state,
  after_state,
  reason,
  request_id,
  event_hash,
  created_at
)
select
  'HUMAN'::pn_os_ai_department.actor_type_enum,
  'Human Founder',
  'message_received',
  'CHAT_THREAD',
  th.id,
  'NOT_STARTED'::pn_os_ai_department.lifecycle_state,
  'PARTIAL'::pn_os_ai_department.lifecycle_state,
  'Command intake created a review-ready task request.',
  gen_random_uuid(),
  encode(extensions.digest(convert_to(concat('phase1-chat-seed-', th.id::text), 'utf8'), 'sha256'::text), 'hex'),
  now()
from pn_os_ai_department.chat_threads th
where th.thread_key = 'thread_001'
  and not exists (
    select 1
    from pn_os_ai_department.audit_logs al
    where al.entity_type = 'CHAT_THREAD'
      and al.entity_id = th.id
  );

-- -----------------------------------------------------------------------------
-- explicitly grant access to service_role for API usage via PostgREST
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON pn_os_ai_department.chat_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pn_os_ai_department.chat_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pn_os_ai_department.audit_logs TO service_role;

commit;
