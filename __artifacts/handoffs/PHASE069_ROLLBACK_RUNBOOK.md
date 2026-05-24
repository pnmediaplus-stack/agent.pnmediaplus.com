# PHASE069_ROLLBACK_RUNBOOK

Status: VERIFIED_AND_LOCKED
Scope: production rollback procedure
Authority: Human final authority + Gatekeeper review

## Production Values

- Production URL: `https://agent.pnmediaplus.com`
- n8n runtime URL: `https://n8n.pnmediaplus.com/webhook`
- Supabase project URL: `https://jrgkpbjsqefvnhbiiutz.supabase.co`
- Source revision: `dba5115`
- Hosting deployment ID: `dba5115_VPS_DOCKER_ENV`
- Production test user: `auth.users.id=7767ed3c-b049-4886-b9cb-50e8bb06c673`; email not recorded in repo artifact
- Active membership: `organization_key=pn_media_plus`, `organization_name=PN MEDIA PLUS`, `role=owner`, `status=active`
- Domain evidence ref: `VERIFIED_VIA_NODE_DNS_RESOLVE4`
- SSL evidence ref: `VERIFIED_VIA_TLS_PEER_CERTIFICATE`

## 1. Rollback Triggers

Rollback is required if any condition below occurs after go-live:

- Auth/session/membership blocks valid internal users.
- A private route renders without a valid portal session and active membership.
- Critical read surfaces return unexpected `blocked`, `5xx`, or schema drift errors.
- Phase 4 observability stops recording or rendering execution traces.
- n8n emits runtime facts that bypass the Next.js control ingress.
- Raw secrets appear in UI, logs, queue payloads, webhook payloads, or database rows.
- SSL/domain routing points to the wrong host or stale deployment.
- Human or Gatekeeper revokes launch approval.

## 2. Rollback Preconditions

Do not execute rollback unless these are known:

- Last known good deployment identifier.
- Current deployment identifier: `dba5115_VPS_DOCKER_ENV`.
- Production host/domain: `https://agent.pnmediaplus.com`.
- Environment variable snapshot with values redacted.
- Supabase project target.
- n8n target runtime URL.
- Human approval to initiate rollback.

## 3. Rollback Steps

1. Announce rollback state.
   - Set operational status to `ROLLBACK_IN_PROGRESS`.
   - Notify Human and Gatekeeper.

2. Freeze new launch actions.
   - Do not enable public signup.
   - Do not add mutation paths.
   - Do not activate new n8n workflows.
   - Do not rotate secrets during rollback unless secret exposure is the rollback cause.

3. Restore last known good app deployment.
   - Repoint production deployment to the last known good build.
   - Keep environment variables unchanged unless the incident is env-related.
   - Preserve server-only secret boundaries.

4. Verify auth fail-closed behavior.
   - Unauthenticated `/dashboard` must redirect to `/login`.
   - Authenticated user without active membership must remain blocked.
   - Authenticated user with active membership must reach `/dashboard`.

5. Verify critical read surfaces.
   - `GET /api/auth/session`
   - `GET /api/department-governance`
   - `GET /api/phase067/leads`
   - `GET /api/phase068/portal-core`
   - `GET /phase4`
   - `GET /phase068/portal`

6. Verify n8n/runtime boundary.
   - n8n remains execution engine only.
   - Runtime facts enter through approved Next.js ingress only.
   - No direct business-truth writes are introduced.

7. Verify observability.
   - Phase 4 dashboard loads.
   - Trace/audit/metrics panels fail closed if data is missing.
   - No missing-column errors appear.

8. Record rollback evidence.
   - Deployment identifiers.
   - Smoke test results.
   - Known remaining blockers.
   - Human/Gatekeeper decision.

## 4. Post-Rollback Verification

Rollback is not complete until:

- Private shell stays hidden before valid session + active membership.
- Login-first flow works for a valid member.
- Missing membership returns blocked state.
- Critical read surfaces respond or fail closed.
- Phase 4 observability renders without runtime crash.
- No public signup, auto-approve, auto-publish, or self-activation path exists.

## 5. Blockers

- Human rollback authority has not been exercised because rollback is not currently required.
