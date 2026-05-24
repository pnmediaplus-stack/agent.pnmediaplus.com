# 070_TENANT_INTEGRATION_VAULT_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** roadmap open  
**Purpose:** Define a safe Tenant Integration Vault for storing tenant-owned integration credentials without exposing raw API keys to client UI, public read surfaces, logs, n8n, or workflow payloads.

---

# 0. Roadmap Rule

Phase 070 may only add governed integration custody surfaces. It must not open public signup, WordPress dependency, self-activation, or unreviewed mutation paths.

If tenant integration custody conflicts with BYOK, portal auth, membership, or Human/Gatekeeper authority, stop and review.

---

# 1. Security Model

Tenant Integration Vault rules:

- secrets are write-only from the UI perspective
- raw secret material is never returned by API responses
- raw secret material is never written to logs
- raw secret material is never sent to n8n
- raw secret material is encrypted at rest
- decryption is service-side only
- decrypted plaintext may exist in RAM only for the shortest possible broker call
- public read surfaces expose metadata only
- every displayed credential value must be redacted
- integration execution must use a broker or signed server-to-server call
- n8n may receive only opaque references, redacted metadata, or brokered results

---

# 2. Proposed Schema Boundary

DATABASE BOT owns final SQL/RLS.

Proposed private schema:

```text
tenant_integration_vault
```

Proposed tables:

```text
tenant_integration_vault.integration_providers
tenant_integration_vault.tenant_integrations
tenant_integration_vault.integration_secret_blobs
tenant_integration_vault.integration_secret_receipts
tenant_integration_vault.integration_access_audit
```

Proposed public read surfaces:

```text
public.tenant_integration_provider_catalog
public.tenant_integration_status_snapshot
```

Public read surfaces must not include:

- encrypted secret blobs
- plaintext secrets
- decrypt metadata that enables offline attack
- provider API keys
- webhook signing secrets
- refresh tokens
- OAuth client secrets

---

# 3. Minimum Table Contract

## `integration_providers`

Purpose: canonical catalog of supported provider types.

Required columns:

- `provider_id`
- `provider_key`
- `provider_name`
- `provider_kind`
- `status`
- `required_secret_fields`
- `allowed_scopes`
- `created_at`
- `updated_at`

## `tenant_integrations`

Purpose: tenant-owned integration metadata without raw secret material.

Required columns:

- `integration_id`
- `organization_id`
- `provider_id`
- `integration_label`
- `integration_state`
- `scope_grants`
- `last_verified_at`
- `created_by_user_id`
- `created_at`
- `updated_at`

## `integration_secret_blobs`

Purpose: encrypted-at-rest secret storage.

Required columns:

- `secret_blob_id`
- `integration_id`
- `cipher_version`
- `encrypted_secret_data`
- `secret_fingerprint`
- `redacted_hint`
- `state`
- `created_at`
- `rotated_at`
- `revoked_at`

## `integration_secret_receipts`

Purpose: append-only receipts for write/rotate/revoke operations.

Required columns:

- `receipt_id`
- `integration_id`
- `operation`
- `actor_user_id`
- `actor_organization_id`
- `result_state`
- `created_at`

## `integration_access_audit`

Purpose: append-only metadata for broker access, never secret payload logging.

Required columns:

- `audit_id`
- `integration_id`
- `operation`
- `actor_ref`
- `request_ref`
- `result_state`
- `redaction_status`
- `created_at`

---

# 4. API Boundary

Next.js owns the control-plane API boundary.

Allowed API routes:

```text
GET  /api/tenant-integrations
POST /api/tenant-integrations
POST /api/tenant-integrations/[integrationId]/rotate
POST /api/tenant-integrations/[integrationId]/revoke
POST /api/tenant-integrations/[integrationId]/broker-call
```

Rules:

- `GET` returns metadata only.
- `POST` accepts raw secret once and writes encrypted blob server-side.
- rotate accepts raw secret once and writes encrypted blob server-side.
- revoke marks integration unusable and writes receipt.
- broker-call resolves/decrypts server-side only and returns redacted result/receipt.
- all mutation routes require valid portal session and active membership.
- no route returns plaintext secret.
- no route logs plaintext secret.

---

# 5. UI Boundary

UI may provide:

- provider catalog display
- tenant integration status cards
- create integration form with write-only secret input
- rotate/revoke controls gated behind confirmation
- redacted secret hint display
- last verified state
- audit/receipt metadata

UI must not provide:

- show secret button
- copy secret button
- public secret read view
- self-activation of paid/provider capability
- direct n8n credential configuration with raw key
- WordPress dependency

---

# 6. n8n Boundary

n8n remains execution engine only.

n8n may receive:

- `organization_id`
- `integration_id`
- provider key
- opaque reference token
- redacted execution receipt
- brokered result payload

n8n must not receive:

- raw API key
- OAuth client secret
- refresh token
- encrypted blob
- master key
- decrypt metadata sufficient for offline secret recovery

---

# 7. Default Implementation Order

1. DATABASE BOT drafts SQL/RLS for private vault schema and public read surfaces.
2. Gatekeeper reviews schema, RLS, encryption contract, redaction contract.
3. Architect builds server-side loader/API scaffold.
4. Architect builds read-only metadata UI and write-only secret form.
5. Architect wires broker-call to n8n-safe opaque reference flow.
6. Smoke test validates no raw secret egress.
7. Gatekeeper signs off before live tenant integration use.

---

# 8. Stop Conditions

Stop and review if:

- any API returns raw secret material
- any UI renders raw secret material
- any log contains raw secret material
- n8n receives raw secret material
- public read surface exposes encrypted secret blob
- active membership is not enforced
- RLS is missing or unverified
- encryption contract is unspecified
- WordPress or public signup becomes a dependency

---

# 9. Exit Criteria

- private schema and RLS reviewed by DATABASE BOT
- encryption-at-rest contract reviewed
- service-side retrieval path verified
- UI shows redacted metadata only
- write-only secret input verified
- n8n receives only opaque reference or brokered result
- raw secret egress test passes
- rollback/revoke path documented
- Gatekeeper review completed

---

# 10. Current Blockers

- DATABASE BOT SQL/RLS package is required before implementation.
- Encryption contract for tenant integration blobs must be approved.
- API mutation routes require Gatekeeper review before live use.
- n8n broker-call contract must be reviewed before runtime wiring.

## Phase Note

- `070_TENANT_INTEGRATION_VAULT_ROADMAP_v1.md` scaffold is complete at the contract, DB/RLS, and app-layer boundary levels.
- Live secret write/rotate/revoke/broker-call remains blocked pending approved encryption/key authority and runtime broker sign-off.
