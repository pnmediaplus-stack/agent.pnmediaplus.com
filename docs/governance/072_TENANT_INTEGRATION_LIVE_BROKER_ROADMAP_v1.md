# 072_TENANT_INTEGRATION_LIVE_BROKER_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** roadmap open  
**Purpose:** Define the governed live-broker path for tenant integration secret operations after Phase 070 scaffold and Phase 071 runtime scaffold are complete.

---

# 0. Roadmap Rule

This roadmap only applies after:

- `070_TENANT_INTEGRATION_VAULT_ROADMAP_v1.md` scaffold is complete
- `071_TENANT_INTEGRATION_RUNTIME_ROADMAP_v1.md` scaffold is complete
- encryption/key authority and downstream broker authority are explicitly approved

It must stay inside the canonical constraints established in Phases 070 and 071:

- no raw secret in client, logs, public surface, or n8n
- encrypted-at-rest only
- service-side retrieval only
- tenant scope and role authority are mandatory
- fail closed when authority, tenant scope, or downstream contract is missing

If live broker execution conflicts with governance, stop and review.

---

# 1. Live Broker Order

Run the live broker path in this order:

1. Gatekeeper approval of encryption/key authority
2. Gatekeeper approval of downstream broker contract
3. runtime authority flag enabled for live use
4. service-side secret write/rotate/revoke in live mode
5. broker-call live execution to approved downstream target
6. opaque receipt and redacted result confirmation
7. access audit verification
8. production smoke validation and rollback drill

---

# 2. Live Broker Rules

- raw secret material must never be returned to the client
- raw secret material must never be written to logs
- raw secret material must never be sent to n8n or any unapproved downstream
- decrypted material may exist only in service-side memory for the shortest possible broker call
- broker-call must return only opaque receipt, redacted metadata, or approved result
- tenant scope and role authority are mandatory for every live operation
- live execution must fail closed when any authority or downstream contract is missing

---

# 3. Default Flow

- authorized tenant admin -> secret write or rotate -> service-side encryption -> receipt issuance -> live broker-call -> redacted outcome -> audit trail
- Gatekeeper remains the authority boundary
- DB remains the storage boundary
- downstream broker remains the execution boundary only

---

# 4. Exit Criteria

- encryption/key authority contract is approved
- downstream broker contract is approved and reachable
- live broker execution works without raw secret egress
- audit trail records governed access and redaction status
- tenant scope checks pass in live routes
- rollback path is documented and testable
- production smoke checks pass

---

# 5. Stop Conditions

Stop and review if:

- any route parses or logs raw secret material unexpectedly
- any response exposes raw secret material
- any downstream payload receives raw secret material
- tenant scope or role authority is bypassed
- encryption/key authority is missing or revoked
- downstream broker contract is missing or revoked
- public signup or WordPress becomes part of the live broker boundary

## Phase Note

- `072_TENANT_INTEGRATION_LIVE_BROKER_ROADMAP_v1.md` opens the governed live-broker layer for tenant integration secret operations.
- This roadmap does not weaken Phase 070 or 071 controls; it only defines the approved path from scaffold to live broker use.
- `072_TENANT_INTEGRATION_LIVE_BROKER_ROADMAP_v1.md` scaffold is complete at the live-broker contract and runtime boundary level.
- Live broker execution remains blocked pending approved authority, downstream sign-off, and production smoke validation.
