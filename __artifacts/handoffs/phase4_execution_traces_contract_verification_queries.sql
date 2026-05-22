-- 1. Verify upstream source can support workflow_run_id alias.
select
  case
    when exists (
      select 1
      from information_schema.columns
      where table_schema = 'governance_runtime'
        and table_name = 'governance_workflow_runs'
        and column_name = 'run_id'
    )
    then 'PASS'
    else 'BLOCKER'
  end as source_run_id_available,
  'governance_runtime.governance_workflow_runs.run_id is aliased as public.phase4_execution_traces.workflow_run_id' as contract_note;

-- 2. Verify public view exposes the loader contract columns.
select
  column_name,
  data_type
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

-- 3. Verify workflow_run_id is queryable by the Phase 4 loader.
select
  trace_id,
  workflow_run_id,
  workflow_ref,
  current_state,
  last_event_at
from public.phase4_execution_traces
order by last_event_at desc nulls last
limit 10;

-- 4. Fail-closed signal: if this returns any rows, the view exists but lacks live trace data.
select
  case
    when exists (select 1 from public.phase4_execution_traces limit 1)
    then 'LIVE_ROWS_AVAILABLE'
    else 'PENDING_OR_INCOMPLETE'
  end as phase4_trace_read_state;
