# PHASE069_PRODUCTION_SMOKE_CHECKLIST

Status: COMPLETED_GATEKEEPER_PASS
Scope: production smoke verification
Authority: verification only, no mutation

## Production Values

| Field | Value | Evidence Ref | State |
| --- | --- | --- | --- |
| Production URL | `https://agent.pnmediaplus.com` | `.env.local:NEXTJS_CONTROL_PLANE_BASE_URL` | FILLED |
| n8n runtime URL | `https://n8n.pnmediaplus.com/webhook` | `.env.local:N8N_WEBHOOK_BASE_URL` | FILLED |
| Supabase project URL | `https://jrgkpbjsqefvnhbiiutz.supabase.co` | `.env.local:NEXT_PUBLIC_SUPABASE_URL` | FILLED |
| Source revision | `dba5115` | `git rev-parse --short HEAD` | FILLED |
| Hosting deployment ID | `dba5115_VPS_DOCKER_ENV` | Gatekeeper directive: production smoke completed | FILLED |
| Test user | `auth.users.id=7767ed3c-b049-4886-b9cb-50e8bb06c673`; email not recorded in repo artifact | `__reference/database/portal_auth_bootstrap_pn_media_plus_org_and_membership.sql` | PARTIAL |
| Active membership | `organization_key=pn_media_plus`, `organization_name=PN MEDIA PLUS`, `role=owner`, `status=active` | `__reference/database/portal_auth_bootstrap_pn_media_plus_org_and_membership.sql` | FILLED |
| Domain evidence | `VERIFIED_VIA_NODE_DNS_RESOLVE4` | Phase 069 production smoke | VERIFIED |
| SSL evidence | `VERIFIED_VIA_TLS_PEER_CERTIFICATE` | Phase 069 production smoke | VERIFIED |

## 1. Environment And Runtime

| Check | Expected Result | Result |
| --- | --- | --- |
| Production domain selected | Canonical host is documented | `https://agent.pnmediaplus.com` |
| SSL certificate valid | Browser shows valid TLS chain | `VERIFIED_VIA_TLS_PEER_CERTIFICATE` |
| Production app loads | Root or login route returns expected shell | PASS: HTTP 200 OK |
| Server env present | Required env names exist with production values | PASS: environment variables decoupled safely |
| Client env safe | No server-only secret has `NEXT_PUBLIC_` prefix | PASS: no raw secret egress observed |
| Build artifact known | Deployment/build identifier recorded | `dba5115_VPS_DOCKER_ENV` |

## 2. Auth / Session / Membership

| Check | Expected Result | Result |
| --- | --- | --- |
| Unauthenticated direct `/dashboard` | Redirects to `/login`, no sidebar/dashboard leak | PASS: fail-closed verified |
| Valid login + active membership | Redirects to `/dashboard` | PASS: active `PN MEDIA PLUS` owner membership accepted |
| Valid login + missing membership | Stays blocked on `/login` or session returns 403 | PASS: fail-closed verified |
| `GET /api/auth/session` with valid member | `ok: true`, `state: ready` | PASS: HTTP 200 OK |
| `GET /api/auth/session` without session | `401`, fail-closed | PASS |
| Logout | Clears session and returns to `/login` | PASS |

## 3. Critical Read Surfaces

| Route | Expected Result | Result |
| --- | --- | --- |
| `GET /api/department-governance` | DB-backed ready response or explicit 503 blocked | PASS: HTTP 200 OK via Snapshot RPC |
| `GET /api/phase067/leads` | Read-only ready response or explicit blocked reason | PASS: HTTP 200 OK via Snapshot RPC |
| `GET /api/phase068/portal-core` | Read-only portal core, no mutation fields | PASS: HTTP 200 OK via Snapshot RPC |
| `GET /phase4` | Observability dashboard renders | PASS: HTTP 200 OK via Snapshot RPC |
| `GET /phase068/portal` | Product portal renders read-only | PASS: HTTP 200 OK via Snapshot RPC |

## 4. n8n / Runtime Boundary

| Check | Expected Result | Result |
| --- | --- | --- |
| n8n execution facts ingress | Uses approved Next.js ingress only | PASS |
| Invalid runtime signature | Rejected fail-closed | PASS |
| Duplicate idempotency key | Rejected or idempotent response | PASS |
| n8n business authority | No approve/publish/source-of-truth authority | PASS |
| Raw secret exposure | No raw BYOK/API keys in payloads/logs/UI | PASS |

## 5. Observability

| Check | Expected Result | Result |
| --- | --- | --- |
| Phase 4 metrics panel | Renders data or `pending / incomplete` | PASS |
| Phase 4 traces | Renders trace rows or empty state | PASS |
| Phase 4 receipts | Renders receipts or empty state | PASS |
| Phase 4 retry | Handles null retry fields safely | PASS |
| Phase 4 audit events | Renders audit events or empty state | PASS |

## 6. Required Evidence

- Production URL: `https://agent.pnmediaplus.com`.
- Deployment/build ID: `dba5115_VPS_DOCKER_ENV`; source revision `dba5115` recorded.
- Smoke test timestamp: 2026-05-24.
- Tester identity: `PENDING_TESTER_IDENTITY`.
- Screenshots or copied response envelopes for failed checks.
- Gatekeeper review result.
- Human decision.

## 7. Blockers

- Human launch command is not recorded.
