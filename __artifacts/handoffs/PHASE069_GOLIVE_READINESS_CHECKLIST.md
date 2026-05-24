# PHASE069_GOLIVE_READINESS_CHECKLIST

Status: CLOSED_GATEKEEPER_PASS_HUMAN_LAUNCH_PENDING
Roadmap: docs/governance/069_GOLIVE_READINESS_ROADMAP_v1.md
Scope: readiness verification only
Created: 2026-05-23

## Production Values Filled

| Field | Value | Evidence Ref | State |
| --- | --- | --- | --- |
| Production URL | `https://agent.pnmediaplus.com` | `.env.local:NEXTJS_CONTROL_PLANE_BASE_URL` | FILLED |
| n8n runtime URL | `https://n8n.pnmediaplus.com/webhook` | `.env.local:N8N_WEBHOOK_BASE_URL` | FILLED |
| Supabase project URL | `https://jrgkpbjsqefvnhbiiutz.supabase.co` | `.env.local:NEXT_PUBLIC_SUPABASE_URL` | FILLED |
| Source revision | `dba5115` | `git rev-parse --short HEAD` | FILLED |
| Hosting deployment ID | `dba5115_VPS_DOCKER_ENV` | Gatekeeper directive: production smoke completed | FILLED |
| Production test user | `auth.users.id=7767ed3c-b049-4886-b9cb-50e8bb06c673`; email not recorded in repo artifact | `__reference/database/portal_auth_bootstrap_pn_media_plus_org_and_membership.sql` | PARTIAL |
| Active membership | `organization_key=pn_media_plus`, `organization_name=PN MEDIA PLUS`, `role=owner`, `status=active` | `__reference/database/portal_auth_bootstrap_pn_media_plus_org_and_membership.sql` | FILLED |
| Domain evidence ref | `VERIFIED_VIA_NODE_DNS_RESOLVE4` | Phase 069 production smoke | VERIFIED |
| SSL evidence ref | `VERIFIED_VIA_TLS_PEER_CERTIFICATE` | Phase 069 production smoke | VERIFIED |

## Authority Boundary

- No DB schema or RLS change.
- No mutation path opened.
- No public signup.
- No self-activation.
- No WordPress dependency inside canonical portal core.
- Human remains final launch authority.
- Gatekeeper remains escalation boundary.

## Readiness Mapping

| Check | Required Evidence | Current Local Finding | State | Blocker |
| --- | --- | --- | --- | --- |
| Environment and secret audit | Required env keys exist and are server/client scoped correctly | Production telemetry matches structural contracts; environment variables decoupled safely. | PASS | None after Gatekeeper smoke. |
| Domain and SSL | Production domain resolves, SSL chain valid, canonical host selected | `VERIFIED_VIA_NODE_DNS_RESOLVE4`; `VERIFIED_VIA_TLS_PEER_CERTIFICATE`. | PASS | None after Gatekeeper smoke. |
| Edge/runtime | Production runtime, Node compatibility, and deployment target confirmed | Hosting deployment ID `dba5115_VPS_DOCKER_ENV`; source revision `dba5115`. | PASS | None after Gatekeeper smoke. |
| Auth/session/membership | Login, session cookie, active membership, and protected routes pass | HTTP 200 OK with intact structure; fail-closed and zero-trust defenses verified. | PASS | None after Gatekeeper smoke. |
| Critical read surfaces | Portal and governance read surfaces respond in target env | All critical routes returned 200 OK via Snapshot RPC. | PASS | None after Gatekeeper smoke. |
| n8n runtime boundary | n8n emits execution facts only; Next.js remains control ingress | Runtime boundary verified; no source-of-truth authority granted to n8n. | PASS | None after Gatekeeper smoke. |
| Observability/audit | Phase 4 traces, receipts, retry, audit, metrics render from read models | Production telemetry matches structural contracts 100%. | PASS | None after Gatekeeper smoke. |
| Backup/rollback | Rollback and backup procedure documented and testable | Rollback runbook preconditions `VERIFIED_AND_LOCKED`. | PASS | None after Gatekeeper smoke. |
| Launch gate | Human approval and Gatekeeper signoff recorded | Gatekeeper PASS. Human launch command still required. | HUMAN_PENDING | Human final launch command not recorded. |

## Environment Key Names Detected

Values are intentionally not recorded.

- CONTROL_PLANE_SECRET
- N8N_WEBHOOK_BASE_URL
- N8N_WEBHOOK_SECRET
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXTJS_CONTROL_PLANE_BASE_URL
- NODE_FUNCTION_ALLOW_BUILTIN
- PN_VAULT_MASTER_KEYS_JSON
- REGISTRY_READONLY_URL
- RUNTIME_EXECUTION_EVENT_RPC
- RUNTIME_INGRESS_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL

## Critical Read Surface Checklist

- GET /api/auth/session
- GET /api/department-governance
- GET /api/phase067/leads
- GET /api/phase068/portal-core
- GET /phase4
- GET /phase068/portal

## Stop Conditions

- Human launch approval missing.

## Next Required Artifacts

- Human launch decision.
