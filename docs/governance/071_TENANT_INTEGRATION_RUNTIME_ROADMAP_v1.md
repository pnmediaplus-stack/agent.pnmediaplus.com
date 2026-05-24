# 071_TENANT_INTEGRATION_RUNTIME_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** roadmap open  
**Purpose:** Define the governed runtime path for tenant integration secret operations after Phase 070 scaffold, DB/RLS, and app-layer scope checks are complete.

---

# 0. Roadmap Rule

This roadmap only applies after `070_TENANT_INTEGRATION_VAULT_ROADMAP_v1.md` is scaffold complete and the encryption/key authority contract has been reviewed.

It must stay inside the canonical constraints established in Phase 070:

- no raw secret in client, logs, public surface, or n8n
- encrypted-at-rest only
- service-side retrieval only
- tenant scope and authority checks are mandatory
- fail closed when authority, tenant scope, or runtime contract is missing

If live secret operations conflict with governance, stop and review.

---

# 1. Runtime Order

Run the runtime path in this order:

1. encryption/key authority approval
2. service-side secret write path
3. service-side secret rotate path
4. service-side secret revoke path
5. broker-call runtime execution
6. opaque receipt generation
7. audit and redaction verification
8. smoke validation in production-like environment

---

# 2. Runtime Rules

- raw secret material must never be returned to the client
- raw secret material must never be written to logs
- raw secret material must never be sent to n8n
- decrypted material may exist only in service-side memory for the shortest possible broker call
- broker-call must return only opaque receipt, redacted metadata, or approved result
- rotate and revoke must remain governed and auditable
- tenant scope and role authority are mandatory for all runtime actions

---

# 3. Default Flow

- authenticated tenant admin -> secret write or rotate -> service-side encryption -> receipt issuance -> broker-call -> redacted outcome -> audit trail
- Gatekeeper remains the authority boundary
- DB remains the storage boundary
- n8n remains the execution boundary only

---

# 4. Exit Criteria

- encryption/key authority contract is approved
- service-side secret write/rotate/revoke paths are implemented and verified
- broker-call runtime executes without secret egress
- audit trail records governed access and redaction status
- tenant scope checks pass in live routes
- rollback path is documented and testable

---

# 5. Stop Conditions

Stop and review if:

- any route parses or logs raw secret material unexpectedly
- any response exposes raw secret material
- any n8n payload receives raw secret material
- tenant scope or role authority is bypassed
- encryption/key authority is missing or revoked
- secret storage contract diverges from Phase 070
- public signup or WordPress becomes part of the runtime boundary

## Phase Note

- `071_TENANT_INTEGRATION_RUNTIME_ROADMAP_v1.md` opens the governed runtime layer for Phase 070 secret operations.
- This roadmap does not weaken Phase 070 controls; it only defines the approved path from scaffold to live runtime.
- `071_TENANT_INTEGRATION_RUNTIME_ROADMAP_v1.md` scaffold is complete at the route/runtime boundary level.
- Live broker execution remains blocked pending approved downstream authority and secret runtime sign-off.
