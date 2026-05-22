-- Verification queries v0.2.1 - DRAFT ONLY
-- Run after dry-run migration in non-production environment.

-- 1. Unsafe SECURITY DEFINER search_path: should return zero rows.
select n.nspname as schema_name, p.proname, pg_get_functiondef(p.oid) as function_def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'governance_runtime'
  and p.prosecdef = true
  and pg_get_functiondef(p.oid) ~* 'search_path\s*=.*public';

-- 2. Function owner mismatch: should return zero rows after ownership plan.
select n.nspname, p.proname, r.rolname as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'governance_runtime'
  and r.rolname <> 'governance_runtime_owner';

-- 3. Public execute grants: should return zero rows.
select routine_schema, routine_name, privilege_type, grantee
from information_schema.routine_privileges
where routine_schema = 'governance_runtime'
  and grantee = 'PUBLIC';

-- 4. Direct UPDATE/DELETE grants on immutable tables to n8n roles: should return zero rows.
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'governance_runtime'
  and grantee in ('n8n_audit_writer','n8n_readonly')
  and privilege_type in ('UPDATE','DELETE','INSERT');

-- 5. Broad n8n SELECT grants over governance tables: should return zero rows except approved scoped view.
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'governance_runtime'
  and grantee = 'n8n_readonly'
  and privilege_type = 'SELECT'
  and table_name <> 'v_n8n_allowed_runtime_read';

-- 6. Event hash duplicates: should return zero rows.
select event_hash, count(*)
from governance_runtime.governance_audit_events
group by event_hash
having count(*) > 1;

-- 7. Chain breaks: previous_event_hash must exist when not null. Should return zero rows.
select e.event_id, e.previous_event_hash
from governance_runtime.governance_audit_events e
where e.previous_event_hash is not null
  and not exists (
    select 1 from governance_runtime.governance_audit_events prev
    where prev.event_hash = e.previous_event_hash
  );

-- 8. Stale/expired protocol snapshot usage: should return zero rows.
select *
from governance_runtime.governance_protocol_snapshots
where runtime_load_allowed is not true
   or upper(registry_status) in ('REVOKED','SUPERSEDED','SHADOW','INVALID','REFERENCE_ONLY')
   or upper(registry_validated_status) in ('REVOKED','SUPERSEDED','SHADOW','INVALID','REFERENCE_ONLY')
   or valid_until <= now()
   or extract(epoch from now() - issued_at) > max_snapshot_age_seconds;

-- 9. Forbidden semantic labels across relevant fields: should return zero rows.
with labels as (
  select 'audit_event_type' as source, event_type as label from governance_runtime.governance_audit_events
  union all select 'reason_code', reason_code from governance_runtime.governance_audit_events where reason_code is not null
  union all select 'terminal_outcome', terminal_outcome from governance_runtime.governance_run_finalization_events
  union all select 'lock_status', lock_status from governance_runtime.governance_artifact_lock_events
  union all select 'escalation_type', escalation_type from governance_runtime.governance_escalations
  union all select 'verification_result', verification_result from governance_runtime.governance_audit_verification_events
)
select l.*
from labels l
join governance_runtime.forbidden_semantic_labels f on upper(f.label) = upper(l.label);

-- 10. Recovery idempotency reuse: should return zero rows.
select *
from governance_runtime.governance_artifact_lock_events
where recovery_idempotency_key is not null
  and recovery_idempotency_key = original_idempotency_key;

-- 11. Direct grants on immutable tables to PUBLIC: should return zero rows.
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'governance_runtime'
  and grantee = 'PUBLIC';
