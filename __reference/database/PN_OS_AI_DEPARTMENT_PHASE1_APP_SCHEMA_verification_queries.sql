-- PN OS AI Department Phase 1 App Schema Verification Queries
-- Run after applying PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA.sql in a non-production Supabase/Postgres environment.
-- All queries are read-only and safe for dry-run review.
--
-- Expected pattern:
-- - object-existence checks should return present/true rows
-- - mismatch checks should return zero rows

-- 1) Schema exists.
select nspname as schema_name
from pg_namespace
where nspname = 'pn_os_ai_department';

-- 2) Core enums exist with the expected labels.
select t.typname as enum_name, array_agg(e.enumlabel order by e.enumsortorder) as labels
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'pn_os_ai_department'
  and t.typtype = 'e'
group by t.typname
order by t.typname;

-- 3) Core tables exist.
select table_name
from information_schema.tables
where table_schema = 'pn_os_ai_department'
  and table_type = 'BASE TABLE'
  and table_name in (
    'departments',
    'agents',
    'gates',
    'tasks',
    'artifacts',
    'artifact_versions',
    'qa_reviews',
    'approvals',
    'workflow_runs',
    'chat_threads',
    'chat_messages',
    'audit_logs',
    'handoff_packets',
    'media_pipeline_stages'
  )
order by table_name;

-- 4) Frontend contract views exist.
select table_name
from information_schema.views
where table_schema = 'pn_os_ai_department'
  and table_name in (
    'department_dashboard_v1',
    'agent_directory_v1',
    'task_inbox_v1',
    'artifact_registry_v1',
    'workflow_run_monitor_v1',
    'qa_review_panel_v1',
    'gate_console_v1',
    'approval_console_v1',
    'chat_thread_inbox_v1',
    'chat_message_feed_v1',
    'audit_log_feed_v1',
    'media_pipeline_board_v1'
  )
order by table_name;

-- 5) View column contracts are present.
with expected(view_name, column_name) as (
  values
    ('department_dashboard_v1', 'department_key'),
    ('department_dashboard_v1', 'name'),
    ('department_dashboard_v1', 'owner'),
    ('department_dashboard_v1', 'purpose'),
    ('department_dashboard_v1', 'state'),
    ('department_dashboard_v1', 'activeAgents'),
    ('department_dashboard_v1', 'openTasks'),
    ('agent_directory_v1', 'departmentId'),
    ('agent_directory_v1', 'name'),
    ('agent_directory_v1', 'role'),
    ('agent_directory_v1', 'status'),
    ('agent_directory_v1', 'state'),
    ('agent_directory_v1', 'focus'),
    ('task_inbox_v1', 'departmentId'),
    ('task_inbox_v1', 'agentId'),
    ('task_inbox_v1', 'status'),
    ('task_inbox_v1', 'intentType'),
    ('task_inbox_v1', 'createdAt'),
    ('task_inbox_v1', 'updatedAt'),
    ('task_inbox_v1', 'owner'),
    ('task_inbox_v1', 'priority'),
    ('artifact_registry_v1', 'departmentId'),
    ('artifact_registry_v1', 'state'),
    ('artifact_registry_v1', 'updatedAt'),
    ('artifact_registry_v1', 'version'),
    ('workflow_run_monitor_v1', 'workflowKey'),
    ('workflow_run_monitor_v1', 'status'),
    ('workflow_run_monitor_v1', 'startedAt'),
    ('workflow_run_monitor_v1', 'duration'),
    ('workflow_run_monitor_v1', 'target'),
    ('qa_review_panel_v1', 'artifactId'),
    ('qa_review_panel_v1', 'reviewer'),
    ('qa_review_panel_v1', 'status'),
    ('qa_review_panel_v1', 'reviewedAt'),
    ('gate_console_v1', 'name'),
    ('gate_console_v1', 'state'),
    ('gate_console_v1', 'owner'),
    ('gate_console_v1', 'rationale'),
    ('approval_console_v1', 'targetType'),
    ('approval_console_v1', 'targetId'),
    ('approval_console_v1', 'status'),
    ('approval_console_v1', 'requestedBy'),
    ('approval_console_v1', 'requestedAt'),
    ('approval_console_v1', 'decidedBy'),
    ('chat_thread_inbox_v1', 'title'),
    ('chat_thread_inbox_v1', 'purpose'),
    ('chat_thread_inbox_v1', 'lastActivityAt'),
    ('chat_thread_inbox_v1', 'status'),
    ('chat_message_feed_v1', 'threadId'),
    ('chat_message_feed_v1', 'sender'),
    ('chat_message_feed_v1', 'body'),
    ('chat_message_feed_v1', 'createdAt'),
    ('audit_log_feed_v1', 'entityType'),
    ('audit_log_feed_v1', 'entityId'),
    ('audit_log_feed_v1', 'action'),
    ('audit_log_feed_v1', 'actor'),
    ('audit_log_feed_v1', 'details'),
    ('media_pipeline_board_v1', 'stage'),
    ('media_pipeline_board_v1', 'status'),
    ('media_pipeline_board_v1', 'owner'),
    ('media_pipeline_board_v1', 'note')
)
select e.view_name, e.column_name
from expected e
left join information_schema.columns c
  on c.table_schema = 'pn_os_ai_department'
 and c.table_name = e.view_name
 and c.column_name = e.column_name
where c.column_name is null
order by e.view_name, e.column_name;

-- 6) Seed departments exist.
select department_key, canonical_name, owner_label, state
from pn_os_ai_department.departments
where department_key in ('governance_core', 'pn_media_plus')
order by department_key;

-- 7) Seed agents exist.
select agent_key, canonical_name, role_code, authority_scope, operational_status, state
from pn_os_ai_department.agents
where agent_key in (
  'governance_core_seed_registry_observer',
  'governance_core_seed_review_proxy',
  'pn_media_plus_seed_registry_observer',
  'pn_media_plus_seed_pipeline_watcher'
)
order by agent_key;

-- 8) Seed gates exist.
select gate_key, canonical_name, gate_kind, applies_to_entity_type, is_blocking, state
from pn_os_ai_department.gates
where gate_key in ('human_approval_gate', 'qa_state_gate', 'media_release_gate')
order by gate_key;

-- 9) Seed tasks exist and are correctly wired.
select task_key, title, intent_type, owner_label, state, priority, gate_id, requester_actor_type
from pn_os_ai_department.tasks
where task_key in ('task_001', 'task_002', 'task_003')
order by task_key;

-- 10) Seed artifacts and current version wiring exist.
select artifact_key, canonical_name, artifact_type, version_label, state, current_version_id
from pn_os_ai_department.artifacts
where artifact_key in ('artifact_001', 'artifact_002', 'artifact_003')
order by artifact_key;

select a.artifact_key, av.version_number, av.content_ref, av.content_sha256
from pn_os_ai_department.artifact_versions av
join pn_os_ai_department.artifacts a on a.id = av.artifact_id
where a.artifact_key in ('artifact_001', 'artifact_002', 'artifact_003')
order by a.artifact_key, av.version_number;

-- 11) QA reviews exist.
select qr.id, a.artifact_key, qr.verdict, qr.notes, qr.evidence_ref
from pn_os_ai_department.qa_reviews qr
join pn_os_ai_department.artifact_versions av on av.id = qr.artifact_version_id
join pn_os_ai_department.artifacts a on a.id = av.artifact_id
order by a.artifact_key, qr.created_at;

-- 12) Approvals exist.
select a.id, a.entity_type, a.entity_id, a.approval_status, a.verdict, a.evidence_ref
from pn_os_ai_department.approvals a
order by a.created_at;

-- 13) Workflow runs exist.
select workflow_key, workflow_name, run_status, state, target_label, duration_label
from pn_os_ai_department.workflow_runs
where workflow_key in ('human_task_intake', 'state_update_request', 'audit_log_append')
order by workflow_key;

-- 14) Chat thread/message seed exists.
select thread_key, subject, purpose, thread_status, last_activity_at
from pn_os_ai_department.chat_threads
where thread_key = 'thread_001';

select thread_id, message_seq, actor_type, message_kind, intent_type, target_department_id, target_agent_id
from pn_os_ai_department.chat_messages
order by thread_id, message_seq;

-- 15) Audit logs exist and are unique.
select event_hash, count(*)
from pn_os_ai_department.audit_logs
group by event_hash
having count(*) > 1;

select actor_type, action, entity_type, entity_id, reason, created_at
from pn_os_ai_department.audit_logs
order by created_at;

-- 16) Handoff packets table exists and is empty or populated as expected.
select count(*) as handoff_packet_count
from pn_os_ai_department.handoff_packets;

-- 17) Media pipeline seed exists.
select stage_key, stage_name, status, owner_label, sort_order
from pn_os_ai_department.media_pipeline_stages
where stage_key in ('media_intake', 'media_editing', 'media_qa')
order by sort_order;

-- 18) Frontend contract views return expected row shapes.
select *
from pn_os_ai_department.department_dashboard_v1
order by department_key;

select *
from pn_os_ai_department.agent_directory_v1
order by "departmentId", name;

select *
from pn_os_ai_department.task_inbox_v1
order by "createdAt";

select *
from pn_os_ai_department.artifact_registry_v1
order by "updatedAt" desc;

select *
from pn_os_ai_department.workflow_run_monitor_v1
order by "startedAt" desc nulls last;

select *
from pn_os_ai_department.qa_review_panel_v1
order by "reviewedAt" desc;

select *
from pn_os_ai_department.gate_console_v1
order by name;

select *
from pn_os_ai_department.approval_console_v1
order by "requestedAt" desc;

select *
from pn_os_ai_department.chat_thread_inbox_v1
order by "lastActivityAt" desc;

select *
from pn_os_ai_department.chat_message_feed_v1
order by "threadId", "createdAt";

select *
from pn_os_ai_department.audit_log_feed_v1
order by "createdAt";

select *
from pn_os_ai_department.media_pipeline_board_v1
order by stage;

-- 19) Append-only protection is present on immutable tables.
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'pn_os_ai_department'
  and t.tgname in (
    'chat_messages_append_only',
    'audit_logs_append_only',
    'artifact_versions_append_only',
    'qa_reviews_append_only',
    'approvals_append_only'
  )
order by c.relname, t.tgname;

-- 20) No accidental public grants on the app schema objects.
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'pn_os_ai_department'
  and grantee = 'PUBLIC'
order by table_name, privilege_type;

select routine_schema, routine_name, privilege_type, grantee
from information_schema.routine_privileges
where routine_schema = 'pn_os_ai_department'
  and grantee = 'PUBLIC'
order by routine_name, privilege_type;

-- 21) No RLS is enabled by default in this Phase 1 package.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'pn_os_ai_department'
  and c.relkind = 'r'
order by c.relname;

-- 22) Verify there are no unexpected UI label columns in canonical tables.
select table_name, column_name
from information_schema.columns
where table_schema = 'pn_os_ai_department'
  and column_name ~* '(^ui_|^display_|_label$|_i18n$|_locale$|_copy$|^caption$|^translation_)'
order by table_name, column_name;
