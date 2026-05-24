select
  'schema_exists' as check_name,
  case when exists (
    select 1
    from information_schema.schemata
    where schema_name = 'lead_canonical'
  ) then 'PASS' else 'BLOCK' end as status;

select
  'leads_table_exists' as check_name,
  case when exists (
    select 1
    from information_schema.tables
    where table_schema = 'lead_canonical'
      and table_name = 'leads'
  ) then 'PASS' else 'BLOCK' end as status;

select
  'lead_history_table_exists' as check_name,
  case when exists (
    select 1
    from information_schema.tables
    where table_schema = 'lead_canonical'
      and table_name = 'lead_history'
  ) then 'PASS' else 'BLOCK' end as status;

select
  'public_read_views_exist' as check_name,
  case when exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
      and table_name in ('phase067_leads', 'phase067_lead_history')
  ) then 'PASS' else 'BLOCK' end as status;

select
  'snapshot_rpc_exists' as check_name,
  case when exists (
    select 1
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name = 'phase067_lead_snapshot'
      and routine_type = 'FUNCTION'
  ) then 'PASS' else 'BLOCK' end as status;

select
  'required_columns_present' as check_name,
  case when count(*) = 12 then 'PASS' else 'BLOCK' end as status
from information_schema.columns
where table_schema = 'lead_canonical'
  and table_name = 'leads'
  and column_name in (
    'lead_id',
    'source_channel',
    'source_ref',
    'customer_ref',
    'owner_ref',
    'stage',
    'claim_boundary',
    'qa_boundary',
    'status',
    'evidence_refs',
    'escalation_path',
    'created_at'
  );

select
  'stage_and_status_constraints_present' as check_name,
  case when count(*) >= 2 then 'PASS' else 'BLOCK' end as status
from pg_constraint c
join pg_class cl on cl.oid = c.conrelid
join pg_namespace n on n.oid = cl.relnamespace
where n.nspname = 'lead_canonical'
  and cl.relname in ('leads', 'lead_history')
  and c.conname in ('leads_stage_check', 'leads_status_check', 'lead_history_stage_check', 'lead_history_status_check');

select
  'append_only_triggers_present' as check_name,
  case when count(*) >= 2 then 'PASS' else 'BLOCK' end as status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'lead_canonical'
  and t.tgname in ('leads_reject_update_delete', 'lead_history_reject_update_delete');

select
  'public_read_grants_present' as check_name,
  case when count(*) >= 2 then 'PASS' else 'BLOCK' end as status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('phase067_leads', 'phase067_lead_history')
  and privilege_type = 'SELECT';

select
  'namespace_isolation' as check_name,
  case when not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('leads', 'lead_history')
  ) then 'PASS' else 'BLOCK' end as status;
