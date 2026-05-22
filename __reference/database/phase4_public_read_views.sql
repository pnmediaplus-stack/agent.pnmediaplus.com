begin;

do $$
begin
  if to_regclass('governance_runtime.governance_workflow_runs') is not null
     and to_regclass('governance_runtime.governance_audit_events') is not null
     and to_regclass('governance_runtime.governance_run_finalization_events') is not null
     and to_regclass('governance_runtime.governance_artifact_lock_events') is not null then
    execute $v$
      create or replace view public.phase4_execution_traces as
      with latest_lock as (
        select distinct on (l.artifact_id)
          l.artifact_id,
          l.run_id,
          l.lock_status,
          l.original_idempotency_key,
          l.recovery_idempotency_key,
          l.created_at
        from governance_runtime.governance_artifact_lock_events l
        order by l.artifact_id, l.created_at desc, l.lock_event_id desc
      ),
      latest_finalization as (
        select distinct on (f.run_id)
          f.run_id,
          f.terminal_outcome,
          f.created_at,
          f.audit_event_id
        from governance_runtime.governance_run_finalization_events f
        order by f.run_id, f.created_at desc, f.finalization_id desc
      ),
      latest_audit_error as (
        select distinct on (e.run_id)
          e.run_id,
          coalesce(e.payload->>'error_code', e.reason_code) as error_code,
          e.payload->>'status_message' as status_message,
          e.created_at
        from governance_runtime.governance_audit_events e
        where e.payload ? 'error_code'
           or e.payload ? 'status_message'
           or e.reason_code is not null
        order by e.run_id, e.created_at desc, e.event_id desc
      )
      select
        r.run_id::text as trace_id,
        coalesce(s.immutable_event_id, r.start_event_id::text) as request_ref,
        r.workflow_name as workflow_ref,
        r.artifact_id as task_ref,
        lf.audit_event_id::text as receipt_ref,
        case
          when lf.terminal_outcome = 'DRY_RUN_COMPLETED' then 'succeeded'
          when lf.terminal_outcome = 'EVIDENCE_RECORDED' then 'succeeded'
          when lf.terminal_outcome = 'BLOCKED_FAIL_CLOSED' then 'blocked'
          when lf.terminal_outcome = 'RUNTIME_RECHECK_REQUIRED' then 'failed'
          when lf.terminal_outcome = 'ESCALATED_FOR_REVIEW' then 'failed'
          when ll.lock_status = 'LOCK_HELD' then 'running'
          when ll.lock_status = 'LOCK_REQUESTED' or ll.lock_status = 'LOCK_RELEASE_REQUESTED' then 'queued'
          else 'pending'
        end as current_state,
        case
          when lf.terminal_outcome = 'RUNTIME_RECHECK_REQUIRED' then 'retry_available'
          when ll.lock_status = 'RECOVERY_ROUTE_PREPARED' then 'retry_scheduled'
          when lf.terminal_outcome = 'BLOCKED_FAIL_CLOSED' then 'retry_exhausted'
          when lf.terminal_outcome = 'ESCALATED_FOR_REVIEW' then 'blocked'
          else 'not_applicable'
        end as retry_state,
        case
          when lf.created_at is null then null
          else round(extract(epoch from (lf.created_at - r.created_at)) * 1000)::bigint
        end as latency_ms,
        coalesce(ll.lock_status, 'NO_ACTIVE_LOCK') as queue_state,
        case
          when ae.error_code is not null and ae.status_message is not null then ae.error_code || ': ' || ae.status_message
          when ae.error_code is not null then ae.error_code
          when ae.status_message is not null then ae.status_message
          else null
        end as error_summary,
        r.created_at as started_at,
        lf.created_at as finished_at
      from governance_runtime.governance_workflow_runs r
      join governance_runtime.governance_audit_events s
        on s.event_id = r.start_event_id
      left join latest_finalization lf
        on lf.run_id = r.run_id
      left join latest_lock ll
        on ll.run_id = r.run_id
      left join latest_audit_error ae
        on ae.run_id = r.run_id;
    $v$;
  else
    execute $v$
      create or replace view public.phase4_execution_traces as
      select
        null::text as trace_id,
        null::text as request_ref,
        null::text as workflow_ref,
        null::text as task_ref,
        null::text as receipt_ref,
        null::text as current_state,
        null::text as retry_state,
        null::bigint as latency_ms,
        null::text as queue_state,
        null::text as error_summary,
        null::timestamptz as started_at,
        null::timestamptz as finished_at
      where false;
    $v$;
  end if;
end $$;

drop view if exists public.phase4_execution_metrics;

do $$
begin
  if to_regclass('governance_runtime.governance_workflow_runs') is not null
     and to_regclass('governance_runtime.governance_run_finalization_events') is not null then
    execute $v$
      create or replace view public.phase4_execution_receipts as
      select
        coalesce(f.audit_event_id::text, r.start_event_id::text) as receipt_ref,
        r.run_id::text as trace_ref,
        r.start_event_id::text as request_ref,
        r.workflow_name as workflow_ref,
        r.artifact_id as task_ref,
        f.terminal_outcome as terminal_outcome,
        case
          when f.audit_event_id is not null then 'finalized'
          else 'issued'
        end as receipt_state,
        f.created_at as finalized_at,
        r.created_at as started_at
      from governance_runtime.governance_workflow_runs r
      left join governance_runtime.governance_run_finalization_events f
        on f.run_id = r.run_id;
    $v$;
  else
    execute $v$
      create or replace view public.phase4_execution_receipts as
      select
        null::text as receipt_ref,
        null::text as trace_ref,
        null::text as request_ref,
        null::text as workflow_ref,
        null::text as task_ref,
        null::text as terminal_outcome,
        null::text as receipt_state,
        null::timestamptz as finalized_at,
        null::timestamptz as started_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.governance_workflow_runs') is not null
     and to_regclass('governance_runtime.governance_run_finalization_events') is not null
     and to_regclass('governance_runtime.governance_artifact_lock_events') is not null then
    execute $v$
      create or replace view public.phase4_retry_status as
      with latest_lock as (
        select distinct on (l.artifact_id)
          l.artifact_id,
          l.run_id,
          l.lock_status,
          l.original_idempotency_key,
          l.recovery_idempotency_key,
          l.created_at
        from governance_runtime.governance_artifact_lock_events l
        order by l.artifact_id, l.created_at desc, l.lock_event_id desc
      ),
      latest_finalization as (
        select distinct on (f.run_id)
          f.run_id,
          f.terminal_outcome,
          f.created_at
        from governance_runtime.governance_run_finalization_events f
        order by f.run_id, f.created_at desc, f.finalization_id desc
      )
      select
        r.run_id::text as trace_ref,
        r.artifact_id as task_ref,
        r.workflow_name as workflow_ref,
        case
          when lf.terminal_outcome = 'RUNTIME_RECHECK_REQUIRED' then 'retry_available'
          when ll.lock_status = 'RECOVERY_ROUTE_PREPARED' then 'retry_scheduled'
          when lf.terminal_outcome = 'BLOCKED_FAIL_CLOSED' then 'retry_exhausted'
          when lf.terminal_outcome = 'ESCALATED_FOR_REVIEW' then 'blocked'
          else 'not_applicable'
        end as retry_state,
        ll.lock_status as lock_state,
        ll.original_idempotency_key as original_request_ref,
        ll.recovery_idempotency_key as recovery_ref,
        lf.terminal_outcome as terminal_outcome,
        greatest(coalesce(ll.created_at, r.created_at), coalesce(lf.created_at, r.created_at)) as observed_at
      from governance_runtime.governance_workflow_runs r
      left join latest_finalization lf
        on lf.run_id = r.run_id
      left join latest_lock ll
        on ll.run_id = r.run_id;
    $v$;
  else
    execute $v$
      create or replace view public.phase4_retry_status as
      select
        null::text as trace_ref,
        null::text as task_ref,
        null::text as workflow_ref,
        null::text as retry_state,
        null::text as lock_state,
        null::text as original_request_ref,
        null::text as recovery_ref,
        null::text as terminal_outcome,
        null::timestamptz as observed_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.governance_audit_events') is not null then
    execute $v$
      create or replace view public.phase4_execution_audit_events as
      select
        e.event_id::text as id,
        e.run_id::text as trace_id,
        e.event_family as event_family,
        e.event_type as event_type,
        e.created_by as actor_ref,
        coalesce(e.payload->>'status_message', e.reason_code, e.event_type) as summary,
        e.payload->>'error_code' as error_code,
        e.payload->>'status_message' as status_message,
        e.created_at as created_at
      from governance_runtime.governance_audit_events e;
    $v$;
  else
    execute $v$
      create or replace view public.phase4_execution_audit_events as
      select
        null::text as id,
        null::text as trace_id,
        null::text as event_family,
        null::text as event_type,
        null::text as actor_ref,
        null::text as summary,
        null::text as error_code,
        null::text as status_message,
        null::timestamptz as created_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.governance_workflow_runs') is not null
     and to_regclass('governance_runtime.governance_run_finalization_events') is not null then
    execute $v$
      create or replace view public.phase4_execution_metrics as
      with trace_base as (
        select
          r.run_id,
          r.created_at as started_at,
          f.created_at as finished_at,
          f.terminal_outcome,
          case
            when f.terminal_outcome in ('DRY_RUN_COMPLETED', 'EVIDENCE_RECORDED') then 1
            else 0
          end as succeeded_flag,
          case
            when f.terminal_outcome in ('BLOCKED_FAIL_CLOSED', 'RUNTIME_RECHECK_REQUIRED', 'ESCALATED_FOR_REVIEW') then 1
            else 0
          end as blocked_flag,
          case
            when f.created_at is null then null
            else extract(epoch from (f.created_at - r.created_at)) * 1000
          end as latency_ms
        from governance_runtime.governance_workflow_runs r
        left join governance_runtime.governance_run_finalization_events f
          on f.run_id = r.run_id
      )
      select
        coalesce(round(100.0 * sum(succeeded_flag)::numeric / nullif(count(*), 0), 2), null) as success_rate_pct,
        coalesce(round(avg(latency_ms))::bigint, null) as latency_ms_avg,
        sum(case when finished_at is null then 1 else 0 end)::integer as queue_depth,
        sum(case when terminal_outcome = 'RUNTIME_RECHECK_REQUIRED' then 1 else 0 end)::integer as retry_pressure,
        count(*)::integer as total_traces,
        sum(succeeded_flag)::integer as successful_traces,
        sum(blocked_flag)::integer as blocked_traces,
        case
          when count(*) = 0 then 'blocked'
          when sum(blocked_flag) > 0 then 'blocked'
          else 'ready'
        end as load_state,
        now() as captured_at,
        min(started_at) as window_start,
        max(coalesce(finished_at, started_at)) as window_end
      from trace_base;
    $v$;
  else
    execute $v$
      create or replace view public.phase4_execution_metrics as
      select
        null::numeric as success_rate_pct,
        null::bigint as latency_ms_avg,
        null::integer as queue_depth,
        null::integer as retry_pressure,
        null::integer as total_traces,
        null::integer as successful_traces,
        null::integer as blocked_traces,
        null::text as load_state,
        null::timestamptz as captured_at,
        null::timestamptz as window_start,
        null::timestamptz as window_end
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.phase4_execution_traces to anon;
    grant select on public.phase4_execution_receipts to anon;
    grant select on public.phase4_retry_status to anon;
    grant select on public.phase4_execution_audit_events to anon;
    grant select on public.phase4_execution_metrics to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.phase4_execution_traces to authenticated;
    grant select on public.phase4_execution_receipts to authenticated;
    grant select on public.phase4_retry_status to authenticated;
    grant select on public.phase4_execution_audit_events to authenticated;
    grant select on public.phase4_execution_metrics to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'n8n_readonly') then
    grant select on public.phase4_execution_traces to n8n_readonly;
    grant select on public.phase4_execution_receipts to n8n_readonly;
    grant select on public.phase4_retry_status to n8n_readonly;
    grant select on public.phase4_execution_audit_events to n8n_readonly;
    grant select on public.phase4_execution_metrics to n8n_readonly;
  end if;

  if exists (select 1 from pg_roles where rolname = 'gatekeeper_readonly') then
    grant select on public.phase4_execution_traces to gatekeeper_readonly;
    grant select on public.phase4_execution_receipts to gatekeeper_readonly;
    grant select on public.phase4_retry_status to gatekeeper_readonly;
    grant select on public.phase4_execution_audit_events to gatekeeper_readonly;
    grant select on public.phase4_execution_metrics to gatekeeper_readonly;
  end if;
end $$;

commit;

-- Verification queries
select table_name, table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'phase4_execution_traces',
    'phase4_execution_receipts',
    'phase4_retry_status',
    'phase4_execution_audit_events',
    'phase4_execution_metrics'
  )
order by table_name;

select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'phase4_execution_traces',
    'phase4_execution_receipts',
    'phase4_retry_status',
    'phase4_execution_audit_events',
    'phase4_execution_metrics'
  )
  and privilege_type = 'SELECT'
order by table_name, grantee;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_execution_audit_events'
  and column_name in ('error_code', 'status_message', 'summary', 'actor_ref', 'event_type', 'trace_id', 'created_at')
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_execution_traces'
  and column_name in ('request_ref', 'workflow_ref', 'task_ref', 'receipt_ref', 'current_state', 'retry_state', 'latency_ms', 'queue_state', 'error_summary')
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_execution_metrics'
  and column_name in ('success_rate_pct', 'latency_ms_avg', 'queue_depth', 'retry_pressure', 'total_traces', 'successful_traces', 'blocked_traces', 'load_state', 'captured_at', 'window_start', 'window_end')
order by column_name;
