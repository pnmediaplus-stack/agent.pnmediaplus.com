# 074_TENANT_INTEGRATION_SECRET_CAPTURE_UI_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** scaffold complete  
**Purpose:** Define the Tenant Admin Dashboard UI for governed tenant integration secret capture, using the already-approved secret runtime contract from Phases 070-072 and the hardening closure from Phase 073.

---

# 0. Roadmap Rule

This roadmap only applies after:

- `070_TENANT_INTEGRATION_VAULT_ROADMAP_v1.md` scaffold is complete
- `071_TENANT_INTEGRATION_RUNTIME_ROADMAP_v1.md` scaffold is complete
- `072_TENANT_INTEGRATION_LIVE_BROKER_ROADMAP_v1.md` scaffold is complete
- `073_TENANT_INTEGRATION_LIVE_BROKER_HARDENING_ROADMAP_v1.md` is closed
- live tenant session and active membership are required

It must stay inside the canonical constraints established in Phases 070-073:

- no raw secret in client, logs, public surface, or unapproved downstreams
- encrypted-at-rest only
- service-side retrieval only
- tenant scope and role authority are mandatory
- fail closed when authority, tenant scope, or runtime evidence is missing

If UI capture conflicts with governance, stop and review.

---

# 1. UI Scope

Build the tenant-admin UX for governed integration secret capture:

1. provider catalog and tenant integration list
2. write-only secret entry form
3. opaque receipt display
4. status / redaction hints only
5. rotate and revoke controls only when the existing runtime contract allows them
6. no show/copy secret action

---

# 2. UI Rules

- UI must not reveal raw secret material
- UI must not persist secrets in local state beyond the submit event boundary
- UI must not add public signup or WordPress dependency
- UI must not introduce a new storage contract
- UI must use the existing authenticated tenant session and membership gate
- UI must fail closed if runtime authority is missing

---

# 3. Expected Flow

- authenticated tenant admin opens Tenant Integrations
- provider catalog is visible
- tenant integration status is visible
- user enters secret into write-only form
- client submits governed request
- server returns opaque receipt only
- UI displays redacted success/failure state

---

# 4. Exit Criteria

- tenant-admin secret capture UI is present
- no raw secret appears in browser output or logs
- opaque receipt path works for governed runtime
- unauthorized or out-of-scope users are blocked
- rotate / revoke controls remain governed
- shell remains consistent with portal auth

---

# 5. Stop Conditions

Stop and review if:

- raw secret is exposed in any client-bound state
- runtime authority is bypassed
- tenant scope or role authority is bypassed
- new public read surfaces are introduced for secrets
- WordPress or public signup appears in the UI path

## Phase Note

- `074_TENANT_INTEGRATION_SECRET_CAPTURE_UI_ROADMAP_v1.md` opens the tenant admin UI path for governed secret capture after Phase 073 closure.
- This roadmap does not weaken Phases 070-073 controls; it only defines the approved UI entrypoint for the existing secret runtime contract.
- Phase 074 scaffold is complete at the UI boundary.
- Phase 074 runtime contract is complete at the RPC boundary.
- Control-plane smoke evidence PASS on 2026-07-28: `state-update-request` accepted a valid HUMAN session, blocked no-op `DRAFT -> DRAFT` with `409 FORBIDDEN_TRANSITION`, and blocked `BOT` actor with `403 FORBIDDEN_ACTOR`.
- Live secret write/broker behavior remains blocked until runtime authority is explicitly approved.
- UI scaffold complete; runtime remains blocked by authority design.

## Phase 075 Broker Security Update (2026-08-06)

- Discovered a critical architecture flaw where the Broker attempted to query `tenant_integration_vault` via PostgREST, violating the fail-closed private schema contract (PGRST106).
- **Resolution:** Replaced REST lookup with a strictly scoped `SECURITY DEFINER` RPC (`public.phase075_get_tenant_vault_credential_ref`), maintaining absolute schema opacity while unblocking the N8N Redeem flow.
- Next phase (N8N Integration Testing) is formally unblocked upon migration deployment.
