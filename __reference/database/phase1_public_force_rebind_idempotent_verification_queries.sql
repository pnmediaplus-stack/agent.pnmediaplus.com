-- Phase 1 public force rebind idempotent verification queries
-- Run after applying:
--   __reference/database/phase1_public_force_rebind_idempotent.sql

-- 1) Confirm current object kinds for public phase1 surfaces
select
  n.nspname as schema_name,
  c.relname as relation_name,
  c.relkind as relation_kind,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned_table'
    when 'v' then 'view'
    when 'm' then 'materialized_view'
    else c.relkind::text
  end as relation_type
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'phase1_chat_threads',
    'phase1_chat_messages',
    'phase1_audit_logs',
    'phase1_chat_threads_legacy',
    'phase1_chat_threads_legacy_conflict',
    'phase1_chat_messages_legacy',
    'phase1_chat_messages_legacy_conflict',
    'phase1_audit_logs_legacy',
    'phase1_audit_logs_legacy_conflict'
  )
order by c.relname;

-- 2) Confirm public compatibility views point to the expected columns
select
  table_name,
  column_name,
  ordinal_position,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'phase1_chat_threads',
    'phase1_chat_messages',
    'phase1_audit_logs'
  )
order by table_name, ordinal_position;

-- 3) Confirm SSOT canonical tables still exist
select
  c.relname as table_name,
  c.relkind as relation_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'pn_os_ai_department'
  and c.relname in (
    'chat_threads',
    'chat_messages',
    'audit_logs'
  )
order by c.relname;

-- 4) Smoke read from public chat threads
select
  id,
  title,
  purpose,
  "lastActivityAt",
  status,
  "createdAt"
from public.phase1_chat_threads
order by "createdAt" desc
limit 5;

-- 5) Smoke read from public chat messages
select
  id,
  "threadId",
  sender,
  body,
  "intentType",
  "createdAt"
from public.phase1_chat_messages
order by "createdAt" desc
limit 5;

-- 6) Smoke read from public audit logs
select
  id,
  "entityType",
  "entityId",
  action,
  actor,
  details,
  "createdAt"
from public.phase1_audit_logs
order by "createdAt" desc
limit 5;

-- 7) Confirm the insert triggers exist on the compatibility views
select
  tg.tgname as trigger_name,
  c.relname as relation_name
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'phase1_chat_threads',
    'phase1_chat_messages',
    'phase1_audit_logs'
  )
  and not tg.tgisinternal
order by c.relname, tg.tgname;

-- 8) Check legacy objects preserved safely if they exist
select
  n.nspname as schema_name,
  c.relname as legacy_relation,
  c.relkind as relation_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'phase1\_%\_legacy%'
order by c.relname;
