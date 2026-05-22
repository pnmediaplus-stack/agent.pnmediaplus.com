# SQL_DRAFT_v0.2.1 Minor Patch Notes

received: YES  
mode: SQL_DRAFT_v0.2.1_MINOR_PATCH / SQL_DRAFT_PATCH_ONLY  
input_type: Gatekeeper CONDITIONAL_PASS_WITH_FIXES SQL minor patch  
status: DRAFT_ONLY / NO_SQL_APPLY / NO_PRODUCTION_MUTATION  
next_step: Gatekeeper SQL re-review

## 1. Scope

This package patches the Supabase PostgreSQL Governance Runtime SQL draft from v0.2 to v0.2.1.
It remains SQL draft only. It is not applied, not production-authorized, and not a PASS.

## 2. Gatekeeper finding-to-fix mapping

| Finding | v0.2.1 fix |
|---|---|
| Protocol snapshot registry authority fields missing | Added registry_status, registry_validated_status, runtime_load_allowed, and status blocking checks |
| n8n broad read scope risk | n8n_readonly is restricted to v_n8n_allowed_runtime_read only; view is scoped by request context |
| Chain enforcement consistency | finalization, lock, escalation, verification all route through append_audit_event |
| Function ownership enforcement | expected owner governance_runtime_owner declared; verification query added |
| Recovery idempotency | stale lock recovery rejects original idempotency key reuse |

## 3. Updated SQL migration v0.2.1

Full SQL source is in:

`governance_runtime_supabase_v0_2_1.sql`

Markdown is explanatory only and is not the SQL source of truth.

## 4. Updated verification queries

Verification source is in:

`verification_queries_v0_2_1.sql`

Checks include unsafe SECURITY DEFINER search_path, function owner mismatch, public grants, direct n8n immutable-table grants, broad n8n SELECT, duplicate event_hash, chain breaks, stale snapshots, forbidden semantic labels, recovery idempotency reuse.

## 5. Updated Gatekeeper handoff

Handoff source is in:

`GATEKEEPER_SQL_REVIEW_HANDOFF_v0_2_1.yaml`

## 6. Remaining risks

- n8n scoped view depends on correct Supabase request/JWT/header context propagation.
- ownership commands may require privileged migration owner.
- projection views remain non-authoritative and must not be used for governance decision.
- dry-run must validate all trigger/function grants in target Supabase project.

## 7. Dry-run readiness statement

`ready_for_controlled_db_dry_run_review: true`

This means the draft is prepared for Gatekeeper to consider controlled dry-run authorization. It does not mean SQL is applied, production ready, or approved.

## 8. Next actions

Send this package to Gatekeeper for SQL re-review. Do not apply SQL until a separate authorized dry-run/apply gate exists.
