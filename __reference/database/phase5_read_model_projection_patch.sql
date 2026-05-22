begin;

drop view if exists public.phase4_execution_traces;
drop view if exists public.phase4_execution_receipts;
drop view if exists public.phase4_retry_status;
drop view if exists public.phase4_execution_audit_events;
drop view if exists public.phase4_execution_metrics;

do $$
begin
  if to_regclass('governance_runtime.runtime_execution_facts') is not null then
    execute $v$
      create view public.phase4_execution_traces as
      with latest_per_trace as (
        select distinct on (f.trace_id)
          f.trace_id,
          f.request_ref,
          f.workflow_ref,
          f.workflow_run_id,
          f.n8n_execution_id,
          f.task_ref,
          f.event_id,
          f.event_type,
          f.execution_state,
          f.retry_state,
          f.actor_type,
          f.actor_ref,
          f.latency_ms,
          f.error_summary,
          f.emitted_at
        from governance_runtime.runtime_execution_facts f
        order by f.trace_id, f.emitted_at desc, f.created_at desc, f.runtime_execution_fact_id desc
      ),
      trace_bounds as (
        select
          f.trace_id,
          count(*) filter (where f.event_type in ('NODE_FAILED', 'RETRY_SCHEDULED', 'RETRY_EXHAUSTED', 'EXECUTION_FAILED'))::integer as attempt_count,
          min(f.emitted_at) as started_at,
          max(f.emitted_at) as last_event_at
        from governance_runtime.runtime_execution_facts f
        group by f.trace_id
      ),
      latest_receipt as (
        select distinct on (f.trace_id)
          f.trace_id,
          f.event_id as receipt_ref
        from governance_runtime.runtime_execution_facts f
        where f.event_type = 'RECEIPT_ISSUED'
        order by f.trace_id, f.emitted_at desc, f.created_at desc, f.runtime_execution_fact_id desc
      )
      select
        lp.trace_id,
        lp.request_ref,
        lp.workflow_ref,
        lp.workflow_run_id,
        lp.n8n_execution_id,
        lp.task_ref,
        lr.receipt_ref,
        case
          when lp.execution_state in ('pending', 'queued', 'running', 'succeeded', 'failed', 'blocked') then lp.execution_state
          else 'blocked'
        end as current_state,
        case
          when lp.execution_state in ('pending', 'queued') then 'queued'
          when lp.execution_state = 'running' then 'running'
          else 'terminal'
        end as queue_state,
        case
          when lp.retry_state in ('not_applicable', 'retry_available', 'retry_scheduled', 'retry_exhausted', 'blocked') then lp.retry_state
          else 'blocked'
        end as retry_state,
        tb.attempt_count,
        null::integer as max_attempts,
        lp.latency_ms,
        tb.started_at,
        case
          when lp.execution_state in ('succeeded', 'failed', 'blocked') then lp.emitted_at
          else null
        end as finished_at,
        lp.error_summary,
        tb.last_event_at
      from latest_per_trace lp
      join trace_bounds tb
        on tb.trace_id = lp.trace_id
      left join latest_receipt lr
        on lr.trace_id = lp.trace_id;
    $v$;
  else
    execute $v$
      create view public.phase4_execution_traces as
      select
        null::text as trace_id,
        null::text as request_ref,
        null::text as workflow_ref,
        null::text as workflow_run_id,
        null::text as n8n_execution_id,
        null::text as task_ref,
        null::text as receipt_ref,
        null::text as current_state,
        null::text as queue_state,
        null::text as retry_state,
        null::integer as attempt_count,
        null::integer as max_attempts,
        null::numeric as latency_ms,
        null::timestamptz as started_at,
        null::timestamptz as finished_at,
        null::text as error_summary,
        null::timestamptz as last_event_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.runtime_execution_facts') is not null then
    execute $v$
      create view public.phase4_execution_receipts as
      with receipt_events as (
        select distinct on (f.trace_id)
          f.trace_id,
          f.event_id,
          f.request_ref,
          f.workflow_ref,
          f.workflow_run_id,
          f.actor_ref,
          f.emitted_at
        from governance_runtime.runtime_execution_facts f
        where f.event_type = 'RECEIPT_ISSUED'
        order by f.trace_id, f.emitted_at desc, f.created_at desc, f.runtime_execution_fact_id desc
      ),
      terminal_events as (
        select distinct on (f.trace_id)
          f.trace_id,
          f.event_id,
          f.event_type,
          f.execution_state,
          f.error_summary,
          f.emitted_at
        from governance_runtime.runtime_execution_facts f
        where f.execution_state in ('succeeded', 'failed', 'blocked')
        order by f.trace_id, f.emitted_at desc, f.created_at desc, f.runtime_execution_fact_id desc
      )
      select
        r.event_id as receipt_ref,
        r.trace_id,
        r.request_ref,
        'runtime_execution_receipt'::text as receipt_kind,
        r.actor_ref as producer_ref,
        r.workflow_run_id as consumer_ref,
        case
          when t.event_id is not null then 'sealed'
          else 'issued'
        end as status,
        t.event_id as result_ref,
        coalesce(t.error_summary, t.execution_state, 'issued') as result_summary,
        r.emitted_at as created_at,
        t.emitted_at as sealed_at
      from receipt_events r
      left join terminal_events t
        on t.trace_id = r.trace_id;
    $v$;
  else
    execute $v$
      create view public.phase4_execution_receipts as
      select
        null::text as receipt_ref,
        null::text as trace_id,
        null::text as request_ref,
        null::text as receipt_kind,
        null::text as producer_ref,
        null::text as consumer_ref,
        null::text as status,
        null::text as result_ref,
        null::text as result_summary,
        null::timestamptz as created_at,
        null::timestamptz as sealed_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.runtime_execution_facts') is not null then
    execute $v$
      create view public.phase4_retry_status as
      with latest_per_trace as (
        select distinct on (f.trace_id)
          f.trace_id,
          f.request_ref,
          f.workflow_ref,
          f.event_id,
          f.execution_state,
          f.retry_state,
          f.error_summary,
          f.emitted_at,
          f.created_at
        from governance_runtime.runtime_execution_facts f
        order by f.trace_id, f.emitted_at desc, f.created_at desc, f.runtime_execution_fact_id desc
      ),
      retry_bounds as (
        select
          f.trace_id,
          count(*) filter (where f.event_type in ('NODE_FAILED', 'RETRY_SCHEDULED', 'RETRY_EXHAUSTED', 'EXECUTION_FAILED'))::integer as attempt_count,
          max(f.emitted_at) filter (where f.event_type in ('RETRY_SCHEDULED', 'RETRY_EXHAUSTED')) as last_retry_at,
          min(f.emitted_at) as created_at,
          max(f.emitted_at) as updated_at
        from governance_runtime.runtime_execution_facts f
        group by f.trace_id
      )
      select
        lp.event_id as retry_id,
        lp.trace_id,
        lp.request_ref,
        lp.workflow_ref,
        case
          when lp.retry_state in ('not_applicable', 'retry_available', 'retry_scheduled', 'retry_exhausted', 'blocked') then lp.retry_state
          else 'blocked'
        end as retry_state,
        rb.attempt_count,
        null::integer as max_attempts,
        null::timestamptz as next_retry_at,
        rb.last_retry_at,
        lp.error_summary as last_error_summary,
        null::text as retry_policy_ref,
        rb.created_at,
        rb.updated_at
      from latest_per_trace lp
      join retry_bounds rb
        on rb.trace_id = lp.trace_id;
    $v$;
  else
    execute $v$
      create view public.phase4_retry_status as
      select
        null::text as retry_id,
        null::text as trace_id,
        null::text as request_ref,
        null::text as workflow_ref,
        null::text as retry_state,
        null::integer as attempt_count,
        null::integer as max_attempts,
        null::timestamptz as next_retry_at,
        null::timestamptz as last_retry_at,
        null::text as last_error_summary,
        null::text as retry_policy_ref,
        null::timestamptz as created_at,
        null::timestamptz as updated_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.runtime_execution_facts') is not null then
    execute $v$
      create view public.phase4_execution_audit_events as
      select
        f.event_id as audit_event_id,
        f.trace_id,
        f.request_ref,
        f.event_type,
        f.actor_type,
        f.actor_ref,
        'WORKFLOW_RUN'::text as entity_type,
        f.workflow_run_id as entity_ref,
        coalesce(f.error_summary, f.event_type, f.execution_state) as summary,
        f.emitted_at as created_at
      from governance_runtime.runtime_execution_facts f;
    $v$;
  else
    execute $v$
      create view public.phase4_execution_audit_events as
      select
        null::text as audit_event_id,
        null::text as trace_id,
        null::text as request_ref,
        null::text as event_type,
        null::text as actor_type,
        null::text as actor_ref,
        null::text as entity_type,
        null::text as entity_ref,
        null::text as summary,
        null::timestamptz as created_at
      where false;
    $v$;
  end if;
end $$;

do $$
begin
  if to_regclass('governance_runtime.runtime_execution_facts') is not null then
    execute $v$
      create view public.phase4_execution_metrics as
      with latest_per_trace as (
        select distinct on (f.trace_id)
          f.trace_id,
          f.execution_state,
          f.retry_state,
          f.latency_ms,
          f.emitted_at,
          f.created_at
        from governance_runtime.runtime_execution_facts f
        order by f.trace_id, f.emitted_at desc, f.created_at desc, f.runtime_execution_fact_id desc
      ),
      trace_bounds as (
        select
          f.trace_id,
          min(f.emitted_at) as started_at,
          max(f.emitted_at) as last_event_at
        from governance_runtime.runtime_execution_facts f
        group by f.trace_id
      ),
      combined as (
        select
          lp.trace_id,
          lp.execution_state,
          lp.retry_state,
          lp.latency_ms,
          tb.started_at,
          tb.last_event_at
        from latest_per_trace lp
        join trace_bounds tb
          on tb.trace_id = lp.trace_id
      )
      select
        coalesce(round(100.0 * (count(*) filter (where execution_state = 'succeeded'))::numeric / nullif(count(*), 0), 2), null) as success_rate_pct,
        coalesce(round(avg(latency_ms))::bigint, null) as latency_ms_avg,
        (count(*) filter (where execution_state in ('pending', 'queued', 'running')))::integer as queue_depth,
        (count(*) filter (where retry_state in ('retry_available', 'retry_scheduled', 'retry_exhausted')))::integer as retry_pressure,
        count(*)::integer as total_traces,
        (count(*) filter (where execution_state = 'succeeded'))::integer as successful_traces,
        (count(*) filter (where execution_state = 'blocked' or retry_state = 'blocked'))::integer as blocked_traces,
        case
          when count(*) = 0 then 'blocked'
          when (count(*) filter (where execution_state = 'blocked' or retry_state = 'blocked')) > 0 then 'blocked'
          else 'ready'
        end as load_state,
        now() as captured_at,
        min(started_at) as window_start,
        max(last_event_at) as window_end
      from combined;
    $v$;
  else
    execute $v$
      create view public.phase4_execution_metrics as
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
  and table_name = 'phase4_execution_traces'
  and column_name in (
    'trace_id',
    'request_ref',
    'workflow_ref',
    'workflow_run_id',
    'n8n_execution_id',
    'task_ref',
    'receipt_ref',
    'current_state',
    'queue_state',
    'retry_state',
    'attempt_count',
    'max_attempts',
    'latency_ms',
    'started_at',
    'finished_at',
    'error_summary',
    'last_event_at'
  )
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_execution_receipts'
  and column_name in (
    'receipt_ref',
    'trace_id',
    'request_ref',
    'receipt_kind',
    'producer_ref',
    'consumer_ref',
    'status',
    'result_ref',
    'result_summary',
    'created_at',
    'sealed_at'
  )
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_retry_status'
  and column_name in (
    'retry_id',
    'trace_id',
    'request_ref',
    'workflow_ref',
    'retry_state',
    'attempt_count',
    'max_attempts',
    'next_retry_at',
    'last_retry_at',
    'last_error_summary',
    'retry_policy_ref',
    'created_at',
    'updated_at'
  )
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_execution_audit_events'
  and column_name in (
    'audit_event_id',
    'trace_id',
    'request_ref',
    'event_type',
    'actor_type',
    'actor_ref',
    'entity_type',
    'entity_ref',
    'summary',
    'created_at'
  )
order by column_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'phase4_execution_metrics'
  and column_name in (
    'success_rate_pct',
    'latency_ms_avg',
    'queue_depth',
    'retry_pressure',
    'total_traces',
    'successful_traces',
    'blocked_traces',
    'load_state',
    'captured_at',
    'window_start',
    'window_end'
  )
order by column_name;

select
  table_name,
  pg_get_viewdef(format('public.%I', table_name)::regclass, true) as view_def
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'phase4_execution_traces',
    'phase4_execution_receipts',
    'phase4_retry_status',
    'phase4_execution_audit_events',
    'phase4_execution_metrics'
  )
order by table_name;
