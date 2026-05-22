begin;

do $$
declare
  has_live_sources boolean;
begin
  select
    to_regclass('governance_runtime.governance_workflow_runs') is not null
    and to_regclass('governance_runtime.governance_audit_events') is not null
    and to_regclass('governance_runtime.governance_run_finalization_events') is not null
    and to_regclass('governance_runtime.governance_artifact_lock_events') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'governance_runtime'
        and table_name = 'governance_workflow_runs'
        and column_name = 'run_id'
    )
  into has_live_sources;

  if has_live_sources then
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
        lf.created_at as finished_at,
        r.run_id::text as workflow_run_id,
        null::text as n8n_execution_id,
        null::bigint as attempt_count,
        null::bigint as max_attempts,
        greatest(
          r.created_at,
          coalesce(lf.created_at, r.created_at),
          coalesce(ll.created_at, r.created_at),
          coalesce(ae.created_at, r.created_at)
        ) as last_event_at
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
        null::timestamptz as finished_at,
        null::text as workflow_run_id,
        null::text as n8n_execution_id,
        null::bigint as attempt_count,
        null::bigint as max_attempts,
        null::timestamptz as last_event_at
      where false;
    $v$;
  end if;
end $$;

grant select on public.phase4_execution_traces to anon;
grant select on public.phase4_execution_traces to authenticated;

commit;
